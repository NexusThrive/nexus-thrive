# 07 · Integración con Nexus

> **Propuesta**, no decisión. Parte de lo observado en Colega Menus (01–06) y de
> lo que Nexus ya decidió o tiene. Las decisiones que dependen del equipo están
> marcadas. Nada de aquí está implementado.

## Principio: referencia funcional, no integración técnica

| Opción | Veredicto |
|---|---|
| **Llamar a Colega Menus** (scraping, Server Actions) | **No.** Interfaz privada sin contrato, frágil, fuera de sus términos y deja los datos del cliente en un tercero |
| **Clonar su interfaz** | **No.** Es contenido protegido; Nexus tiene `DESIGN.md` y su propio sistema |
| **Cubrir el rubro dentro de Nexus** con lo aprendido | **Sí.** Mismo núcleo, `tenantId`, `can()`, `money-service`, `logTenantAction` |
| **Importar datos de un restaurante que migra** | **Sí, más adelante**, vía el archivo que exporta su sistema (Excel/CSV), como hace el propio Colega |

## Punto de partida en Nexus

Del checklist `.docs/arquitectura-v2/D-checklist-restaurante.md`
(2026-10-25): el rubro **no tiene funciones propias**; hoy usa las generales.

| Capacidad | Estado en Nexus | Equivale en Colega |
|---|---|---|
| RST-1 Venta en caja (POS) | Implementado (`lib/pos`) | Caja `/pos` |
| RST-2 Insumos: inventario y compras | Implementado (`lib/inventory`, `lib/purchasing`) | Inventario (Escala) |
| RST-3 Pedidos de restaurante | Parcial: `StoreOrder` (tienda), no pedido de mesa | Pedidos/comandera |
| RST-4 Mesas y zonas | **Falta** | Mesas |
| RST-5 Comandas y cocina | **Falta** | Comandera |
| RST-6 Recetas y consumo | **Falta** (el inventario ya costea por bodega) | Recetas e insumos |
| RST-7 Reservas de mesa | Parcial: `Booking` general | Reservaciones |
| RST-8 Cuenta, división y propinas | Pendiente de definir (impoconsumo) | Dividir cobro, propina |
| RST-9 QR por mesa | Aplazado (`lib/qr.ts` existe) | QR de mesa |
| RST-10 Menú digital | Aplazado (catálogo y sitio existen) | Menús, menú público |

**Decisión G-04 ya propuesta por Nexus:** el pedido de restaurante es **un
objeto propio, con evento hacia ventas**, porque su ciclo (mesa, cocina) no es el
de una tienda. Lo observado en Colega **respalda esa decisión**: allí un solo
«pedido» con muchos estados sirve a todos los canales, pero eso funciona porque
es un producto vertical; en Nexus, mezclarlo con `StoreOrder` ensuciaría el
núcleo general.

## Qué aprender de Colega, por hueco

| Hueco | Aprendizaje aplicable | Riesgo si se ignora |
|---|---|---|
| **RST-3/5 Pedido y comandera** | Un pedido, un ciclo: `nuevo → preparación → listo → (en ruta) → entregado`, `cancelado` con motivo. Alarma al no aceptar (2 min), semáforo por tiempo (80 %) | Estados inventados por pantalla, inconsistentes |
| **RST-4 Mesas** | Código QR inmutable; **una cuenta abierta por mesa**; cobrar libera | Cuentas duplicadas, QR que apunta a mesa equivocada |
| **RST-6 Recetas** | Insumo · Receta · Preparado; consumo **al entrar a cocina**; devolver al cancelar; kárdex | Inventario que no cuadra |
| **RST-7 Reservas** | Mesa más chica que quepa; tiempo por grupo; juntar mesas contiguas | Doble reserva, mesas grandes desperdiciadas |
| **RST-8 Cuenta y propinas** | División por método y **por producto**; propina aparte de la venta | Cierre de caja que no cuadra; impuesto mal calculado |
| **Caja y dinero** | Turno único por sucursal, fondo, corte; **dinero no pasa por el proveedor** | Violar la regla de `money-service` |
| **Offline** | Folio temporal + idempotencia + reconciliación en servidor + límite 24 h | Ventas duplicadas o perdidas sin red |
| **Permisos** | Sección × Ver/Editar × sucursal; sueldos y costos aparte | Gerente viendo márgenes |
| **Onboarding** | Asistente corto + módulos por respuesta + checklist que se completa solo | Restaurante vacío que abandona |

## Cómo encaja con la arquitectura de Nexus

Cada capacidad se declara **una vez** en el registro de operaciones
(`lib/operations/`), de donde salen pantalla, API, herramienta MCP y evento
(`.docs/integracion-api-mcp-webhooks.md`). Ejemplos de operaciones del rubro,
con los campos del contrato:

| `id` | `module` | `risk` | `idempotent` | `emits` |
|---|---|---|---|---|
| `restaurant.tables.create` | `restaurant` | `write` | no | `restaurant.table.created.v1` |
| `restaurant.tables.open` | `restaurant` | `write` | **sí** | `restaurant.table.opened.v1` |
| `restaurant.orders.create` | `restaurant` | `write` | **sí** | `restaurant.order.created.v1` |
| `restaurant.orders.advance` | `restaurant` | `write` | **sí** | `restaurant.order.advanced.v1` |
| `restaurant.orders.cancel` | `restaurant` | `destructive` | **sí** | `restaurant.order.canceled.v1` |
| `restaurant.tickets.settle` | `restaurant` | `money` | **sí** | `restaurant.ticket.settled.v1` → ventas |
| `restaurant.recipes.upsert` | `restaurant` | `write` | no | `restaurant.recipe.updated.v1` |
| `restaurant.reservations.confirm` | `restaurant` | `write` | no | `restaurant.reservation.confirmed.v1` |

