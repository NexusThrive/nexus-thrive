"""Persistencia local versionada: JSON atómico + log de auditoría JSONL.

La fuente de verdad es el sistema de archivos. No hay base de datos remota en
la primera versión: no existe todavía una necesidad real de concurrencia entre
máquinas. Un único bloqueo de fichero evita escrituras concurrentes locales.
"""
from __future__ import annotations

import json
import os
import shutil
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from .domain import SCHEMA_VERSION, Sprint, Task, utcnow
from .security import redact

try:  # pragma: no cover - plataformas sin fcntl
    import fcntl
except ImportError:  # pragma: no cover
    fcntl = None  # type: ignore[assignment]


DEFAULT_STATE_DIR = ".product-team/state"


def state_dir(root: Path | str | None = None) -> Path:
    if root:
        return Path(root)
    env = os.environ.get("NEXUS_STATE_DIR")
    if env:
        return Path(env)
    return Path(DEFAULT_STATE_DIR)


class StateStore:
    def __init__(self, root: Path | str | None = None) -> None:
        self.root = state_dir(root)
        self.tasks_file = self.root / "tasks.json"
        self.sprints_file = self.root / "sprints.json"
        self.checkpoints_dir = self.root / "checkpoints"
        self.knowledge_dir = self.root / "knowledge"
        self.audit_file = self.root / "audit" / "events.jsonl"
        self.runs_file = self.root / "runs.jsonl"
        self.workflows_file = self.root / "workflows" / "executions.json"
        self.decisions_file = self.root / "decisions.json"
        self.lock_file = self.root / ".lock"

    # ------------------------------------------------------------- lifecycle
    def initialize(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        for directory in (
            self.checkpoints_dir,
            self.knowledge_dir,
            self.root / "audit",
            self.root / "workflows",
            self.root / "backups",
        ):
            directory.mkdir(parents=True, exist_ok=True)
        meta = self.root / "meta.json"
        if not meta.exists():
            self._write_json(meta, {"schema_version": SCHEMA_VERSION, "created_at": utcnow()})
        if not self.tasks_file.exists():
            self._write_json(self.tasks_file, {"schema_version": SCHEMA_VERSION, "tasks": []})
        if not self.sprints_file.exists():
            self._write_json(self.sprints_file, {"schema_version": SCHEMA_VERSION, "sprints": []})
        catalog = self.knowledge_dir / "catalog.json"
        if not catalog.exists():
            self._write_json(
                catalog,
                {"schema_version": SCHEMA_VERSION, "updated_at": utcnow(), "sources": []},
            )
        if not self.workflows_file.exists():
            self._write_json(self.workflows_file, {"executions": []})
        if not self.decisions_file.exists():
            self._write_json(self.decisions_file, {"decisions": []})

    @contextmanager
    def lock(self, timeout: float = 10.0) -> Iterator[None]:
        self.root.mkdir(parents=True, exist_ok=True)
        with open(self.lock_file, "a+", encoding="utf-8") as handle:
            if fcntl is not None:
                deadline = time.monotonic() + timeout
                while True:
                    try:
                        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                        break
                    except BlockingIOError:
                        if time.monotonic() >= deadline:
                            raise TimeoutError("Estado bloqueado por otro proceso; reintenta.")
                        time.sleep(0.05)
            try:
                yield
            finally:
                if fcntl is not None:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    # ------------------------------------------------------------------- i/o
    def _write_json(self, path: Path, data: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            backup_dir = self.root / "backups"
            backup_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, backup_dir / f"{path.name}.{int(time.time() * 1000)}.bak")
        fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(data, handle, ensure_ascii=False, indent=2, sort_keys=False)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(tmp, path)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)

    def read_json(self, path: Path, default: Any) -> Any:
        if not path.exists():
            return default
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)

    # ------------------------------------------------------------------ tasks
    def load_tasks(self) -> dict[str, Task]:
        payload = self.read_json(self.tasks_file, {"tasks": []})
        return {item["id"]: Task.from_dict(item) for item in payload.get("tasks", [])}

    def save_tasks(self, tasks: dict[str, Task]) -> None:
        ordered = [tasks[key].to_dict() for key in sorted(tasks)]
        self._write_json(
            self.tasks_file,
            {"schema_version": SCHEMA_VERSION, "updated_at": utcnow(), "tasks": ordered},
        )

    def get_task(self, task_id: str) -> Task:
        tasks = self.load_tasks()
        if task_id not in tasks:
            raise KeyError(f"Tarea no encontrada: {task_id}")
        return tasks[task_id]

    # ---------------------------------------------------------------- sprints
    def load_sprints(self) -> dict[str, Sprint]:
        payload = self.read_json(self.sprints_file, {"sprints": []})
        return {
            item["id"]: Sprint(**{k: v for k, v in item.items() if k in Sprint.__dataclass_fields__})
            for item in payload.get("sprints", [])
        }

    def save_sprints(self, sprints: dict[str, Sprint]) -> None:
        self._write_json(
            self.sprints_file,
            {
                "schema_version": SCHEMA_VERSION,
                "updated_at": utcnow(),
                "sprints": [sprints[key].to_dict() for key in sorted(sprints)],
            },
        )

    # ------------------------------------------------------------ checkpoints
    def checkpoint_path(self, task_id: str) -> Path:
        return self.checkpoints_dir / f"{task_id}.json"

    def save_checkpoint(self, checkpoint: Any) -> None:
        self._write_json(self.checkpoint_path(checkpoint.task_id), checkpoint.to_dict())

    def load_checkpoint(self, task_id: str) -> Any | None:
        from .domain import Checkpoint

        path = self.checkpoint_path(task_id)
        if not path.exists():
            return None
        return Checkpoint.from_dict(self.read_json(path, {}))

    # ---------------------------------------------------------------- run log
    def append_run(self, record: dict[str, Any]) -> None:
        self._append_jsonl(self.runs_file, record)

    def append_event(self, kind: str, actor: str, detail: str, **extra: Any) -> None:
        payload = {
            "at": utcnow(),
            "kind": kind,
            "actor": actor,
            "detail": redact(detail),
        }
        payload.update({k: v for k, v in extra.items() if v is not None})
        self._append_jsonl(self.audit_file, payload)

    def _append_jsonl(self, path: Path, payload: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")

    def read_events(self, limit: int = 50) -> list[dict[str, Any]]:
        return self._read_jsonl(self.audit_file, limit)

    def read_runs(self, limit: int = 50) -> list[dict[str, Any]]:
        return self._read_jsonl(self.runs_file, limit)

    def _read_jsonl(self, path: Path, limit: int) -> list[dict[str, Any]]:
        if not path.exists():
            return []
        lines = path.read_text(encoding="utf-8").splitlines()[-limit:]
        records = []
        for line in lines:
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return records
