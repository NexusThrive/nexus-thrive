# 12 · Visión de producto: el sistema operativo del negocio

[← Índice](README.md) · Propuesta. Ordena hacia dónde va NEXUS y en qué orden
construirlo, partiendo de lo que ya existe ([product-inventory.md](product-inventory.md)).
La arquitectura que la soporta está en [target-architecture.md](target-architecture.md)
y la ruta de crecimiento técnico en [scaling-path.md](scaling-path.md).

## 1. La tesis

Una pyme colombiana usa hoy cinco cosas que no se hablan: un cuaderno o Excel
para clientes, WhatsApp para atenderlos, una app o caja para cobrar, un
software contable para la factura electrónica y nada para que la encuentren en
Google. **NEXUS es el lugar donde el negocio opera el día entero**: vende,
cobra, factura ante la DIAN, controla su inventario, atiende a sus clientes y se
hace visible en internet, con la forma de su rubro.

Tres ideas lo distinguen de un ERP o de un software contable:

1. **Se adapta al rubro, no al revés.** Un gimnasio ve socios, membresías y
   control de acceso; una constructora ve obras, APU y actas. Por debajo son las
   mismas capacidades combinadas (`VERTICAL_RECIPES`, `vertical-terms.ts`).
2. **La operación diaria primero, la contabilidad después.** NEXUS registra
   cada venta y cada gasto bien hecho (con su documento) y se lo entrega al
   contador o a su software. No compite con el software contable en su terreno.
3. **Colombia de fábrica.** Pesos, NIT y cédula, DIAN, WhatsApp como canal
   principal, medios de pago locales.

## 2. Mapa de capacidades

Estado: **Hoy** = funciona en el piloto · **Parcial** · **Falta**.

| Capacidad | Hoy | Lo que falta | Depende de |
|---|---|---|---|
| **Clientes (CRM)** | Hoy: ficha 360°, campos por rubro, notas, QR/NFC | Segmentos, etiquetas, importar desde Excel, historial de mensajes | — |
| **Dinero** | Hoy: cobros con recibo, caja menor, gastos, anulación auditada, servicio transaccional | Cuentas por cobrar/pagar, abonos parciales, conciliación | — |
| **Punto de venta (POS)** | Parcial: venta de un producto a la vez | Carrito multi-línea, descuentos, impuestos por línea, cierre de turno con el documento POS | Dinero, Inventario |
| **Inventario** | Hoy: productos/servicios, stock con movimientos, venta directa | Fotos por producto, variantes (talla/color), listas de precio, proveedores, compras, costo promedio, código de barras | Archivos (ya existe) |
| **Documentos comerciales** | Hoy: cotización (construcción), recibo y cuenta de cobro | Cotización genérica, pedido, remisión, nota crédito | Dinero |
| **Factura electrónica DIAN** | Falta | Factura, nota crédito/débito, documento equivalente POS electrónico, documento soporte | Documentos, proveedor tecnológico (§3) |
| **Agenda** | Hoy: calendario, citas, cupos | Recordatorio automático, reserva en línea por el cliente | Mensajería, tareas programadas |
| **Membresías y acceso** | Hoy: planes, renovar/congelar, check-in QR/NFC | Cobro recurrente, avisos de vencimiento automáticos | Pagos en línea, tareas programadas |
| **Taquilla** | Hoy (museo): franjas, aforo, grupos | Venta en línea | Pagos en línea |
| **Construcción** | Hoy: APU, presupuesto, Lean, bitácora, actas, informes | Separarla del módulo `quotes` (ARCH-01) | — |
| **Mensajería** | Parcial: plantillas que abren `wa.me`; bandeja del panel con Meta/Resend | WhatsApp Business Cloud API por negocio, plantillas aprobadas, envío automático | Puerto de mensajería |
| **Pagos en línea** | Falta | Enlace de pago y botón (Wompi: tarjeta, PSE, Nequi), confirmación por webhook | Dinero, puerto de pagos |
| **Presencia digital** | Parcial: puntaje y sondeo del sitio, solicitudes al equipo | Mini-sitio del negocio con su catálogo, SEO local, perfil de Google Business, publicación en Instagram/Facebook | Inventario (catálogo público) |
| **Reportes** | Parcial: dashboard único, informes de construcción | Reportes por rubro, exportar a Excel/CSV para el contador | — |
| **Contabilidad y nómina** | Falta (a propósito) | Exportar movimientos al software contable; nómina electrónica solo si hay demanda | Factura electrónica |
| **Varios negocios por persona** | Falta | Selector de negocio, contador/asesor externo con permisos limitados | Membresías (ya existe el modelo) |

