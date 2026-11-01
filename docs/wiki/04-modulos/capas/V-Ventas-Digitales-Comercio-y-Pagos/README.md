---
id: V
titulo: "VENTAS DIGITALES, COMERCIO Y PAGOS"
type: capa
subcapas: 8
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, capa]
---

# V. VENTAS DIGITALES, COMERCIO Y PAGOS

> Capa **V** con **8 subcapas**. Cada subcapa tiene su escalera de madurez N0–N6; los diagramas se derivan de estos README (nodo = nivel, enlaces = integraciones).

## Núcleo compartido (base de la capa)

* **Orden unificada**: una misma estructura para una compra de tienda, una reserva, una venta de POS o una cuota de membresía (cliente, ítems, impuestos, descuentos, estado, canal de origen).
* **Catálogo unificado**: producto, servicio, tour, habitación, plan o membresía comparten tabla base, con variantes, precios y disponibilidad.
* **Libro de pagos (ledger)**: cada intento, cobro, reembolso, comisión y contracargo queda registrado, sin borrar nada.
* **Credenciales de pasarela por negocio** (multi-tenant), cifradas.
* **Webhooks idempotentes**: si la pasarela avisa dos veces, se procesa una sola.
* **Impuestos y retenciones** configurables (IVA, impoconsumo, retenciones, ICA).
* **Conciliación**: cruzar lo que dice la pasarela con lo que dice el sistema y con el banco.
* **Conexión con CRM, caja, inventario, finanzas y facturación**: cada venta genera su cliente, su movimiento contable y su documento.
* **Bitácora de auditoría** de cualquier cambio de precio, reembolso o anulación.

## Subcapas

| id | Subcapa | Escalera |
| --- | --- | --- |
| V.00 | [Pasarelas de pago e integraciones financieras](00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| V.01 | [Enlaces y solicitudes de cobro](01-Enlaces-y-Solicitudes-de-Cobro/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| V.02 | [Suscripciones y cobros recurrentes](02-Suscripciones-y-Cobros-Recurrentes/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| V.03 | [Punto de venta físico y móvil (POS)](03-Punto-de-Venta-Fisico-y-Movil-POS/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| V.04 | [Comercio electrónico](04-Comercio-Electronico/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| V.05 | [Reservas y control de disponibilidad](05-Reservas-y-Control-de-Disponibilidad/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| V.06 | [Ventas, pedidos y entregas](06-Ventas-Pedidos-y-Entregas/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| V.07 | [Marketplace y distribución multicanal](07-Marketplace-y-Distribucion-Multicanal/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |

## Integraciones de esta capa

| Área | Integraciones típicas |
| --- | --- |
| Pasarelas | Wompi, PayU, Mercado Pago, Nequi, PSE (vía ACH o la pasarela), Epayco |
| Datáfonos | Redeban, Credibanco, Wompi presencial |
| Facturación DIAN | Proveedor tecnológico habilitado (Alegra, Siigo, Factus, Dataico, Carvajal, Gosocket) |
| Firma electrónica | Certicámara, Olimpia, Lleida.net, Signaturit, firma propia con evidencia |
| Canales de reservas | Booking.com y Airbnb (vía partner de conectividad o iCal), Expedia, GetYourGuide, Viator |
| Domicilios | Rappi (API de tiendas), Uber Eats |
| Envíos | Servientrega, Coordinadora, Envía, Interrapidísimo, Mensajeros Urbanos |
| E-commerce externo | Shopify, WooCommerce, Mercado Libre, catálogo de Meta |
| Contabilidad | Siigo, Alegra, World Office, Contifico |
| Interno | CRM, inventario, caja menor, finanzas, bandeja omnicanal, bot |

## Cosas críticas que se suelen olvidar

* **Nunca guardes datos de tarjeta**: usa el checkout o la tokenización de la pasarela. Así evitas el cumplimiento PCI completo y el riesgo de fuga.
* **Webhooks con idempotencia**: los avisos de pago llegan duplicados, tarde o desordenados. Si no los manejas bien, tendrás cobros sin orden o reservas sin pago.
* **¿Quién recibe el dinero?** Al inicio, que cada negocio use **su propia cuenta de pasarela** (sus llaves). Si la plataforma recibe y reparte, entras en terreno regulado (agregador de pagos, responsabilidad tributaria y contracargos); consulta un abogado antes.
* **Sobreventa**: usa bloqueos temporales y una única fuente de verdad de disponibilidad. Las sincronizaciones con canales se hacen por cola, con reintentos y alertas.
* **Acceso a APIs de terceros**: Booking, Airbnb y GetYourGuide solo dan API a socios aprobados, y el proceso puede tardar meses. Empieza con iCal y valora un channel manager existente (por ejemplo, integrarte con uno) en vez de construirlo todo.
* **Facturación electrónica**: no la construyas desde cero. Integra un proveedor tecnológico. El riesgo es regulatorio y cambia con frecuencia.
* **Firma electrónica**: guarda la evidencia completa (quién, cuándo, desde dónde, qué versión del documento). Sin esa trazabilidad, la firma pierde fuerza probatoria.
* **Conciliación y comisiones**: registra el valor bruto, la comisión y el neto de cada cobro. Sin eso, las finanzas del negocio nunca cuadran.
* **Reembolsos y cancelaciones**: define la política antes del primer cobro y automatiza el reembolso según esa política.
* **Offline en el POS**: si el negocio se queda sin internet, debe seguir vendiendo. Es un requisito de confianza, no un extra.
* **Costos y límites por plan**: cobros recurrentes, facturas emitidas y sincronizaciones tienen costo por unidad. Mídelos y ponles límite por plan.
* **Zona horaria e impuestos por país**: si planeas salir de Colombia, separa desde ahora las reglas fiscales por país.

## Qué lanzaría primero

1. **Núcleo de orden, ledger y webhooks idempotentes** \+ **una pasarela (Wompi)** con llaves por negocio.
2. **Links y botones de pago** desde cotizaciones, reservas y cuotas (poco esfuerzo, mucho valor, y ya generan caja).
3. **Motor de reservas con disponibilidad, anticipo y voucher** para hoteles, tours y gimnasios.
4. **Facturación electrónica vía proveedor** conectada a cada venta y reserva.
5. **iCal con Airbnb y Booking**, y registro del canal de origen y de la comisión.
6. **Suscripciones y cobros recurrentes** (membresías y planes de la propia plataforma).
7. **POS básico** (venta rápida, arqueo, inventario), y después modo offline y datáfono.
8. **Tienda online con catálogo y carrito.**
9. **Firma electrónica de contratos** con evidencia, empezando por contratos de servicio y de obra.
10. **Channel manager completo, tarifas dinámicas y marketplace propio**, ya con volumen y datos.

---

_Fuente: `../../fuentes/DesordenadoCapas.md` (capa `Ventas`) + `../../fuentes/EstructuraCapasImplementacion.md`._