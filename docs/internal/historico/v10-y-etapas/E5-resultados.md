# E5 — Business ya no llama a Finance: resultados

Ejecutado en la rama local `chore/HU-esquema-prisma-modular-01`, sin push ni PR, a partir de [`E3-resultados.md`](E3-resultados.md)
(31 excepciones). **Las 17 excepciones de E5 quedan resueltas: 31 → 14** (quedan E7 4, E9 4, V 6).

## Qué cambió

| Paso | Cambio | Resuelve |
|---|---|---|
| E5.1 | `todayCO` (día de Bogotá) pasa a Foundation (`lib/plain-date.ts`); `lib/tax/tax.ts` la reexporta. Prueba de equivalencia con la fórmula anterior | EX-010, 017, 022, 036 |
| E5.2 | `lib/finance/index.ts`, `lib/finance/series.ts` y `lib/receivables/aging.ts` son puros (sin imports ni acceso a datos) y se clasifican como Foundation por archivo | EX-002, 015, 016, 054, 055 |
| E5.3a | Registro de puertos `lib/ports.ts` (`definePort`, falla cerrado con `PortNotProvidedError`) y raíz de composición `lib/runtime/ports.ts`, conectada en `instrumentation.ts` y `vitest.setup.ts` | — |
| E5.3b | Puerto de contabilidad (`lib/business/accounting-port.ts`): Business informa hechos (venta, notas, cobro, costo de venta y su devolución, compra) y pide reversas; Finance decide el asiento | EX-007, 013, 014, 021, 037 |
| E5.3c | Puertos de numeración fiscal y retenciones, de pasarela de pago de la tienda y de aprovisionamiento de negocios | EX-001, 009, 038 |

## Reglas que se conservaron

- **Business no escribe en tablas de Finance.** Solo publica hechos o pide servicios por un contrato que él mismo define.
- **Finance decide.** Publicar un hecho no obliga a asentarlo: la implementación es la `postByRule` de siempre (contabilidad activa, regla vigente, período abierto) y devuelve `null` si no corresponde.
- **Atomicidad.** Los puertos corren en la transacción de quien llama (ADR-0006): si Finance falla (p. ej. período cerrado), se deshace el documento, el cobro o el alta, y el consecutivo no avanza. Hay pruebas de integración.
- **Business no conoce el plan de cuentas.** Un cobro entrega `paymentMethod`; Finance resuelve Caja (1105) o Bancos (1110).
- **Falla cerrado.** Un puerto sin conectar lanza `PortNotProvidedError`; nunca se omite la contabilidad en silencio. Una prueba de arquitectura exige que todo puerto declarado quede conectado y que el arranque lo haga.
- Sin cambios en ledger, saldos históricos, períodos cerrados, modelos Prisma, migraciones, RLS ni contratos contables públicos. Se mantienen los ciclos independientes de pedido, venta, pago, contabilización y facturación.

## Validación

`pnpm verify` en verde (capas 14/14, 0 nuevas; lint 0 errores; pruebas unitarias; integración sobre base desechable; build). Suite de las áreas
afectadas: 86 archivos / 1 132 pruebas. Contrato Prisma sin cambios (`git diff` vacío en `prisma/` y `migrations/`; guardián SQL: sin cambio de tablas).
Ciclos: 4 de solo tipos, 0 de valores.

## Hallazgos

- **Orden de carga en las pruebas.** Conectar los puertos al preparar el archivo de pruebas cargaba los dominios antes de los `vi.mock` de cada archivo y rompía dos pruebas de `http-provider`. Se conectan en un `beforeAll` con importación dinámica.
- **Dependencia del arranque.** Los puertos dependen de que `instrumentation.ts` ejecute `register()`; Next lo garantiza antes de atender peticiones, y sin conexión la operación falla de forma visible. Conviene confirmarlo en un despliegue de prueba (no se hizo aquí: sin despliegues).
- `receivables-db` y `onboarding-db` llaman a la contabilidad directamente y es legal (Finance y Experience).

## Pendiente

E7, E9 y V (14 excepciones), documentación de `lib/` (descripciones de módulo y de funciones exportadas), migración de las 151 pruebas, `lib/construction`, y decisión de push/PR.
