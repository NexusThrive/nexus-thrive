# Catálogo de fuentes

`catalog/sources.json` es una **exportación legible** del catálogo operativo
(`.product-team/state/knowledge/catalog.json`). No se edita a mano: se regenera
desde el estado.

## Estructura

```json
{
  "schema_version": 1,
  "updated_at": "2026-10-25T00:00:00+00:00",
  "sources": [
    {
      "id": "SRC-…",
      "title": "Prisma 8 — consultas",
      "kind": "official_docs",
      "location": "",
      "url": "https://www.prisma.io/docs",
      "provenance": "documentación oficial",
      "added_at": "…",
      "last_verified": "…",
      "status": "active",
      "project": "nexus",
      "module": "data",
      "tags": ["prisma", "orm"],
      "confidence": "high",
      "origin_refs": [],
      "sync_targets": ["local"],
      "content_hash": "…",
      "trust": "untrusted",
      "notes": ""
    }
  ]
}
```

Campos obligatorios: `id`, `title`, `kind`, `provenance`, `added_at`, `status`,
`confidence`, `content_hash`. El esquema formal está en
`.product-team/schemas/knowledge-source.schema.json`.

## Tipos

| `kind` | Uso |
|---|---|
| `official_docs` | documentación del framework o proveedor |
| `project_docs` | documentación de este repositorio |
| `code` | archivo de código relevante |
| `incident` | postmortem o incidente |
| `research` | investigación propia con fuentes |
| `internal` | decisión o nota interna |
| `user_story` | HU aprobada |

## Exportar

```bash
python3 - <<'PY'
import json, pathlib
state = pathlib.Path(".product-team/state/knowledge/catalog.json")
target = pathlib.Path("docs/knowledge/catalog/sources.json")
data = json.loads(state.read_text(encoding="utf-8"))
target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(data.get('sources', []))} fuentes exportadas")
PY
```

En este entorno el catálogo inicial está vacío: no se han registrado fuentes
todavía. Un catálogo vacío es un estado válido, no un error.
