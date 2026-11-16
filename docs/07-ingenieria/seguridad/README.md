# Seguridad — registros del equipo

Hallazgos y revisiones de seguridad del ciclo de ingeniería. La política de seguridad del equipo vive en las reglas de `CLAUDE.md` y en el plugin `product-team`; la del motor Python retirado ya no aplica (ver ADR 0013).

## Nomenclatura

`docs/07-ingenieria/seguridad/<id-de-tarea>.md` o
`docs/07-ingenieria/seguridad/YYYY-MM-DD-<tema>.md` para revisiones transversales.

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

## Registro de evidencia

La revisión se registra en el reporte y el PR con evidencias reales y un revisor independiente. No hay motor nexus-eng disponible.
```

## Regla

Nunca se reproduce el secreto en el hallazgo: se cita la ubicación y se redacta el
valor. Un riesgo aceptado requiere decisión humana registrada.