## 3. Factura electrónica DIAN

Es lo que más pide el mercado y lo que más cuesta hacer bien. Recomendación:
**no** construir la firma digital, el XML UBL ni la comunicación con la DIAN.
Integrar un **proveedor tecnológico** autorizado detrás de un puerto
(`EInvoicePort`, [target-architecture.md §3](target-architecture.md)), para
poder cambiar de proveedor sin tocar el resto.

Lo que NEXUS sí guarda y controla:

| Dato | Dónde viviría |
|---|---|
| NIT, razón social, régimen y responsabilidades fiscales del negocio | Configuración fiscal del `Tenant` |
| Resolución de numeración (prefijo, rango, vigencia) | Tabla propia por negocio; alerta antes de agotarse o vencer |
| Tipo y número de documento del cliente, correo de facturación | `Customer` |
| Impuestos por producto (IVA, INC, exento/excluido) | `Product` |
| Estado del documento (borrador → enviado → aceptado / rechazado) y su CUFE | Documento comercial, con reintentos idempotentes |

Flujo: la venta crea el documento en NEXUS **dentro de la misma transacción**
del cobro (servicio de dinero) → una tarea asíncrona lo envía al proveedor →
el webhook del proveedor actualiza el estado → si se rechaza, se avisa al
negocio y no se pierde la venta.

Antes de diseñar el detalle: confirmar con un contador y con el proveedor
elegido la normativa vigente (los anexos técnicos y los plazos del documento
POS electrónico cambian por resolución de la DIAN).

## 4. Orden de construcción

Cada fase se apoya en la anterior y deja el producto vendible.

| Fase | Contenido | Por qué en este orden |
|---|---|---|
| **1 · Base estable** | Seguridad P0/P1, permisos, servicio de dinero, módulos en el servidor (PR #45) | Sin esto, cada funcionalidad nueva hereda los huecos |
| **2 · Esquema único y capacidades** | DATA-03/04, FK y RLS (SEC-07), registro de capacidades (ADR-0003), separar construcción, precios unificados | Es el cimiento de todo lo demás; hoy un módulo vive en cinco sitios |
| **3 · Vender y facturar** | POS multi-línea, inventario completo (fotos, variantes, proveedores, compras), factura electrónica y documento POS | Es lo que más pide una pyme y lo que la ata a diario al producto |
| **4 · Cobrar y avisar solos** | Pagos en línea, WhatsApp Cloud API, tareas programadas (vencimientos, recordatorios, cobro recurrente) | Convierte a NEXUS en el que trabaja mientras el dueño no está |
| **5 · Que lo encuentren** | Mini-sitio con catálogo, SEO local, Google Business Profile, redes | Usa el catálogo y la agenda de las fases 3–4 como contenido |
| **6 · Ecosistema** | Exportación contable, contador externo, varios negocios por persona, nómina si hay demanda | Llega cuando hay base de clientes que lo pida |

## 5. Principios de producto

- **Un negocio empieza a operar en minutos.** El onboarding elige el rubro y
  NEXUS activa lo necesario; nadie configura un ERP.
- **Cada capacidad sirve sola y mejor junto.** El inventario funciona sin POS;
  con POS descuenta solo.
- **Lo que mueve dinero no se equivoca.** Todo cobro es transaccional, con
  documento y auditable (ya es así desde DATA-01).
- **Cada rol ve lo que puede hacer.** El servidor decide; la pantalla solo
  oculta (SEC-05).
- **Integrar antes que construir** lo que es commodity regulado: firma DIAN,
  pasarela de pagos, envío de WhatsApp y correo.

## 6. Decisiones abiertas

| Pregunta | Afecta |
|---|---|
| ¿El modelo de precios real es el de la base (`lib/plans`) o el de niveles Essential/Elite/Signature (`lib/pricing`)? | Fase 2: precios unificados |
| ¿Qué proveedor tecnológico DIAN? (costo por documento, API, soporte de documento POS) | Fase 3 |
| ¿Wompi u otra pasarela? | Fase 4 |
| ¿Una persona puede pertenecer a varios negocios? | Fase 6; hoy el modelo lo permite pero no hay selector |
| ¿Qué rubros se venden primero? (gimnasio, comercio, constructora…) | Prioridad dentro de cada fase |
