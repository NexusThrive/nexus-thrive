# 11 · Registro de decisiones arquitectónicas

[← Índice](../README.md)

Todas las decisiones están en estado **Propuesta**: ninguna fue aprobada ni
implementada. Formato: contexto, decisión, alternativas, ventajas, desventajas y
consecuencias.

| ADR | Título | Estado |
|---|---|---|
| [0001](0001-monolito-modular.md) | Mantener un monolito modular | Propuesta |
| [0002](0002-identidad-y-membresias.md) | Identidad: Clerk + membresía `User`; persona local opcional | Propuesta |
| [0003](0003-registro-de-capacidades.md) | Registro de capacidades en código y entitlements en servidor | Propuesta |
| [0004](0004-aislamiento-en-aplicacion.md) | Aislamiento en la capa de aplicación + defensas mínimas en base | Propuesta |
| [0005](0005-esquema-de-produccion.md) | Migraciones de Prisma como única fuente del esquema | Propuesta |
| [0006](0006-servicio-de-dinero.md) | Servicio transaccional único para el dinero | Propuesta |

Para aprobar una decisión: cambiar su estado a **Aceptada**, con fecha y
responsable, y enlazar el PR que la implementa.
