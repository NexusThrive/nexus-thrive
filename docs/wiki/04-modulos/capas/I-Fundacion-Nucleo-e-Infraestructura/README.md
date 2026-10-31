---
id: I
titulo: "FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
type: capa
subcapas: 8
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, capa]
---

# I. FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA

> Capa **I** con **8 subcapas**. Cada subcapa tiene su escalera de madurez N0–N6; los diagramas se derivan de estos README (nodo = nivel, enlaces = integraciones).

## Núcleo compartido (base de la capa)

* **Tercero único con roles** (cliente, proveedor, empleado, contratista), con NIT o cédula, dígito de verificación, régimen y responsabilidades tributarias. Es el mismo del CRM.
* **Documento transaccional unificado**: cotización, pedido, factura, remisión, orden de compra, nota crédito y recibo comparten estructura (cabecera, líneas, impuestos, estado, numeración, responsable). Los documentos emitidos **no se editan: se corrigen con documentos contrarios**.
* **Motor contable**: cada documento operativo genera su asiento de partida doble automáticamente, según reglas configurables por tipo de documento, categoría y cuenta.
* **Libro mayor inalterable**: saldos calculados desde movimientos, nunca escritos a mano.
* **Impuestos y retenciones parametrizables con vigencia** (IVA, impoconsumo, retención en la fuente, reteIVA, ICA, reteICA), porque la norma cambia cada año.
* **Dimensiones analíticas**: centro de costo, sucursal, proyecto u obra, línea de negocio y canal en cada línea de cada documento.
* **Periodos y cierres** con bloqueo de edición y reapertura autorizada.
* **Numeración y resoluciones** consecutivas, sin saltos ni duplicados.
* **Multi-moneda y tasas de cambio** desde el diseño, aunque al inicio solo uses pesos.
* **Motor de aprobaciones, bitácora global y permisos** de las capas anteriores.

## Subcapas

