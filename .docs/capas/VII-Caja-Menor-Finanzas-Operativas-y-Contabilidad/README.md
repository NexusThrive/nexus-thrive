---
id: VII
titulo: "CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
type: capa
subcapas: 8
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, capa]
---

# VII. CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD

> Capa **VII** con **8 subcapas**. Cada subcapa tiene su escalera de madurez N0–N6; los diagramas se derivan de estos README (nodo = nivel, enlaces = integraciones).

## Núcleo compartido (base de la capa)

* **Movimiento de caja unificado**: una estructura única para egreso, ingreso, reposición, anticipo, legalización y ajuste (fecha, valor, tercero, categoría, centro de costo, soporte, estado, responsable).
* **Libro de caja inalterable**: el saldo se calcula sumando movimientos, nunca se edita directamente. Los errores se corrigen con un movimiento contrario, no con una edición.
* **Terceros compartidos**: proveedores, empleados y beneficiarios son los mismos del núcleo de la plataforma (con NIT o cédula).
* **Archivos y comprobantes**: almacenamiento por negocio, con foto comprimida, versionado y permisos.
* **Catálogo de categorías y centros de costo** que comparten Finanzas, ERP, Obra y Proyectos.
* **Motor de aprobaciones** reutilizable (el mismo que usan compras, vacaciones y descuentos).
* **Periodos y cierres**: un periodo cerrado bloquea cualquier edición.
* **Roles y permisos** de la capa 7 y **bitácora global** de la capa 6.
* **Numeración consecutiva** por caja y por documento, sin saltos ni duplicados.
* **Notificaciones** por WhatsApp, correo y app.

## Subcapas

