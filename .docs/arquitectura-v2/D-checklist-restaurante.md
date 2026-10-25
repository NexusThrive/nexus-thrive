---
title: D · Checklist de RESTAURANTE
tags: [arquitectura, restaurante, checklist]
updated: 2026-10-25
---

# D · Checklist de RESTAURANTE

**Hallazgo principal:** el restaurante **no tiene funciones propias construidas**. El mapa de capacidades lo dice: «Restaurantes: mesas, comandas y recetas — ⬜ Falta; el rubro existe sin pantallas propias» (`.docs/mapa-de-capacidades.md`). No hay modelos de mesa, comanda, cocina ni receta en `prisma/contract.prisma`. Hoy un restaurante usa funciones generales: `orders` (marcada `PLANNED`), POS, inventario, compras de insumos y finanzas (`distribucion-por-rubro.md` §4). Las filas `RST-n` son etiquetas de esta tabla; no sustituyen identificadores.

| ID | Capacidad | Categoría | Estado verificado | Decisión | Dependencias | Evidencia | Criterio de aceptación |
|---|---|---|---|---|---|---|---|
| RST-1 | Venta en caja (POS) | B/C general | Implementado, con pruebas | MANTENER | V.03, VI.04, VII.03 | `lib/pos` (4 archivos de prueba); función `pos` | Sin cambios de código propios del restaurante; verificar cobro dividido y propina |
| RST-2 | Insumos: inventario y compras | B | Implementado, con pruebas | MANTENER | VI.04, VI.05 | `lib/inventory`, `lib/purchasing`; etiqueta «Compras de insumos» en `registry.ts` | Entrada de mercancía a bodega probada; consumo por receta depende de RST-6 |
| RST-3 | Pedidos del negocio (domicilio / en línea) | C | Parcial: existe el pedido de tienda en línea, no el pedido de mesa | RELLENAR | V.04, V.06, V.00 | `StoreOrder` (estados `PENDING_PAYMENT`, `PAID`, `CANCELED`, `ABANDONED`); `app/[tenant]/(app)/pedidos-tienda`; función `orders` en `PLANNED` | Definir si «pedidos» del restaurante extiende `StoreOrder` o es un objeto propio (G-04) |
| RST-4 | Mesas y zonas | C | Pendiente de implementar | RELLENAR | V.05 (disponibilidad), I.01 | No existe modelo ni pantalla | Modelo propio con `tenantId`, estados y prueba de aislamiento |
| RST-5 | Comandas y cocina (envío, preparación, listo) | C | Pendiente de implementar | RELLENAR | RST-3, RST-4, VI.08 (avisos a cocina) | No existe | Flujo de estados definido y probado; no reutiliza los estados del pedido de tienda sin decisión (G-04) |
| RST-6 | Recetas y consumo de insumos | C | Pendiente de implementar | RELLENAR | I.01, VI.04 (costeo) | No existe; el inventario ya costea por bodega | Receta que descuenta insumos por el servicio de inventario, sin tocar su lógica |
| RST-7 | Reservas de mesa | C | Parcial: existe agenda general | RELLENAR | V.05, RST-4 | `Booking`, función `bookings` | Reserva ligada a mesa y cupo; reutiliza V.05 |
| RST-8 | Cuenta, división y propinas | C | Pendiente de definir | PENDIENTE DE REVISIÓN | V.03, VII.03 (impuesto al consumo) | Mencionado en `DesordenadoCapas.md` (impoconsumo, propinas) | Definir con un contador antes de construir |
| RST-9 | QR por mesa | C | Pendiente de definir | APLAZAR | II.03, RST-4 | `DesordenadoCapas.md` («QR por ubicación o mesa»); `lib/qr.ts` existe | Depende de mesas; baja urgencia |
| RST-10 | Menú digital | C | Pendiente de definir | APLAZAR | II.00, I.01 | Catálogo y sitio existen (`lib/site`, `lib/catalog`) | Se resuelve como plantilla del sitio y del catálogo, no como módulo |

**Qué necesita para funcionar bien (en orden):** RST-3 y RST-4 (decisión G-04), luego RST-5, RST-6 y RST-7. RST-1 y RST-2 ya sirven. **Bloqueo:** no se puede estimar RST-5 hasta decidir si el pedido de mesa reutiliza `StoreOrder`.