| id | Subcapa | Escalera |
| --- | --- | --- |
| I.00 | [Núcleo transversal y modelo de tercero único](00-Nucleo-Transversal-y-Modelo-de-Tercero-Unico/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| I.01 | [Catálogo maestro de productos y servicios](01-Catalogo-Maestro-de-Productos-y-Servicios/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| I.02 | [Autenticación, usuarios e identidad unificada](02-Autenticacion-Usuarios-e-Identidad-Unificada/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| I.03 | [Permisos granulares y control de acceso (RBAC / ABAC)](03-Permisos-Granulares-y-Control-de-Acceso-RBAC-ABAC/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| I.04 | [Multi-tenancy y aislamiento de datos](04-Multi-Tenancy-y-Aislamiento-de-Datos/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| I.05 | [Motor de eventos y webhooks](05-Motor-de-Eventos-y-Webhooks/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| I.06 | [Auditoría, trazabilidad y bitácora](06-Auditoria-Trazabilidad-y-Bitacora/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| I.07 | [Respaldo, versionado y recuperación](07-Respaldo-Versionado-y-Recuperacion/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |

## Integraciones de esta capa

| Área | Integraciones típicas |
| --- | --- |
| Facturación DIAN y nómina electrónica | Proveedor tecnológico habilitado (Alegra, Siigo, Factus, Dataico, Carvajal, Gosocket) |
| Contabilidad externa | Siigo, Alegra, World Office, Contifico (si el cliente conserva su contabilidad) |
| Bancos | Extractos, archivos de dispersión, APIs de pagos, conciliación (Bancolombia, Davivienda, otros) |
| Pagos | Wompi, PayU, Mercado Pago, Nequi, PSE |
| Logística | Servientrega, Coordinadora, Envía, Interrapidísimo, Mensajeros Urbanos |
| E-commerce y canales | Shopify, WooCommerce, Mercado Libre, catálogo de Meta, Rappi |
| Captura de datos | OCR y visión (Claude, Google Vision, AWS Textract), lectura de XML y QR de facturas |
| Hardware | Lectores de código de barras, impresoras térmicas, balanzas, datáfonos |
| IA | Claude, OpenAI, modelos de pronóstico |
| Interno | CRM, ventas y pagos, obra y APU, caja menor, personas y nómina, operación, datos y BI, seguridad y plataforma |

## Cosas críticas que se suelen olvidar

* **Decide temprano qué construyes y qué integras**: la contabilidad completa y la facturación electrónica son lo más caro, más regulado y más cambiante de mantener. Un camino sensato es un **ERP operativo propio** (ventas, compras, inventario, cartera y tesorería) con **contabilidad y facturación integradas** con un proveedor, y contabilidad propia solo cuando tengas contadores que la usen a diario.
* **Un solo motor contable**: si cada módulo (ventas, caja menor, nómina, inventario) genera sus asientos a su manera, el balance nunca cuadra. Todos deben pasar por el mismo motor de asientos con reglas auditables.
* **Documentos emitidos no se editan**: una factura enviada a la DIAN se corrige con nota crédito, no con edición. Lo mismo para comprobantes de egreso, entradas de inventario y recibos de caja.
* **Los auxiliares deben cuadrar con la contabilidad**: inventario (kardex), cartera, proveedores y activos fijos deben coincidir con su cuenta de control. Haz un reporte de conciliación entre módulos y contabilidad desde el inicio.
* **Concurrencia en inventario**: con varias ventas simultáneas (tienda online, POS, reservas) se vende lo que no hay. Usa reservas, transacciones y bloqueos correctos, y define si se permite stock negativo.
* **El costo del inventario es un tema contable**: el método (promedio o PEPS), los costos en destino y las devoluciones afectan el estado de resultados. Cambiarlo después es muy difícil.
* **Impuestos parametrizados con vigencia**: tarifas, bases mínimas, topes y retenciones cambian cada año y por tipo de tercero. No los dejes fijos en el código; hazlos configurables y revísalos con un contador cada año.
* **Un tercero mal configurado rompe la facturación**: NIT sin dígito de verificación, régimen incorrecto o responsabilidades faltantes causan rechazos de la DIAN y retenciones mal calculadas. Valida al crear el tercero.
* **Cierre de periodos con bloqueo**: sin él, alguien edita un mes ya declarado y los números cambian en silencio. Permite reabrir solo con autorización y registro.
* **Segregación de funciones**: es la defensa principal contra el fraude en compras y pagos. En empresas pequeñas, donde una persona hace todo, compensa con bitácora, arqueos sorpresa y alertas.
* **Proveedores ficticios y cambio de cuentas bancarias**: son fraudes frecuentes. Exige aprobación y doble verificación al cambiar datos bancarios.
* **Redondeos y decimales**: pequeñas diferencias de centavos entre facturas, impuestos y asientos generan descuadres difíciles de rastrear. Define reglas de redondeo y precisión por moneda desde el inicio.
* **Zona horaria y corte de día**: ventas de “hoy”, cierres de caja y causaciones dependen de la zona horaria y de la hora de corte.
* **Multiempresa desde el modelo de datos**: agregar multiempresa, multimoneda o multisucursal después obliga a reescribir. Aunque al inicio uses una sola empresa y pesos, deja las llaves en el diseño.
* **Facturación electrónica con cola y reintentos**: la DIAN o el proveedor fallan a veces. Una venta no debe perderse ni duplicarse si la emisión falla; usa idempotencia y estado de emisión.
* **Retención de documentos**: facturas, soportes, libros y nóminas tienen plazos legales largos de conservación. Define políticas de archivo y eliminación, y cifra los datos personales de terceros (habeas data).
* **Costos de OCR, WhatsApp y facturación**: mídelos por negocio y ponles límites por plan, porque cada factura emitida y cada lectura de documento tiene costo.
* **No des asesoría contable ni fiscal sin respaldo**: el sistema calcula con reglas configurables, pero la responsabilidad de las declaraciones es del contador del negocio. Aclara esto en los términos y en la interfaz.
* **Cada vertical contabiliza distinto**: un hotel (ingresos por habitación, propinas, impoconsumo), una constructora (costos por obra, actas, anticipos y retenciones de garantía) y un gimnasio (ingresos diferidos por membresía) necesitan cuentas y reglas propias. Las plantillas por vertical son lo que hace usable el ERP.

## Qué lanzaría primero

1. **Núcleo: tercero único, documento unificado, impuestos con vigencia, dimensiones analíticas, periodos y bitácora** (todo lo demás se apoya aquí).
2. **Catálogo maestro y terceros** con importación desde Excel y validación de NIT.
3. **Ventas: cotización, pedido y factura/recibo**, con cuentas por cobrar y vínculo con el CRM (la oportunidad ganada crea el pedido).
4. **Facturación electrónica vía proveedor tecnológico**, conectada a ventas, POS y suscripciones.
5. **Compras: orden de compra, factura de proveedor y documento soporte**, con cuentas por pagar y retenciones.
6. **Inventario básico y luego avanzado**: bodegas, kardex, stock mínimo, y consumos por obra o por servicio.
7. **Caja y bancos, recaudos y pagos**, con cartera por edades y conciliación bancaria.
8. **Centros de costo, presupuestos y costos por proyecto u obra**, conectados con Construcción y Caja menor. Para constructoras es lo que más valor percibido da.
9. **Contabilidad**: primero exportes y asientos automáticos con integración a Siigo o Alegra; después PUC, auxiliares y estados financieros propios, con cierre por periodos.
10. **Activos fijos, producción con BOM, MRP, WMS, consolidación multiempresa, costeo avanzado, IA y portales**, ya con clientes grandes y volumen de datos.

---

_Fuente: `../../fuentes/DesordenadoCapas.md` (capa `ERP`) + `../../fuentes/EstructuraCapasImplementacion.md`._