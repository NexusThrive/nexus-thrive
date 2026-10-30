# Sincronización

> **Retirado:** los comandos `nexus-eng knowledge …` y el Knowledge Hub dejaron de existir con el
> [ADR 0013](../../ingenieria/adr/0013-subagentes-nativos-en-plugin.md). Este directorio queda como biblioteca de fuentes en
> Markdown; las fuentes se registran a mano con procedencia.

Aquí se registra, en formato legible, cada sincronización con adaptadores
externos o locales. El registro operativo completo está en
`.product-team/state/knowledge/sync-runs.json`; este directorio resume lo
importante para revisión humana.

## Formato de una entrada

```markdown
## YYYY-MM-DD · <adaptador> · <fuente>

- Adaptador: local | web | graphify | notebooklm | documentdb | search
- Fuente: SRC-…
- Resultado: ok | skipped | unavailable | error
- Detalle: …
- Verificado: sí/no
- Acción siguiente: …
```

## Estado actual

| Fecha | Adaptador | Resultado | Nota |
|---|---|---|---|
| 2026-10-25 | — | — | Sin sincronizaciones registradas; catálogo inicial vacío |

## Interpretación

- `ok`: contenido actualizado y huella recalculada.
- `skipped`: sin cambios o fuente fuera del alcance.
- `unavailable`: la integración no está instalada o configurada. **No es un fallo
  del sistema** y no se pierde estado.
- `error`: el adaptador falló (archivo ausente, red, formato). La fuente pasa a
  `stale` y se requiere revisión.

```bash
scripts/nexus-eng knowledge sync --adapter local
scripts/nexus-eng knowledge history
```
