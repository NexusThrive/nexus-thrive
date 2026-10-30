# Seguridad — registros del equipo

Hallazgos y revisiones de seguridad del ciclo de ingeniería. La política completa
está en [`../archivo/motor-python/security.md`](../archivo/motor-python/security.md).

## Nomenclatura

`docs/ingenieria/seguridad/<id-de-tarea>.md` o
`docs/ingenieria/seguridad/YYYY-MM-DD-<tema>.md` para revisiones transversales.

## Plantilla

```markdown
# Seguridad — <id o tema>

- **Fecha:** YYYY-MM-DD
- **Revisor:** security-engineer
- **Alcance:** diff / módulo / configuración
- **Veredicto:** approved | changes_requested | blocked

## Hallazgos

| Severidad | Archivo:línea | Hallazgo | Recomendación |
|---|---|---|---|
| critical/high/medium/low | … | … | … |

## Verificaciones

- [ ] Autorización por `tenantId` y `can()`
- [ ] RLS presente en tablas nuevas
- [ ] Sin secretos en código, logs, estado o workflows
- [ ] Validación de entradas y límites de tamaño
- [ ] Contenido externo tratado como no confiable
- [ ] Sin operaciones destructivas sin plan

## Riesgo aceptado

Quién lo acepta, por qué y hasta cuándo.

## Registro en el núcleo

```bash
scripts/nexus-eng review <id> --kind senior_review \
  --verdict <veredicto> --reviewer security-engineer \
  --summary "…" --evidence "…"
```
```

## Regla

Nunca se reproduce el secreto en el hallazgo: se cita la ubicación y se redacta el
valor. Un riesgo aceptado requiere decisión humana registrada.