Reglas que no se negocian (del repositorio):

- **Dinero:** cobrar una cuenta pasa por `money-service`; el evento
  `restaurant.ticket.settled.v1` alimenta ventas/finanzas, no escribe ventas a
  mano. (**G-04**: «evento hacia ventas».)
- **Datos:** repositorios en `lib/restaurant/` con `tenantId`, `can()` y
  `logTenantAction`; nada en `app/` importa `@/prisma/db`.
- **Contrato de datos:** los modelos nuevos exigen cambio de
  `prisma/contract.prisma`, migración y el SQL de producción en
  `docs/prod-sql/` **antes** del merge.
- **Interfaz:** `ResponsiveSheet`, `FormDialog`, `Field`, `EmptyState`,
  `LoadingState`, `useToast`; los cuatro estados; 375 y 1280 px; teclado y foco.
  **Arrastrar y soltar** (plano de mesas) solo con `@dnd-kit/core`, con
  alternativa por teclado y persistencia real (`docs/design/movimiento.md` §6).
- **Menú y módulos:** el rubro es un **perfil de configuración**, no una
  frontera (`distribucion-por-rubro.md`); el módulo `restaurant` se enciende por
  respuesta del onboarding y declara sus dependencias en voz alta.
- **Pagos y proveedores** (Mercado Pago, DIAN u otro) entran por **puertos y
  adaptadores**, no embebidos en el módulo.

## Propuesta de orden

Por dependencias (RST-3 y RST-4 desbloquean al resto; ver también la nota del
checklist: «no se puede estimar RST-5 hasta decidir G-04»).

| Fase | Entrega | Depende de | Criterio de «hecho» |
|---|---|---|---|
| **0** | Cerrar **G-04** y fijar el vocabulario y los estados del pedido (§06) | Decisión del equipo | ADR escrito; máquina de estados aprobada |
| **1** | **Mesas** (RST-4): modelo con `tenantId`, áreas, formas, QR inmutable; lista y plano **sin** arrastrar primero | Fase 0, `lib/qr.ts` | Prueba de aislamiento entre tenants; QR estable al renombrar |
| **2** | **Pedido de mesa y comandera** (RST-3/5): estados, aceptar con tiempo, alarma, semáforo | Fase 1 | Flujo probado e2e; accesible por teclado |
| **3** | **Cobro de cuenta** (RST-8 base): una cuenta por mesa, cobro dividido por método, propina aparte | Fase 2, `money-service` | Corte cuadra; evento a ventas verificado |
| **4** | **Recetas e insumos** (RST-6): consumo al entrar a cocina, devolución al cancelar | Fase 2, `lib/inventory` | Existencia = suma de movimientos; cancelar devuelve |
| **5** | **Reservas ligadas a mesa** (RST-7) | Fase 1, `Booking` | Sin doble reserva; juntar mesas contiguas |
| **6** | **Plano con arrastre**, QR por mesa público (RST-9), menú digital como plantilla (RST-10) | Fases 1–2 | Cumple §6 de `movimiento.md` |
| **7** | **Offline** de caja (PWA, folio temporal, idempotencia) | Fases 2–3 | Reconciliación probada; límite de horas |
| **8** | **Onboarding por rubro** y **migración** desde Excel/CSV de otro sistema | Todo lo anterior | Checklist que se completa solo |

Cada fase se abre como historia (`feature/HU-…-NN`, el hook de ramas lo exige),
con sus criterios de aceptación y el PR con el checklist de calidad.

## Decisiones que pide esto al equipo

| # | Pregunta | Recomendación |
|---|---|---|
| D1 | ¿Se confirma G-04 (pedido propio con evento a ventas)? | Sí; Colega lo respalda |
| D2 | ¿Impoconsumo y propina (RST-8) se definen con contador antes de construir? | Sí, antes de la fase 3 |
| D3 | ¿Offline de caja entra en el primer alcance o se aplaza? | Aplazar a la fase 7; es costoso y es donde más se rompe |
| D4 | ¿Mesas con QR público entran junto a mesas internas? | No; primero internas (fase 1), QR público después (fase 6) |
| D5 | ¿Se quiere importar desde sistemas de otros fabricantes? | Solo Excel/CSV genérico, sin conectores propietarios |
| D6 | ¿Plataformas de delivery (Rappi, Uber, DiDi)? | Como en Colega: **captura manual con código** y comisión estimada; sin API hasta que haya acuerdo comercial |

## Lo que explícitamente no se copia

- Su **marca**, textos, ilustraciones, colores, tipografía o animaciones.
- Su **estructura de precios** (por sucursal, Complete/Escala): Nexus declara
  «nada se vende por separado».
- Su **código** o sus llamadas internas.
- Su **jerga** («Cajas», «Colaboradores», «Anfitriones»): Nexus usa su propio
  vocabulario de rubro (`lib/vertical-terms.ts`).

## Siguiente paso concreto

1. Revisión de este material por el equipo (README + 07).
2. Responder D1–D6.
3. Abrir la historia de la **fase 0** (ADR de G-04 + estados del pedido) y la de
   la **fase 1** (mesas) con `/nueva-funcionalidad`.