| id | Subcapa | Escalera |
| --- | --- | --- |
| VII.00 | [Caja menor y arqueos](00-Caja-Menor-y-Arqueos/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VII.01 | [Vales, anticipos y legalizaciones](01-Vales-Anticipos-y-Legalizaciones/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VII.02 | [Cuentas por cobrar, cuentas por pagar y cartera](02-Cuentas-por-Cobrar-Cuentas-por-Pagar-y-Cartera/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VII.03 | [Documentos transaccionales y reglas fiscales](03-Documentos-Transaccionales-y-Reglas-Fiscales/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VII.04 | [Facturación electrónica y RADIAN](04-Facturacion-Electronica-y-RADIAN/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VII.05 | [Contabilidad general, PUC y estados financieros](05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VII.06 | [Presupuestos y centros de costo](06-Presupuestos-y-Centros-de-Costo/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VII.07 | [Tesorería, bancos y liquidez](07-Tesoreria-Bancos-y-Liquidez/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |

## Integraciones de esta capa

| Área | Integraciones típicas |
| --- | --- |
| Contabilidad | Siigo, Alegra, World Office, Contifico |
| DIAN | Proveedor tecnológico para documento soporte y lectura o validación de facturas electrónicas (Alegra, Siigo, Factus, Dataico) |
| Bancos | Extractos y archivos de conciliación, API de pagos, Nequi y tarjetas prepago |
| Captura | OCR y visión (Claude, Google Vision, AWS Textract), cámara del celular, lectura de QR de factura |
| Mensajería | WhatsApp Cloud API (registro por foto, avisos y aprobaciones), correo |
| Firma | Firma electrónica propia con evidencia, Certicámara, Olimpia |
| Almacenamiento | Archivos propios por negocio, Drive u OneDrive como respaldo |
| Interno | Obra y presupuestos, proyectos, nómina (anticipos y reembolsos), inventario, compras, finanzas, bitácora global, alertas y automatizaciones |

## Cosas críticas que se suelen olvidar

* **El saldo se calcula, no se escribe**: si alguien puede editar el saldo, el módulo pierde todo su valor. Todo cambio es un movimiento nuevo.
* **Anular, nunca borrar**: la anulación debe dejar rastro (quién, cuándo, por qué) y conservar el comprobante original. Un gasto borrado es la primera señal de un problema.
* **Segregación de funciones**: la persona que solicita, la que aprueba y la que maneja el efectivo deben ser distintas. En negocios muy pequeños, donde una sola persona hace todo, la bitácora y los arqueos sorpresa compensan.
* **Soporte válido en Colombia**: para gastos con proveedores no obligados a facturar se requiere **documento soporte**; sin él, el gasto puede no ser deducible. Valida con tu contador las reglas vigentes y haz que el sistema las parametrice en vez de dejarlas fijas en el código.
* **Pagos en efectivo y deducibilidad**: existen límites a los pagos en efectivo que se pueden tomar como costo o deducción. Sirve como alerta, pero no la conviertas en asesoría fiscal; el contador debe revisarla.
* **Retenciones**: aplican según la base, el tipo de tercero y el concepto. Si no son correctas desde el inicio, el contador reharía todo a mano. Hazlas configurables con vigencia.
* **Fraccionamiento de gastos**: dividir un gasto grande en varios pequeños para evitar el tope o la aprobación es el fraude más común en caja menor. Detéctalo por tercero, fecha y valor acumulado.
* **Anticipos sin legalizar**: son la fuga silenciosa. Pon fechas límite, alertas escalonadas y bloqueo de nuevos anticipos. Si se descuentan por nómina, exige la autorización escrita del empleado y consulta a un abogado laboral.
* **El arqueo es el control real**: sin conteo físico periódico y sorpresivo, el saldo del sistema es solo un número. Haz que el arqueo sea fácil, rápido y desde el celular.
* **Diferencias de arqueo**: define de antemano qué pasa con sobrantes y faltantes (quién los asume, cómo se registran). Si no, se resuelven con arreglos informales que dañan la contabilidad.
* **Cierre de periodos con bloqueo**: sin él, alguien edita un mes ya reportado al contador y los números cambian en silencio. Permite reabrir solo con autorización y registro.
* **Fotos de comprobantes**: pesan y se pierden. Comprime en el celular, sube en segundo plano, permite modo sin conexión y conserva los archivos con la retención legal.
* **OCR no es verdad absoluta**: muestra lo que leyó para que la persona confirme valor, fecha y NIT. Un OCR que registra sin revisión llena la contabilidad de errores.
* **Registro por WhatsApp**: útil y riesgoso. Verifica que el número esté autorizado, pide confirmación antes de crear el gasto y conserva la imagen original como evidencia.
* **Datos personales**: cédulas, cuentas bancarias y fotos de documentos de terceros son datos personales. Aplica habeas data, cifra y limita el acceso.
* **Caja menor no es para todo**: los gastos recurrentes grandes o con proveedores formales deben ir por compras y cuentas por pagar. Define el tope y la lista de conceptos permitidos para que la caja menor no se convierta en una segunda tesorería.
* **Cada vertical gasta distinto**: la caja de obra, la de recepción de un hotel y la de un tour tienen categorías, cierres y aprobadores diferentes. Las plantillas por vertical son lo que hace que el módulo se sienta hecho para el cliente.
* **Costos de OCR, WhatsApp y almacenamiento**: mídelos por negocio y ponles límites por plan.

## Qué lanzaría primero

1. **Núcleo: libro de caja inalterable, numeración de vales, comprobantes y bitácora** (si esto falla, lo demás no sirve).
2. **Nivel 1 completo**: apertura, egresos, reposiciones, saldo, comprobante, arqueo y filtros.
3. **Categorías, centros de costo y múltiples cajas** (nivel 2 de movimientos y categorías), con plantillas por vertical, especialmente **obra**.
4. **Solicitud y aprobación, anticipos con legalización y topes** con avisos por WhatsApp.
5. **Roles, anulaciones con motivo y cierre por periodos con bloqueo** (el trío que hace que el módulo se sienta profesional y confiable).
6. **Captura desde el celular con modo sin conexión** y firma del vale.
7. **Alertas**: saldo bajo, caja sin cerrar, gastos sin soporte, duplicados y anticipos vencidos.
8. **Terceros, tipo de soporte, impuestos y cuentas contables**, con exportes para el contador y asientos automáticos.
9. **Presupuesto por categoría y centro de costo** con alertas de sobreejecución, y el vínculo con el costo real de cada obra.
10. **OCR de facturas, registro por WhatsApp, integración con Siigo, Alegra o World Office, conciliación bancaria y detección de anomalías**, ya con volumen de uso real.

---

_Fuente: `DesordenadoCapas.md` (capa `Caja`) + `EstructuraCapasImplementacion.md`._