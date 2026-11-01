# Decisiones técnicas (ADR)

Un solo registro para las decisiones del proyecto. Cada decisión dice qué se decidió, por qué, qué alternativas se descartaron y qué consecuencias tiene. El formato está en [formato.md](formato.md).

| Serie | Qué cubre | Índice |
|---|---|---|
| [`V10-decisiones.md`](V10-decisiones.md) | Decisiones D-V10-* de la reorganización de `lib/` en nueve áreas | — |
| [`arquitectura/`](arquitectura/README.md) | ADR 0001–0006: monolito modular, identidad, capacidades, aislamiento, esquema y dinero (estado: propuestas) | [índice](arquitectura/README.md) |
| [`ingenieria/`](ingenieria/resumen.md) | ADR 0001–0013: equipo de ingeniería, herramientas, Steward y subagentes nativos | [resumen](ingenieria/resumen.md) |

Regla: las dos series de ADR conservan su numeración porque otros documentos las citan como «ADR 0013», etc. Una decisión nueva se numera dentro de la serie a la que pertenece.

> La serie `ingenieria` empezó con un motor en Python que ya fue retirado (ADR 0013 lo explica). Los ADR 0001–0006 de esa serie se conservan como historia de esa decisión.
