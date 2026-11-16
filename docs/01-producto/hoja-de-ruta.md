# Hoja de ruta

## Responsabilidad

Relacionar la dirección del producto con el trabajo verificable. La [estrategia aceptada](estrategia/README.md) define soluciones, motores compartidos, modelo comercial y transición por etapas; el [plan](plan.md) registra únicamente el hito, sprint e historias confirmados.

## Dirección y evidencia

| Ámbito | Fuente | Criterio de avance |
| --- | --- | --- |
| Soluciones y transición del producto | Estrategia, sección 16, y arquitectura/0007 | Historias con aceptación y evidencia, sin asumir que la decisión implica implementación |
| Payments y Treasury | Arquitectura/0008 | Verificación de las garantías de dinero y de sus contratos |
| WhatsApp por negocio | Arquitectura/0010 | Evidencia de identidad, aislamiento y operación de cada negocio |
| Coherencia técnica | Arquitectura V10 y reglas | Tipos, pruebas, controles de dependencias y revisión independiente |

Los [ADR originales](../05-decisiones/README.md) conservan sus fechas y estados. Las [funcionalidades](funcionalidades/README.md) describen capacidades; el [backlog heredado](backlog/README.md) contiene asuntos pendientes de validación antes de planificarlos. No se deduce prioridad actual de una lista de octubre ni se reabren etapas cerradas por esta limpieza.

## Seguimiento

No hay un hito o sprint vigente confirmado en el plan heredado. Cuando se acuerde uno, su objetivo se enlaza desde el plan y sus historias siguen Hito M → Sprint S → HU → Rama → PR → Verificación. Los estados distinguen implementación, verificación, parcialidad, planificación y descarte.

La sincronización de GitHub Wiki se descartó por instrucción del dueño el 2026-11-16. La documentación se verifica y consulta en el repositorio mediante docs/README.md y `pnpm docs:check`.
