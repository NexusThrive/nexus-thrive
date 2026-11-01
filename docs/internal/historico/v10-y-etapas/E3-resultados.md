# E3 — Cada dominio declara lo suyo: resultados

Ejecutado en la rama local `chore/HU-esquema-prisma-modular-01`, sin push ni PR, después de corregir y validar el defecto de fechas
([`hallazgo-fechas-utc-en-asientos.md`](hallazgo-fechas-utc-en-asientos.md)). Parte de [`E2-resultados.md`](E2-resultados.md) (39 excepciones).

## Qué cambió

| Paso | Cambio | Resuelve |
|---|---|---|
| E3.1 | Las operaciones de inventario, compras y presencia pasan de `lib/operations/definitions/` a su dominio (`lib/inventory/operations.ts`, `lib/purchasing/operations.ts`, `lib/presence/operations.ts`). `lib/operations/registry.ts` es la raíz de composición y está en la capa de integraciones | EX-024 a EX-029 (6) |
| E3.2 | El despachador de eventos define el contrato `EventSubscriber` y recibe `subscribers` como parámetro obligatorio. La presencia declara el suyo (`lib/presence/subscribers.ts`) y la ruta de cron lo entrega | EX-018 |
| E3.3 | `customerLimit` pasa a Core (`lib/tenant/customer-limit.ts`), junto a `seatLimit` | EX-057 |

### Operaciones

El motor, los tipos y las definiciones propias de Core (negocio, clientes, eventos, finanzas, terceros) no conocen ningún dominio. El registro reúne todo en **una lista explícita y tipada**, sin registro
dinámico ni estado global: si falta una importación, no compila. **El contrato público no cambia**: las 15 operaciones conservan id, módulo, permiso, riesgo, ruta REST, título y orden
(comparado contra el código anterior y fijado en `tests/architecture/e3-operaciones.golden.json`).

### Suscriptores de eventos

- Idempotencia y orden intactos: los suscriptores corren **después** de marcar los eventos como procesados, **una vez por negocio y por corrida**, con el mismo patrón de antes (`sale.*` y `provider.*`).
- Un suscriptor que falla se registra con su nombre y no detiene el reparto ni a los demás. El mensaje de registro cambia de «[presencia] no se pudo recalcular» a «[eventos:presencia] no se pudo procesar».
- `subscribers` es obligatorio (`[]` = ninguno): quien invoca decide de forma explícita y olvidarlo no compila. Así, un llamador nuevo no deja sin presencia a los negocios por omisión.

## Excepciones: 39 → 31

Retiradas exactamente 8, ninguna modificada ni añadida; eran **todas** las de la etapa E3. Las demás están intactas: E5 (17), E7 (4), E9 (4) y V (6).

## Pruebas

- Nuevas: `tests/architecture/e3-dominios.test.ts` (14), `tests/integration/events/suscriptores.integration.test.ts` (11, 6 de ellas del patrón del suscriptor de presencia),
  `tests/integration/tenant/customer-limit.integration.test.ts` (5).
- Mutación del despachador (no llama a los suscriptores): fallan 5, incluida «se recalcula por eventos» de presencia, que antes dependía del código directo.
- Las 4 llamadas existentes a `dispatchPending` (3 pruebas de eventos y proveedores, y la de presencia) se actualizaron a la nueva firma; la de presencia entrega `presenceSubscriber`.

## Lo que queda

Ver [`hoja-de-ruta.md`](hoja-de-ruta-tras-E3.md).
