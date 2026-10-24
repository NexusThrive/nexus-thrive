#!/usr/bin/env python3
"""Quality gate: lint, unit tests and coverage threshold.

Single source of truth used by three callers:
  - the local commit hook (scripts/commit_gate.py)
  - the CI workflow (copied into the repo as scripts/product-gate.py)
  - agents before opening a PR

Configuration is read from .product-team/ci.json in the working directory:
{
  "lint": "ruff check .",
  "test": "pytest --cov=src --cov-report=term-missing",
  "coverage_min": 80,
  "coverage_file": "coverage.xml"   # Cobertura XML, optional
}

Exit 0 when every configured check passes, 1 otherwise.
"""
import json
import os
import re
import subprocess
import sys

CONFIG = ".product-team/ci.json"


def run(label: str, cmd: str) -> bool:
    print(f"== {label}: {cmd}")
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    out = (r.stdout or "") + (r.stderr or "")
    print(out[-3000:])
    ok = r.returncode == 0
    print(f"== {label}: {'OK' if ok else 'FALLÓ'}\n")
    return ok


def coverage_percent(path: str) -> float | None:
    if not os.path.exists(path):
        return None
    text = open(path, encoding="utf-8").read()
    m = re.search(r'line-rate="([0-9.]+)"', text)  # Cobertura root attribute
    if m:
        return float(m.group(1)) * 100
    return None


def main() -> None:
    if not os.path.exists(CONFIG):
        print(f"Sin {CONFIG}: no hay compuerta configurada. Se omite.")
        sys.exit(0)

    cfg = json.load(open(CONFIG, encoding="utf-8"))
    ok = True

    if cfg.get("lint"):
        ok &= run("Lint", cfg["lint"])

    if cfg.get("test"):
        ok &= run("Pruebas unitarias", cfg["test"])

    minimum = cfg.get("coverage_min")
    if minimum is not None:
        pct = coverage_percent(cfg.get("coverage_file", "coverage.xml"))
        if pct is None:
            print("== Cobertura: no se encontró el reporte; no se puede verificar.")
            ok = False
        else:
            passed = pct >= float(minimum)
            print(f"== Cobertura: {pct:.1f}% (mínimo {minimum}%) -> {'OK' if passed else 'FALLÓ'}\n")
            ok &= passed

    print("COMPUERTA: APROBADA" if ok else "COMPUERTA: RECHAZADA")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
