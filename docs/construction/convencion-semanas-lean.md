# Convención de semanas del módulo Lean

Resumen de la convención de dominio del motor Lean (Last Planner System, nivel 1). El detalle y los comentarios originales siguen
en `lib/construction/lean-engine.ts`.

## Dos conceptos de «semana» que no se confunden

| | Semana **relativa** | Semana **calendario ISO-8601** |
|---|---|---|
| Campo | `LookaheadTask.weekNumber` | `WeeklyCommitment.weekNumber` + `year` |
| Valores | 1 a 6 dentro de la ventana móvil | 1 a 53, con su **año ISO** |
| Ancla | `ProjectPlan.windowStartDate` (lunes de la semana relativa 1) | Calendario, en `America/Bogota` |
| Particularidad | Puede dar ≤ 0 o > 6 para fechas fuera de la ventana | El año ISO puede diferir del año natural en los bordes de enero |

La ventana Lookahead mide `WINDOW_WEEKS = 6` semanas. La zona horaria operativa es `BOGOTA_TIME_ZONE = "America/Bogota"`.

## Funciones que implementan la convención

| Función | Qué hace |
|---|---|
| `relativeWeekNumber(windowStart, date)` | Semana relativa de una fecha |
| `weekWindowDates(...)` | Lunes y domingo de una semana relativa |
| `currentWindowStart(now)` | Lunes de la semana operativa actual (Bogotá) |
| `isoWeekOf(date)` | Semana y año ISO de una fecha; el **jueves** de la semana decide tanto la semana como el año |
| `isoWeekRange(year, week)` | Lunes y domingo de una semana ISO (el 4 de enero siempre es de la semana 1) |
| `isoWeekLabel(weekNumber, year)` | Etiqueta legible de una semana ISO |
| `bogotaToday()` | Fecha de hoy en Bogotá |

## Otras reglas del módulo

- El motor es matemática pura: calcula **PPC** (Percent Plan Complete) sobre los compromisos evaluados y la distribución de **CNC**
  (Causas de No Cumplimiento) sobre los fallidos. Meta de PPC por defecto: 85 %, configurable por plan.
- **No depende de la base de datos ni de `Temporal`**, así que puede importarse desde componentes cliente. Las conversiones de y
  hacia `Temporal.Instant` viven en `lib/tenant/db.ts`.
- En el contrato, `WeeklyCommitment.failureCause` y `failureNotes` solo existen mientras el estado es `FAILED`; se limpian al
  cambiar de estado.

## Referencias

`lib/construction/lean-engine.ts` · prueba `lib/construction/lean-engine.test.ts` · modelos en `prisma/schema/industry/construction/planning.prisma`
