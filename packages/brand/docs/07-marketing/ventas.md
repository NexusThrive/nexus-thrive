# Material comercial — NEXUS Thrive

Para conversaciones de descubrimiento, propuestas y demos. Todo lo que aquí se
afirma debe poder demostrarse en el producto o en el repositorio.

## 1. Pitch de 30 segundos

> NEXUS es el sistema operativo del negocio para pymes colombianas. En un solo
> lugar vendes, cobras con recibo, controlas caja e inventario y atiendes a tus
> clientes, con la forma de tu rubro. La operación del día queda registrada y
> lista para tu contador.

## 2. Qué está disponible hoy

Basado en `docs/nexus-architecture/product-vision.md` (estado «Hoy»):

- Ficha de cliente con campos por rubro, notas y QR/NFC.
- Cobros con recibo, caja menor, gastos, anulación auditada.
- Productos y servicios, stock con movimientos, venta directa.
- Cotización (construcción), recibo y cuenta de cobro.
- Agenda con calendario, citas y cupos.
- Membresías con planes, renovación, congelación y check-in QR/NFC.
- Taquilla para museo: franjas, aforo y grupos.
- Construcción: APU, presupuesto, Lean, bitácora, actas e informes.
- Plantillas de mensajería que abren WhatsApp (`wa.me`).
- Dashboard y algunos informes por rubro.

## 3. Qué es parcial o falta (decirlo antes de que lo pregunten)

| Tema | Estado | Cómo decirlo |
|---|---|---|
| Punto de venta | parcial: una venta de un producto a la vez | «Hoy el POS es de una línea; el carrito multi-línea está en plan.» |
| Factura electrónica DIAN | falta | «No emitimos factura DIAN todavía; está en el plan con proveedor tecnológico.» |
| Pagos en línea | falta | «El cobro se registra en NEXUS; el pago en línea con Wompi está en plan.» |
| Mensajería automática | parcial | «Abrimos WhatsApp con el mensaje listo; el envío automático requiere la API de Meta.» |
| Mini-sitio y SEO local | parcial | «Hay puntaje y sondeo del sitio; el mini-sitio público está en plan.» |
| Contabilidad y nómina | fuera de alcance | «No reemplazamos a tu contador; le entregamos los movimientos.» |
| Multi-negocio por persona | falta | «Hoy es un negocio por cuenta; el selector está en plan.» |

**Nunca** se promete una fecha de entrega sin compromiso aprobado por Product
Owner.

## 4. Descubrimiento (15 minutos)

1. ¿Cómo vendes y cobras hoy? ¿Qué usas para cada cosa?
2. ¿Cuántas ventas haces al día y quién las registra?
3. ¿Qué pasa cuando la caja no cuadra? ¿Cómo lo investigas?
4. ¿Cómo llevas inventario y qué te falta contar?
5. ¿Cómo consigues clientes hoy? ¿Te encuentran en Google?
6. ¿Qué te pide el contador cada mes?
7. ¿Qué has probado antes y por qué lo dejaste?
8. ¿Quién más usa el sistema y qué permisos necesita?

Registrar respuestas textuales; no convertirlas en métricas.

## 5. Objeciones frecuentes

| Objeción | Respuesta honesta |
|---|---|
| «Ya tengo un software contable.» | «Perfecto: NEXUS no lo reemplaza. Registra la operación y le entrega los movimientos al contador.» |
| «Es muy caro.» | Mostrar el precio real de `/pricing` y comparar contra el coste del desorden: tiempo, descuadres, ventas perdidas. Sin cifras inventadas. |
| «¿Emite factura DIAN?» | «Todavía no. Está en el plan con un proveedor tecnológico; hoy entregamos recibos y cuentas de cobro.» |
| «¿Funciona para mi rubro?» | Mostrar la receta real del rubro si existe; si no, decir que se está evaluando. |
| «¿Y si no me gusta?» | Explicar condiciones reales del plan; no inventar garantías. |
| «¿Mis datos están seguros?» | Describir autenticación, permisos por rol y aislamiento por negocio tal como están implementados; no prometer certificaciones inexistentes. |

## 6. Guion de demo (sobre producto real)

1. **Alta del negocio** con su rubro (mostrar cómo cambian los términos).
2. **Registrar un cliente** y su ficha.
3. **Cobrar** y mostrar el recibo.
4. **Revisar caja** del día.
5. **Registrar una venta de inventario** y ver el movimiento de stock.
6. **Agendar** una cita o **hacer check-in** si el rubro lo permite.
7. **Ver el dashboard** con los datos creados en la demo.

Nunca mostrar módulos que no existen ni datos de otro negocio.

## 7. Propuesta comercial

Toda propuesta incluye:

- Problema del negocio en sus palabras.
- Alcance disponible y alcance futuro separados.
- Precio y condiciones reales.
- Qué necesita el cliente (datos, accesos, tiempo).
- Qué no está incluido.
- Siguiente paso con fecha.

## 8. Después de la reunión

- Resumen con lo acordado y lo pendiente.
- Responsable por cada pendiente.
- Sin promesas fuera de la propuesta.
- Los datos del cliente no se guardan en el repositorio ni en este documento.
