---
title: "DesordenadoCapas — Fuente de capas (ordenado para el sistema I–XI)"
type: fuente
tags: [capas, fuente, estructura]
---

> Documento fuente de niveles N1–N4. Ordenado según el sistema de capas
> (ver `EstructuraCapasImplementacion.md`): las cabeceras indican la capa destino.

### Capa I — Fundación, Núcleo e Infraestructura (fuente: ERP)

Esta capa es el **sistema contable y logístico** de la plataforma: convierte cada venta, compra, movimiento de inventario, pago y nómina en un registro financiero ordenado y auditable. El CRM trae al cliente, ventas y pagos cierran el negocio, operación lo ejecuta, y el ERP **lo registra, lo costea y lo reporta**. Es la capa más grande y regulada, así que la decisión clave es qué **construir** y qué **integrar** (por ejemplo, contabilidad y facturación con Siigo, Alegra o World Office). Muchos módulos que ya desglosamos (Caja menor, CRM, Construcción, Personas, Ventas y pagos) son piezas de este ERP. Aquí se describe el tejido que los une.

### Núcleo compartido (base de toda la capa)

Se construye una sola vez y lo usan todos los componentes:

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

### 1\. Catálogo maestro y terceros

**Nivel 1: mínimo viable**

* **Productos y servicios** con código, nombre, unidad, precio, impuesto y categoría.
* **Clientes y proveedores** como terceros con NIT o cédula.
* Importación desde Excel con validación.
* Activar y desactivar ítems sin borrarlos.

**Nivel 2: operativo**

* **Variantes** (talla, color), **unidades de medida y conversiones** (caja, unidad, kilo) y **códigos de barras**.
* **Listas de precios** por cliente, canal o sede.
* **Servicios y paquetes** (kits o combos) y productos compuestos.
* **Clasificación fiscal por ítem**: tarifa de IVA, excluido, exento, impoconsumo, código para facturación electrónica.
* **Ficha de tercero completa**: contactos, direcciones, condiciones de pago, cupo de crédito, banco y régimen.
* **Detección de duplicados** de terceros e ítems, y fusión controlada.
* **Cuenta contable por defecto** por categoría de producto.

**Nivel 3: control**

* **Aprobación para crear o modificar** terceros y precios (control antifraude de proveedores ficticios).
* **Historial de cambios de precio y costo** con responsable y fecha.
* **Validación del NIT y consulta del RUT**, y control de datos bancarios del proveedor con doble verificación.
* **Atributos y campos personalizados** por vertical (obra, hotel, gimnasio, turismo).
* **Catálogo compartido entre sedes** con precios y disponibilidad diferenciados.
* **Documentos por tercero** (RUT, cámara de comercio, certificación bancaria, contratos).

**Nivel 4: máximo**

* **Gestión de datos maestros multiempresa** con reglas de qué se comparte y qué no.
* **Verificación de proveedores** en listas restrictivas (SARLAFT, según el caso) y evaluación de riesgo.
* **Catálogo sincronizado** con tienda online, marketplaces, POS y canales.
* **Enriquecimiento y limpieza de datos con IA** (clasificación de productos, detección de inconsistencias).
* **Plantillas de catálogo por vertical** listas para importar.

### 2\. Ventas

**Nivel 1: mínimo viable**

* **Cotización, pedido y factura o recibo** encadenados (un documento nace del anterior).
* Estados: borrador, enviada, aceptada, facturada, anulada.
* PDF con la marca del negocio y envío por WhatsApp o correo.
* **Cuenta por cobrar** generada al facturar a crédito.

**Nivel 2: operativo**

* **Listas de precios, descuentos y promociones** con reglas.
* **Notas crédito y débito** ligadas a la factura original.
* **Devoluciones** que reponen inventario y generan la nota crédito.
* **Remisiones** (entrega sin facturar todavía) y facturación posterior.
* **Facturación parcial** de un pedido y pedidos pendientes por entregar.
* **Vendedor y comisión** por documento.
* **Integración con CRM**: la oportunidad ganada crea el pedido y la factura.
* **Cobro en el momento** con link de pago, o registro del pago manual.

**Nivel 3: control**

* **Aprobación de descuentos, de crédito y de precios especiales** por rol y monto.
* **Cupo de crédito del cliente** con bloqueo automático al excederlo o al tener cartera vencida.
* **Reserva de inventario** al tomar el pedido.
* **Contratos y facturación recurrente** (mensualidades, mantenimiento, arriendos).
* **Facturación por avance o por actas** (obra) y por hitos.
* **Márgenes por documento** visibles solo para quien tenga permiso.
* **Reportes**: ventas por producto, cliente, vendedor y canal; cartera asociada; cotizaciones sin cerrar.

**Nivel 4: máximo**

* **Motor de precios avanzado (CPQ)**: reglas por volumen, temporada, canal, contrato y paquetes.
* **Ventas multi-sede, multi-moneda y multiempresa**, con ventas intercompañía y eliminaciones.
* **Portal del cliente** para ver cotizaciones, pedidos, facturas y estado de cuenta, y pagar.
* **Pronóstico de demanda y de ventas** conectado con planeación.
* **Venta consignada, anticipos de clientes y financiación.**
* **Comisiones complejas** y reparto entre varios vendedores.

### 3\. Compras

**Nivel 1: mínimo viable**

* **Orden de compra** a proveedor con ítems, cantidades y precios.
* **Registro de la factura del proveedor** y su cuenta por pagar.
* Entrada de mercancía al inventario al recibir.

**Nivel 2: operativo**

* **Solicitud de compra** interna que se convierte en orden.
* **Cotización a varios proveedores** y comparativo.
* **Recepción de mercancía** parcial o total con control de lo pendiente.
* **Cruce de tres vías** (orden, recepción y factura) con alerta de diferencias de cantidad o precio.
* **Notas crédito de proveedor y devoluciones de compra.**
* **Documento soporte** para compras a no obligados a facturar.
* **Retenciones aplicadas** automáticamente según el tipo de proveedor y la base.
* **Costo de compra** que alimenta el costo del inventario (incluye fletes e impuestos no descontables).

**Nivel 3: control**

* **Aprobación por monto y por categoría** (el jefe aprueba hasta cierto valor; gerencia, por encima).
* **Segregación de funciones**: quien solicita, quien aprueba, quien recibe y quien paga son personas distintas.
* **Contratos marco y precios pactados** con alerta de sobreprecio.
* **Presupuesto comprometido**: al aprobar una orden se reserva el valor contra el presupuesto del área o la obra.
* **Compras ligadas a proyectos y obras**, con imputación al capítulo o ítem.
* **Evaluación de proveedores** (cumplimiento, calidad, precio) y bloqueo de los no homologados.
* **Reportes**: compras por proveedor, variación de precios, entregas pendientes y ahorros.

**Nivel 4: máximo**

* **Licitaciones y subastas inversas** entre proveedores con trazabilidad.
* **Compras automáticas por reposición** según stock mínimo y pronóstico de demanda.
* **Lectura de facturas con OCR y de facturas electrónicas (XML)** que crea el registro y lo cruza con la orden.
* **Portal del proveedor**: ve órdenes, sube facturas y consulta pagos.
* **Compras consolidadas entre sedes y empresas** del grupo.
* **Análisis de gasto con IA** (consolidar compras, detectar sobrecostos y proponer proveedores).

### 4\. Inventario y logística

**Nivel 1: mínimo viable**

* **Entradas, salidas y existencias** por producto.
* Ajustes manuales con motivo.
* **Stock actual** en listado y alerta de agotado.
* Descuento automático al facturar y suma al recibir compras.

**Nivel 2: operativo**

* **Múltiples bodegas** y **traslados** entre ellas, con estado en tránsito.
* **Kardex** por producto (cada movimiento con saldo y costo).
* **Lotes, fechas de vencimiento y series.**
* **Stock mínimo, máximo y punto de reorden** con alertas.
* **Conteos físicos y ajustes por inventario** con diferencias aprobadas.
* **Método de costeo** configurable (promedio ponderado o PEPS) con inventario permanente.
* **Inventario por obra o por sede** (bodega de obra, bodega de cocina, bodega de insumos del gimnasio).

**Nivel 3: control**

* **Reservas y disponibilidad** (físico vs. comprometido vs. disponible).
* **Control de concurrencia**: dos ventas simultáneas no pueden vender la misma última unidad.
* **Stock negativo** configurable (permitido o bloqueado) con alerta.
* **Valoración del inventario y su conciliación con la contabilidad** (el kardex debe cuadrar con la cuenta contable).
* **Costo en destino** (fletes, aranceles y otros costos asignados al producto).
* **Inventarios cíclicos**, mermas, daños y obsolescencia con aprobación.
* **Consumos por proyecto, por servicio o por receta** (cuánto insumo gastó cada tour, obra o plato).
* **Reportes**: rotación, días de inventario, productos sin movimiento y valorización por bodega.

**Nivel 4: máximo**

* **WMS**: ubicaciones dentro de la bodega, picking, packing, recepción guiada y lectores de código de barras o RFID.
* **Despachos, rutas y transportadoras** (guías, seguimiento y costo del flete), y entrega con prueba digital.
* **Trazabilidad completa** de lote o serie (de proveedor a cliente) y retiro de productos.
* **Pronóstico de demanda y reposición automática** con IA.
* **Dropshipping, consignación y bodegas de terceros.**
* **Inventario multi-empresa** con traslados intercompañía.
* **Mantenimiento de activos y gestión de flota** vinculados (ver capa de Operación).

### 5\. Cuentas por cobrar, por pagar y tesorería

**Nivel 1: mínimo viable**

* **Cuentas por cobrar**: quién me debe, cuánto y desde cuándo.
* **Cuentas por pagar**: a quién le debo y cuándo vence.
* **Caja y bancos**: ingresos, egresos y saldos por cuenta.
* Registro manual de pagos y recaudos con comprobante.

**Nivel 2: operativo**

* **Cartera por edades** (corriente, 30, 60, 90 días y más) y estado de cuenta por cliente.
* **Recaudos aplicados a facturas** (parciales, anticipos y pagos de varias facturas a la vez).
* **Pagos a proveedores** programados por fecha de vencimiento, con comprobante de egreso.
* **Conciliación bancaria**: cruzar el extracto con los movimientos del sistema.
* **Recordatorios de cobro** automáticos por WhatsApp o correo (con horarios y frecuencia permitidos).
* **Flujo de caja proyectado** simple (lo que entra y sale en las próximas semanas).
* **Caja menor** conectada (módulo propio de la capa anterior).

**Nivel 3: control**

* **Aprobación de pagos** por monto, doble firma y segregación de funciones.
* **Dispersión de pagos** por archivo bancario o API, con conciliación automática.
* **Cobranza estructurada**: secuencia de gestión, compromisos de pago, acuerdos y alertas de morosidad.
* **Anticipos, cruces y compensaciones** entre cuentas por cobrar y por pagar del mismo tercero.
* **Provisión de cartera** (deterioro) con reglas.
* **Retenciones practicadas y sufridas**, con certificados.
* **Reportes**: cartera vencida, días de cobro y de pago, y flujo de caja real vs. proyectado.

**Nivel 4: máximo**

* **Conciliación automática** con sugerencia de cruces (por valor, fecha y referencia) y reglas aprendidas.
* **Tesorería multi-banco y multi-moneda**, posiciones consolidadas y diferencia en cambio.
* **Proyección de flujo de caja con IA** y alertas de falta de liquidez.
* **Factoring, financiación y cupos bancarios** con seguimiento de costos.
* **Débito automático, mandatos y cobros recurrentes** conectados con pasarelas.
* **Portal de pagos** para clientes y proveedores (estados de cuenta, pagos y descarga de certificados).

### 6\. Facturación electrónica e impuestos

**Nivel 1: mínimo viable**

* **Factura electrónica** emitida a través de un proveedor tecnológico autorizado (no directamente a la DIAN).
* **Datos del emisor y del adquirente**, resolución de numeración y régimen.
* **PDF y XML** enviados al cliente.
* **Documento soporte** para compras a no obligados a facturar.

**Nivel 2: operativo**

* **Factura automática** desde pedidos, reservas, POS y suscripciones.
* **Notas crédito y débito electrónicas** referenciando la factura original.
* **Estado ante la DIAN** (aceptada, rechazada) con corrección guiada de rechazos.
* **Impuestos por ítem y por tercero**: IVA, impoconsumo, retención en la fuente, reteIVA, ICA y reteICA, con tarifas y bases configurables.
* **Gestión de resoluciones y consecutivos** con alerta de agotamiento o vencimiento.
* **Factura de venta en POS** y documento equivalente cuando aplique.

**Nivel 3: control**

* **Cola de emisión con reintentos** cuando falla el proveedor o la DIAN, y modo de contingencia.
* **Eventos RADIAN** (acuse, recibo, aceptación) y factura como título valor.
* **Declaraciones asistidas**: reportes de base para IVA, retención en la fuente e ICA, listos para el contador.
* **Información exógena** (medios magnéticos) preparada desde los datos del sistema.
* **Certificados de retención** (ingresos y retenciones, ICA) generados automáticamente.
* **Calendario tributario** con alertas de vencimientos.
* **Soporte del régimen del negocio** (ordinario, Régimen Simple de Tributación, no responsable de IVA).

**Nivel 4: máximo**

* **Multi-NIT y multiempresa** con configuraciones fiscales independientes.
* **Validación automática de facturas recibidas** contra la DIAN y registro desde XML.
* **Facturación internacional** y reglas por país si la plataforma sale de Colombia.
* **Motor de reglas fiscales con vigencia** actualizable sin tocar el código, y alertas por cambios normativos.
* **Conciliación de impuestos** entre contabilidad, facturación y declaraciones.
* **Preparación de auditorías** de la DIAN con trazabilidad de punta a punta.

### 7\. Contabilidad y estados financieros

**Nivel 1: mínimo viable**

* **Reportes simples**: ventas, gastos y utilidad del periodo.
* **Exportación** de movimientos para el contador.
* Categorías de ingresos y gastos.

**Nivel 2: operativo**

* **Plan de cuentas (PUC)** configurable por negocio, con plantilla por tipo de empresa.
* **Asientos automáticos** desde ventas, compras, inventario, caja, bancos, nómina e impuestos.
* **Comprobantes contables manuales** (ajustes, depreciaciones, reclasificaciones), con aprobación.
* **Libros auxiliares, libro diario, libro mayor y balance de prueba.**
* **Terceros y centros de costo en cada asiento**, para reportes por obra, sede o línea.
* **Reportes para el contador** con acceso de solo lectura y limitado en el tiempo.

**Nivel 3: control**

* **Estados financieros**: balance general, estado de resultados y flujo de caja, con comparativos por periodo.
* **Cierre contable por periodos** con lista de verificación y bloqueo de edición (reapertura solo con autorización y registro).
* **Activos fijos**: altas, depreciación (línea recta y otros métodos), mejoras y bajas, con asientos automáticos.
* **Diferidos, provisiones y causaciones** automáticas y recurrentes.
* **Conciliación entre módulos y contabilidad** (inventario, cartera, proveedores, impuestos, nómina): cada auxiliar debe cuadrar con su cuenta de control.
* **Ajustes por inflación y por diferencia en cambio**, si aplica.
* **Soporte de NIIF** según el grupo del negocio (por ejemplo, NIIF para pymes o microempresas).

**Nivel 4: máximo**

* **Multiempresa y consolidación**: eliminaciones intercompañía, conversión de moneda y estados consolidados.
* **Costeo avanzado**: costeo por actividades (ABC), costo estándar vs. real y análisis de variaciones.
* **Contabilidad multi-libro o multi-norma** (fiscal y NIIF en paralelo).
* **Rentabilidad por cliente, producto, canal, proyecto y sede** con costos asignados.
* **Cierre asistido con IA**: detecta cuentas descuadradas, partidas sin conciliar y asientos atípicos.
* **Auditoría externa y revisoría fiscal**: acceso controlado, muestras, trazabilidad y paquetes de evidencia.
* **Integración bidireccional con Siigo, Alegra y World Office** si el cliente prefiere conservar su contabilidad externa.

### 8\. Presupuestos, proyectos, obras y centros de costo

**Nivel 1: mínimo viable**

* **Centros de costo y sucursales** como etiquetas en cada documento.
* Reporte de gasto e ingreso por centro de costo.

**Nivel 2: operativo**

* **Presupuesto por área, sede o proyecto** y por categoría, con mensualización.
* **Comparativo presupuesto vs. ejecutado** con semáforos.
* **Proyectos y obras** con ingresos, costos y margen en tiempo real.
* **Imputación de gastos** (compras, caja menor, nómina, subcontratos) a cada proyecto.
* **Alertas de sobreejecución** (80 % y 100 %).

**Nivel 3: control**

* **Gestión completa de proyectos y obras**: presupuesto aprobado, versiones, avance, actas, anticipos, retenciones de garantía y facturación por avance (conectada con el módulo de Construcción y APU).
* **Presupuesto comprometido** (órdenes aprobadas aún sin factura) además del ejecutado.
* **Reparto de costos indirectos** entre proyectos y sedes por reglas (porcentaje, horas, ingresos).
* **Proyección de costo final y de margen** por proyecto.
* **Aprobación de cambios** de presupuesto y adicionales.
* **Flujo de caja por proyecto.**

**Nivel 4: máximo**

* **Planeación financiera multi-periodo y por escenarios** (presupuesto anual, reforecast, escenarios optimista y pesimista).
* **Valor ganado (EVM)** y control de desviaciones.
* **Portafolio de proyectos** con rentabilidad consolidada y riesgos.
* **Presupuesto base cero y rolling forecast.**
* **Simulaciones** (“¿qué pasa si el cemento sube 8 %?”) conectadas con APU y compras.
* **Benchmarks** de márgenes y costos por tipo de proyecto y vertical.

### 9\. Producción y planeación

**Nivel 1: mínimo viable**

* **Recetas o fórmulas simples** (qué insumos lleva un producto o plato).
* **Descuento de insumos** al vender o producir.

**Nivel 2: operativo**

* **Listas de materiales (BOM)** con insumos, cantidades y mermas.
* **Órdenes de producción** con consumo de insumos y entrada de producto terminado.
* **Costeo de producción** (materiales, mano de obra y costos indirectos).
* **Rendimiento y desperdicio** registrados.

**Nivel 3: control**

* **BOM multinivel** (subensambles) y versiones.
* **Rutas y operaciones**, tiempos estándar y centros de trabajo.
* **Costo estándar vs. real** y análisis de variaciones.
* **Control de calidad en producción** (inspecciones, no conformidades).
* **Producción por pedido o por stock**, con reserva de insumos.
* **Reportes**: eficiencia, mermas, costo por unidad y cumplimiento de órdenes.

**Nivel 4: máximo**

* **MRP**: planea qué comprar y qué producir según demanda, inventario y tiempos de entrega.
* **Planificación de capacidad y programación** (secuenciación de órdenes y detección de cuellos de botella).
* **Pronóstico de demanda con IA** y planes de producción sugeridos.
* **Trazabilidad lote a lote** de insumos a producto terminado.
* **Mantenimiento de maquinaria** integrado y OEE (eficiencia global de equipos).
* **Subcontratación de procesos** con seguimiento.

### 10\. Nómina y recursos humanos

Esta pieza ya está desglosada en la **capa de Personas y Equipo**; aquí solo se define cómo se integra al ERP.

**Nivel 1: mínimo viable**

* **Exportar el costo de nómina** y las novedades para el contador.
* Registro de empleados y contratos.

**Nivel 2: operativo**

* **Liquidación de nómina, seguridad social, prestaciones y nómina electrónica** (propia o vía proveedor).
* **Asientos contables automáticos** de nómina, aportes y provisiones.
* **Pago de nómina** conectado con tesorería.

**Nivel 3: control**

* **Costo de personal por centro de costo, sede y proyecto.**
* **Anticipos, préstamos y descuentos** conectados con Caja Menor y cuentas por cobrar.
* **Provisiones y conciliación** con contabilidad.
* **Cierre de nómina por periodos** con bloqueo.

**Nivel 4: máximo**

* **Multi-NIT y multiempresa** con empleados compartidos.
* **Presupuesto y proyección de nómina** conectados con planeación financiera.
* **Portal del empleado** y autogestión.
* **Contratistas y prestadores de servicios** con control de seguridad social.

### 11\. Control, auditoría, documentos, reportes, IA, portales e integraciones

**Nivel 1: mínimo viable**

* **Usuarios y accesos básicos** por rol.
* **Registro de quién creó cada documento.**
* **Reportes simples** exportables a Excel o PDF.
* **Archivos adjuntos** por documento.

**Nivel 2: operativo**

* **Roles por módulo y por acción** (ver, crear, editar, anular, aprobar, exportar).
* **Historial de cambios** por documento.
* **Anulaciones con motivo** y no borrado de documentos emitidos.
* **Conexión con CRM, caja menor y POS**, de modo que todo documento nazca ya vinculado al cliente y al centro de costo.
* **Integraciones esenciales**: WhatsApp, pasarelas de pago y facturación electrónica.

**Nivel 3: control**

* **Segregación de funciones** y matriz de conflictos (quien registra no aprueba, quien aprueba no paga).
* **Flujos de aprobación por montos y tipo de documento**, con delegación y vencimiento.
* **Cierre por periodos con bloqueo** y control de reapertura.
* **Bitácora de auditoría completa**, incluidas lecturas de datos sensibles y exportaciones.
* **Gestión documental**: contratos, soportes y archivos por tercero, con versiones y vencimientos.
* **Reportes configurables** y exportación a Excel o PDF, con filtros guardados y envío programado.
* **Bloqueos y alertas**: documentos sin soporte, descuadres, consecutivos faltantes y facturas rechazadas.

**Nivel 4: máximo**

* **Business Intelligence**: tableros de gerencia, indicadores (KPIs) y rentabilidad por cliente, producto y canal (conectado con la capa de Datos).
* **Automatización de flujos y reglas de negocio configurables** (por ejemplo, “si una compra supera X y no tiene presupuesto, escalar a gerencia”).
* **IA**: OCR de facturas, detección de anomalías (duplicados, precios atípicos, fraccionamiento), proyección de flujo de caja, pronóstico de demanda y asistente en lenguaje natural (“¿cuánto debo a proveedores esta semana?”).
* **Portales** para clientes, proveedores y empleados (autogestión de estados de cuenta, facturas, pagos y documentos).
* **Integraciones**: bancos, pasarelas de pago, e-commerce, transportadoras, Meta, WhatsApp, firma electrónica y contabilidad externa.
* **API, webhooks y marketplace de módulos.**
* **Plantillas por vertical** con catálogo, PUC, centros de costo, reportes y automatizaciones listas (hotel, gimnasio, construcción, restaurante, turismo, etc.).

### Integraciones de esta capa

| Área                                  | Integraciones típicas                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Facturación DIAN y nómina electrónica | Proveedor tecnológico habilitado (Alegra, Siigo, Factus, Dataico, Carvajal, Gosocket)                         |
| Contabilidad externa                  | Siigo, Alegra, World Office, Contifico (si el cliente conserva su contabilidad)                               |
| Bancos                                | Extractos, archivos de dispersión, APIs de pagos, conciliación (Bancolombia, Davivienda, otros)               |
| Pagos                                 | Wompi, PayU, Mercado Pago, Nequi, PSE                                                                         |
| Logística                             | Servientrega, Coordinadora, Envía, Interrapidísimo, Mensajeros Urbanos                                        |
| E-commerce y canales                  | Shopify, WooCommerce, Mercado Libre, catálogo de Meta, Rappi                                                  |
| Captura de datos                      | OCR y visión (Claude, Google Vision, AWS Textract), lectura de XML y QR de facturas                           |
| Hardware                              | Lectores de código de barras, impresoras térmicas, balanzas, datáfonos                                        |
| IA                                    | Claude, OpenAI, modelos de pronóstico                                                                         |
| Interno                               | CRM, ventas y pagos, obra y APU, caja menor, personas y nómina, operación, datos y BI, seguridad y plataforma |

### Cosas críticas que se suelen olvidar

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

### Qué lanzaría primero

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

\-------------------------------------------------------------------------------- 


### Capa II — Visibilidad, Captación y Presencia Digital (fuente: Marketing)

Esta capa es el **motor de entrada y recompra**: atrae gente, la convierte en contacto y la trae de vuelta. Su valor real aparece cuando todo cae en el CRM con **su origen** (de qué canal vino cada cliente). Sin eso, es solo un conjunto de herramientas sueltas.

### Núcleo compartido (base de toda la capa)

Se construye una sola vez y lo usan los ocho componentes:

* **Contacto unificado con origen**: fuente, medio, campaña y primer contacto guardados en la ficha del CRM.
* **UTM y atribución**: cada enlace, formulario, QR y anuncio lleva sus parámetros y se registran.
* **Segmentos y listas** compartidos (por vertical, interés, última compra, origen).
* **Consentimiento y opt-in** por canal (correo, WhatsApp, SMS), con fecha y prueba de aceptación.
* **Biblioteca de medios** (imágenes, videos, logos) y **marca del negocio** (colores, tipografía, tono).
* **Eventos de seguimiento (tracking)**: visita, formulario enviado, clic en WhatsApp, reserva, pago.
* **Dominios y subdominios** por negocio, con SSL automático.
* **Cola de envíos y límites** por plan para no saturar ni quemar la reputación de envío.

### 1\. Sitio web y landing pages

**Nivel 1: mínimo viable**

* Plantillas por vertical, con edición de textos, imágenes y colores.
* Subdominio automático (`negocio.nexusthrive.co`).
* Botón flotante de WhatsApp, mapa y datos de contacto.
* Diseño responsive (celular primero).

**Nivel 2: operativo**

* **Constructor por bloques** (hero, servicios, galería, testimonios, precios, FAQ).
* **Dominio propio** con verificación DNS guiada y SSL.
* **Formularios que crean leads en el CRM** y avisan por WhatsApp o correo.
* **Páginas múltiples** y menú, además de landings para campañas.
* **Widget de reservas, cotización o catálogo** embebido desde los otros módulos.
* Píxel de Meta, Google Analytics y Tag Manager configurables.

**Nivel 3: control**

* **Versionado y borrador/publicado**, con vista previa y restauración.
* **Pruebas A/B** de titulares, botones y páginas.
* **Multi-idioma** (ES/EN, clave en turismo y hoteles).
* **Biblioteca de secciones reutilizables** y estilos globales.
* **Roles**: quién edita y quién publica.
* Métricas por página: visitas, conversión y origen.
* Velocidad: optimización de imágenes, caché y puntaje Core Web Vitals.

**Nivel 4: máximo**

* **Generación de sitio completo con IA** a partir de una descripción o de los datos del negocio.
* **Personalización dinámica** (contenido según origen, ciudad o idioma).
* **Pagos y e-commerce** dentro del sitio.
* **Portal del cliente** y áreas privadas.
* **White-label**: el negocio revende sitios a sus propios clientes.
* **Mapas de calor y grabaciones de sesión.**
* **Marketplace de plantillas y bloques** (propias y de terceros).

### 2\. Email y WhatsApp marketing

**Nivel 1: mínimo viable**

* Listas de contactos, importación y exportación.
* **Envío de correo** con editor simple y plantilla de marca.
* **Envío de WhatsApp** a una lista usando plantillas aprobadas.
* Baja automática (unsubscribe) y registro de opt-in.

**Nivel 2: operativo**

* **Segmentación** por etiquetas, vertical, última visita y origen.
* **Variables de personalización** ({nombre}, {servicio}, {fecha}).
* **Secuencias automáticas**: bienvenida, seguimiento de cotización, recordatorio de cita.
* **Programación de envíos** y zona horaria.
* Métricas básicas: entregados, abiertos, clics, respuestas y bajas.
* **Disparadores desde el CRM**: nuevo lead, reserva hecha, cliente inactivo.

**Nivel 3: control**

* **Constructor visual de flujos** (si abre y no compra, enviar X a los 3 días).
* **Listas dinámicas** que se actualizan solas.
* **Control de reputación**: límites de envío, calentamiento de dominio, SPF/DKIM/DMARC guiados.
* **Control de calidad de plantillas de WhatsApp** (estado de aprobación, calificación del número).
* **Pruebas A/B** de asunto y contenido.
* **Atribución de ingresos**: cuánta venta generó cada campaña.
* **Aprobación interna** antes de un envío masivo.

**Nivel 4: máximo**

* **Contenido y asuntos generados por IA** con el tono del negocio.
* **Hora óptima de envío por contacto** y predicción de bajas.
* **Campañas conversacionales** (el cliente responde y el bot continúa).
* **SMS, notificaciones push y correo transaccional** dentro del mismo motor.
* **Recomendaciones personalizadas** (producto o tour según historial).
* **Reactivación inteligente** de clientes dormidos.
* **Reportes de rentabilidad** por campaña, canal y segmento.

### 3\. Redes sociales

**Nivel 1: mínimo viable**

* **Calendario editorial** manual con fechas, canal y estado.
* Biblioteca de imágenes y textos guardados.
* Enlace a perfiles y botón de compartir en el sitio.

**Nivel 2: operativo**

* **Conexión de Instagram, Facebook, TikTok y LinkedIn** y programación de publicaciones.
* **Publicación múltiple** (un contenido, varias redes, con ajuste de formato).
* Plantillas de diseño (editor tipo Canva embebido o integración).
* **Métricas básicas**: alcance, interacciones y seguidores.
* Hashtags y textos guardados.

**Nivel 3: control**

* **Flujo de aprobación** (creador, revisor, publicador).
* **Calendario por equipo y por marca**, con tareas y fechas límite.
* **Métricas comparadas** por publicación, formato y horario.
* **Escucha de comentarios y menciones** con respuesta desde la bandeja omnicanal.
* **Banco de ideas y fechas clave** por vertical (temporadas, festivos, eventos).
* **Reportes mensuales** automáticos para el dueño del negocio.

**Nivel 4: máximo**

* **IA para ideas, guiones, textos y variaciones** según la marca.
* **Generación de imágenes y videos cortos** con plantillas.
* **Análisis de competencia** y benchmarks del sector.
* **Contenido generado por clientes (UGC)** y gestión de influencers.
* **Social commerce**: catálogo de Instagram/Facebook y venta por chat.
* **Atribución**: qué publicación generó leads, reservas o ventas.

### 4\. SEO y Google Business Profile

**Nivel 1: mínimo viable**

* **Títulos, descripciones y URLs editables** por página.
* Sitemap, robots y etiquetas básicas automáticas.
* **Ficha de Google Business** vinculada (enlace y datos coherentes con el sitio).

**Nivel 2: operativo**

* **Datos estructurados (schema)** por vertical: negocio local, hotel, tour, restaurante, producto.
* **Panel de Google Business**: editar horarios, fotos, servicios y publicaciones desde la plataforma.
* **Revisión de reseñas** y respuestas desde el panel.
* Informe SEO básico por página (títulos largos, imágenes sin descripción, enlaces rotos).
* Integración con Google Search Console.

**Nivel 3: control**

* **Seguimiento de palabras clave** y posiciones (locales y generales).
* **Páginas por servicio y por ciudad** generadas con plantillas.
* **Auditoría técnica** periódica con tareas sugeridas.
* **NAP consistente** (nombre, dirección, teléfono) en directorios.
* **Informe de visibilidad local**: llamadas, rutas y clics desde Google.
* **Redirecciones y control de errores 404.**

**Nivel 4: máximo**

* **Asistente SEO con IA**: recomienda contenido, títulos y mejoras priorizadas.
* **Análisis de competidores locales** y brechas de palabras clave.
* **Gestión multi-sede** de fichas de Google.
* **Optimización para buscadores con IA** (respuestas estructuradas, FAQ, contenido citable).
* **Generación masiva de páginas locales** con control de calidad.
* **Reportes de retorno**: tráfico orgánico convertido en leads y ventas.

### 5\. Gestor de anuncios (Meta Ads y Google Ads) con atribución

**Nivel 1: mínimo viable**

* **Registro manual de campañas** (canal, inversión, fechas).
* **UTM automáticos** en los enlaces.
* Reporte simple: inversión vs. leads recibidos por origen.

**Nivel 2: operativo**

* **Conexión con Meta Ads y Google Ads** para traer gasto, impresiones y clics.
* **Costo por lead y por cliente** por campaña.
* **Eventos de conversión enviados de vuelta** (Meta Conversions API, conversiones offline de Google).
* **Campañas “Click to WhatsApp”** con seguimiento de la conversación hasta la venta.
* **Audiencias desde el CRM** (clientes, leads, inactivos) sincronizadas con las plataformas.

**Nivel 3: control**

* **Crear y pausar campañas desde la plataforma** con plantillas por vertical.
* **Presupuestos y alertas**: gasto diario, sobreejecución y campañas sin resultados.
* **Atribución multicanal** (primer toque, último toque, lineal).
* **ROAS real**: ingresos de la reserva o venta contra la inversión, no solo clics.
* **Informes por cliente final** (para agencias) con marca propia.
* **Biblioteca de creativos** y rendimiento por anuncio.

**Nivel 4: máximo**

* **Optimización con IA**: sugiere presupuesto, audiencias y creativos.
* **Generación de anuncios** (texto, imagen y video) con pruebas automáticas.
* **Reglas automáticas**: pausar si el costo por lead sube de X.
* **Modelos de atribución avanzados** y análisis de incrementalidad.
* **Otros canales**: TikTok Ads, LinkedIn Ads y Google Performance Max.
* **Valor de vida del cliente (LTV) por canal** para decidir dónde invertir.

### 6\. Blog / CMS y biblioteca de contenido

**Nivel 1: mínimo viable**

* Editor de entradas con título, imagen, texto y categoría.
* Publicar, programar y guardar borrador.
* Página de blog automática en el sitio del negocio.

**Nivel 2: operativo**

* **Categorías, etiquetas, autores y buscador.**
* **Editor por bloques** (imágenes, videos, citas, botones de acción).
* **SEO por entrada** (título, descripción, imagen para compartir).
* **Biblioteca de contenido reutilizable**: textos, imágenes, preguntas frecuentes y fichas de servicio.
* **Llamados a la acción** que capturan leads (formulario, WhatsApp, reserva).

**Nivel 3: control**

* **Flujo editorial**: borrador, revisión, aprobación y publicación.
* **Calendario de contenidos** ligado a redes y correo.
* **Contenido modular reutilizable** (una ficha de tour alimenta sitio, blog, redes y correo).
* **Versionado** y registro de cambios.
* **Contenido por vertical** (guías de destino, recetas, rutinas, casos de obra).
* **Métricas por entrada**: lecturas, tiempo y leads generados.

**Nivel 4: máximo**

* **Redacción asistida por IA** con el tono de la marca, más revisión humana.
* **Reutilización automática**: un artículo se convierte en hilo, correo, guion y publicaciones.
* **Traducción automática** con revisión.
* **CMS “headless”** con API para apps y sitios externos.
* **Biblioteca de plantillas de contenido** por vertical (marketplace).
* **Recomendaciones de temas** a partir de preguntas reales de clientes (bandeja, bot y búsquedas).

### 7\. Fidelización: puntos, cupones, referidos y membresías

**Nivel 1: mínimo viable**

* **Cupones de descuento** (código, porcentaje o valor, vigencia).
* **Registro de clientes frecuentes** con historial de compras.
* **Membresías simples** (plan, precio, vigencia) y estado activo o vencido.

**Nivel 2: operativo**

* **Programa de puntos**: acumular por compra o visita y canjear por beneficios.
* **Referidos**: código o enlace único por cliente, con recompensa para ambos.
* **Membresías con cobro recurrente** y recordatorio de vencimiento.
* **Cupones por segmento** o por evento (cumpleaños, primera compra).
* **Tarjeta digital o QR de cliente** para identificarse en el local.

**Nivel 3: control**

* **Niveles o categorías** (básico, plata, oro) con beneficios distintos.
* **Reglas de canje y expiración**, con límites por cliente y por periodo.
* **Antifraude**: un cupón por cliente, detección de abuso en referidos.
* **Automatizaciones**: puntos por reseña, bono por reactivación o aviso de puntos por vencer.
* **Paquetes y bonos prepagados** (10 clases, 5 noches, saldo a favor).
* **Reportes**: costo del programa, tasa de recompra y clientes recuperados.
* **Contabilidad de pasivos**: puntos y saldos pendientes como obligación.

**Nivel 4: máximo**

* **Fidelización personalizada con IA** (beneficio según comportamiento y riesgo de abandono).
* **Gamificación**: retos, insignias y rachas.
* **Programas entre negocios** (alianzas: puntos canjeables en otro negocio de la plataforma).
* **Billetera digital** y tarjetas de regalo.
* **Suscripciones con pausa, cambio de plan y recuperación de cobros fallidos.**
* **Análisis de LTV y churn** por nivel y por canal.

### 8\. Generador de QR, enlaces cortos y formularios

**Nivel 1: mínimo viable**

* **QR** hacia el sitio, WhatsApp o una ubicación, descargable en PNG y PDF.
* **Enlaces cortos** con el dominio de la plataforma.
* **Formulario simple** (nombre, teléfono, mensaje) que crea el lead en el CRM.

**Nivel 2: operativo**

* **QR con marca** (logo y colores) y **QR dinámicos** que se pueden cambiar sin reimprimir.
* **Enlaces cortos con dominio propio** y UTM incluidos.
* **Constructor de formularios**: campos, validaciones, lógica simple y mensaje de confirmación.
* **Estadísticas por QR y enlace**: escaneos, clics, ciudad y dispositivo.
* **Página tipo “link in bio”** para Instagram y TikTok.

**Nivel 3: control**

* **Formularios multipaso** y con lógica condicional.
* **Carga de archivos, firma y pago** dentro del formulario.
* **Enrutamiento**: según la respuesta, asignar a un vendedor o abrir un flujo del bot.
* **Protección antispam** (captcha, límites) y consentimiento integrado.
* **QR por ubicación o mesa** (restaurante, habitación, punto de venta) con contexto.
* **Plantillas por vertical** (reserva, cotización de obra, inscripción al gimnasio, solicitud de tour).

**Nivel 4: máximo**

* **Formularios generados por IA** a partir de una descripción.
* **Enlaces inteligentes**: redirigen según dispositivo, idioma, país u hora.
* **QR con experiencias**: menú, check-in, reseña, pago o descarga de voucher.
* **Integración con firma electrónica y documentos** al enviar.
* **Testeo A/B de formularios** y análisis de abandono por campo.
* **API y webhooks** para que otros sistemas reciban cada envío.

### Integraciones de esta capa

| Área            | Integraciones típicas                                                   |
| --------------- | ----------------------------------------------------------------------- |
| Web y analítica | Google Analytics 4, Tag Manager, Search Console, Meta Pixel, Cloudflare |
| Correo          | Resend, SendGrid, Amazon SES, Mailgun (con SPF/DKIM/DMARC)              |
| WhatsApp        | WhatsApp Cloud API, 360dialog, Twilio                                   |
| Redes           | Meta Graph API (Instagram y Facebook), TikTok, LinkedIn, YouTube        |
| Anuncios        | Meta Marketing API y Conversions API, Google Ads API, TikTok Ads        |
| Google          | Business Profile API, Maps, Reviews                                     |
| Diseño          | Canva, bancos de imágenes (Unsplash, Pexels)                            |
| Pagos           | Wompi, PayU, Mercado Pago, Nequi (membresías y cobros recurrentes)      |
| IA              | Claude, OpenAI, generación de imágenes                                  |
| Interno         | CRM, reservas, cotizaciones, caja, bandeja omnicanal, bot               |

### Cosas críticas que se suelen olvidar

* **Atribución desde el día uno**: si no guardas UTM, origen y primer contacto en la ficha del CRM, después no hay forma de recuperar ese dato.
* **Reputación de envío**: un correo masivo mal hecho quema el dominio. Pide verificación SPF/DKIM/DMARC y limita el volumen al inicio.
* **WhatsApp marketing tiene reglas estrictas**: solo con opt-in, solo con plantillas aprobadas, y con riesgo de bloqueo del número si hay muchas denuncias.
* **Habeas data y consentimiento**: guarda cuándo y cómo aceptó cada contacto, y ofrece baja fácil. Es obligación legal en Colombia (Ley 1581).
* **Permisos de las plataformas**: Meta y Google exigen revisión de apps y permisos para publicar y gestionar anuncios. El proceso tarda semanas; empieza temprano.
* **Cookies y rastreo**: banner de consentimiento y configuración de píxeles según la normativa.
* **Tokens de redes**: expiran y se revocan. Necesitas reconexión guiada y alertas cuando una cuenta se desconecta.
* **Costos de IA y de envío**: ponle límites por plan a correos, WhatsApp y generación de contenido para no perder margen.
* **Dominios propios**: la verificación DNS es donde más se atascan los clientes; haz un asistente paso a paso.
* **Contenido duplicado y SEO**: páginas generadas en masa sin calidad pueden perjudicar el posicionamiento.

### Qué lanzaría primero

1. **Núcleo con origen y UTM** \+ **formularios, QR y enlaces cortos** (poco esfuerzo, alimentan el CRM desde el inicio).
2. **Sitio y landings con formulario al CRM y botón de WhatsApp** (ya lo tienes: refuerza bloques, dominio propio y píxeles).
3. **SEO básico + Google Business** (schema por vertical, reseñas y datos del negocio): alto valor para negocios locales.
4. **Email y WhatsApp con secuencias simples** (bienvenida, seguimiento de cotización y recordatorios).
5. **Fidelización básica**: cupones, referidos y membresías con cobro recurrente.
6. **Redes sociales**: calendario y programación, después métricas.
7. **Blog/CMS** con plantillas por vertical.
8. **Gestor de anuncios con atribución**: es el más complejo (permisos, APIs, conversiones) y conviene hacerlo cuando ya tengas datos de origen limpios.

\-------------------------------------------------------------------------------- 


### Capa III — Atención y Comunicación (fuente: Atención)

Esta capa es el **sistema nervioso** de la plataforma: todo lo que entra y sale hacia el cliente pasa por aquí y se registra en el CRM. Los seis componentes que me pasaste funcionan mejor como **una sola capa con un núcleo compartido** que como seis módulos aislados.

### Núcleo compartido (base de toda la capa)

Antes de los niveles, esto se construye una sola vez y lo usan todos los componentes:

* **Contacto unificado**: un cliente = una ficha, sin importar si escribió por WhatsApp, Instagram o correo.
* **Conversación / hilo** con mensajes, adjuntos, estado (abierta, pendiente, resuelta) y responsable.
* **Canales conectados por negocio** (multi-tenant): cada negocio conecta su propio WhatsApp, redes y correo.
* **Eventos al CRM y a la bitácora**: cada interacción queda en el historial del cliente.
* **Roles, equipos y horarios de atención.**
* **Cola de mensajes y webhooks** (para no perder mensajes entrantes).

### Nivel 1: Mínimo viable

**Bandeja**

* **WhatsApp** (API oficial de Meta o proveedor como 360dialog/Twilio) y **chat web** en una bandeja única.
* Responder, adjuntar archivos y notas internas.
* Asignación manual a un agente y estados de conversación.

**Chatbot**

* **Respuestas rápidas / plantillas** guardadas y mensaje de bienvenida y de fuera de horario.
* Menú de opciones simple (1\. Reservas, 2\. Precios, 3\. Hablar con alguien).

**Helpdesk**

* **Ticket manual** creado desde una conversación, con estado y prioridad.

**Telefonía y agenda**

* **Botón “llamar” y “WhatsApp”** desde la ficha del cliente, con registro manual de la llamada.
* Enlace a Google Meet o Zoom pegado en la cita.

**Encuestas y reseñas**

* **Enlace a Google Reviews** enviado manualmente después del servicio.

### Nivel 2: Operativo (uso diario de un equipo)

**Bandeja**

* **Instagram, Facebook Messenger y correo** conectados a la misma bandeja.
* Asignación automática (rotativa o por carga), etiquetas y búsqueda.
* **Respuestas guardadas con variables** ({nombre}, {servicio}, {fecha}).
* Vista del cliente al lado: historial, reservas, cotizaciones y pagos.
* **Plantillas aprobadas de WhatsApp** para escribir fuera de la ventana de 24 horas.
* Indicadores de leído, entregado y “escribiendo”.

**Chatbot**

* **Flujos configurables** (constructor visual simple): captura nombre, interés y fecha, y crea el lead en el CRM.
* **FAQ automáticas** por negocio y transferencia a humano con un clic.
* **Chatbot con IA básica** que responde con la información del negocio (precios, horarios, servicios).

**Helpdesk**

* **Tickets automáticos** desde conversaciones, formularios o correo.
* Categorías, prioridades, responsables y **SLA básico** (tiempo de primera respuesta y de resolución).
* Respuestas por correo o WhatsApp desde el mismo ticket.

**Telefonía y agenda**

* **Click-to-call** y registro automático de llamadas (duración, resultado).
* **Agenda con disponibilidad** y generación automática de enlace de Meet o Zoom.
* Recordatorios automáticos por WhatsApp y correo.

**Encuestas y reseñas**

* **Encuesta post-servicio automática** (CSAT de 1 a 5) y NPS.
* Solicitud automática de reseña en Google si la calificación es alta.

### Nivel 3: Control y gestión del equipo

**Bandeja**

* **Horarios, equipos y reglas de enrutamiento** (por canal, idioma, vertical o cliente VIP).
* **Notas internas, menciones (@) y traspaso** entre agentes.
* **Supervisión en vivo**: ver conversaciones activas y entrar a asistir.
* **Mensajes masivos y difusiones** con segmentos y plantillas (con control de opt-in).
* **Gestión de consentimiento** (habeas data / Ley 1581) y opción de darse de baja.
* **Métricas**: tiempo de primera respuesta, tiempo de resolución, volumen por canal y por agente.

**Chatbot**

* **IA con base de conocimiento (RAG)**: sube documentos, tarifas, políticas y la IA responde con eso.
* **Acciones del bot**: consultar disponibilidad, crear reserva, generar cotización y enviar link de pago.
* **Reglas de escalamiento**: pasa a humano si detecta enojo, palabra clave o falla repetida.
* **Registro de conversaciones del bot** para revisión y mejora.
* **Resumen automático** de la conversación para el agente.

**Helpdesk**

* **SLA por prioridad y plan**, con alertas antes de vencer y escalamiento automático.
* **Base de conocimiento / centro de ayuda** público y para agentes.
* **Fusionar tickets**, tareas internas y campos personalizados.
* **Motivos de reclamo** y análisis de causas.
* **Reportes**: tickets por categoría, cumplimiento de SLA y reincidencia.

**Telefonía y agenda**

* **Grabación de llamadas** con consentimiento y enlazada a la ficha.
* **Números por negocio**, buzón de voz e IVR simple.
* **Agenda por profesional o recurso**, con buffers, cancelación y reprogramación por el cliente.
* **Sincronización bidireccional** con Google Calendar y Outlook.

**Encuestas y reseñas**

* **Encuestas por evento** (check-out, fin de tour, cierre de ticket) con lógica condicional.
* **Alertas inmediatas** por calificación baja para recuperar al cliente.
* **Panel de reputación**: Google, Facebook y TripAdvisor en un solo lugar.
* **Responder reseñas** desde la plataforma.

### Nivel 4: Máximo (nivel empresarial)

**Bandeja**

* **Más canales**: Telegram, TikTok, SMS, Google Business Messages, Apple Messages y apps propias.
* **Detección de idioma y traducción automática** (clave en turismo y hoteles).
* **Priorización con IA**: urgencia, sentimiento e intención de compra.
* **Sugerencias de respuesta (copiloto IA)** para el agente, con tono configurable.
* **Anti-spam y control de calidad**: auditoría de conversaciones con puntaje.
* **Multi-marca**: varias marcas o sedes con configuraciones independientes.

**Chatbot**

* **Agentes IA autónomos** que resuelven de principio a fin: reservan, cobran, reprograman y hacen seguimiento.
* **Voz con IA**: asistente telefónico que contesta llamadas.
* **Memoria del cliente**: el bot conoce el historial y personaliza.
* **Campañas conversacionales**: reactivación, upsell y recordatorios con IA.
* **Evaluación y entrenamiento continuo**: pruebas, métricas de resolución y “feedback” del agente humano.
* **Guardarraíles**: límites de lo que la IA puede prometer, descontar o cobrar.

**Helpdesk**

* **Portal de autoservicio** del cliente con historial de tickets.
* **Clasificación y enrutamiento automático con IA** y detección de duplicados.
* **Flujos de aprobación** (reembolsos, compensaciones).
* **Gestión de incidentes masivos** (una falla que afecta a muchos clientes).
* **SLA contractuales por cliente** y reportes de cumplimiento.

**Telefonía y agenda**

* **Call center completo**: colas, distribución, supervisión, whisper y barge-in.
* **Transcripción y análisis de llamadas con IA** (resumen, sentimiento, compromisos).
* **Videollamada propia embebida** (sin salir de la plataforma) y sala de espera.
* **Agenda con pago anticipado, depósitos y lista de espera.**
* **Eventos y webinars** con registro y seguimiento.

**Encuestas y reseñas**

* **NPS relacional y transaccional** con tendencias por sede, agente y servicio.
* **Análisis de sentimiento y temas** en reseñas y comentarios (qué se quejan más).
* **Respuestas a reseñas con IA** aprobadas por un humano.
* **Programa de referidos** a partir de promotores (NPS 9-10).
* **Cierre del ciclo**: la queja genera ticket, tarea y seguimiento hasta resolverse.

### Integraciones de esta capa

| Área           | Integraciones típicas                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| Mensajería     | WhatsApp Cloud API (Meta), 360dialog, Twilio, Instagram y Messenger (Meta), Telegram |
| Correo         | Gmail, Outlook, IMAP/SMTP, SendGrid, Resend                                          |
| Voz            | Twilio, Telnyx, Zadarma, SIP trunk, proveedores locales colombianos                  |
| Video y agenda | Google Calendar, Meet, Zoom, Microsoft Teams, Calendly                               |
| IA             | Claude, OpenAI, speech-to-text y text-to-speech                                      |
| Reseñas        | Google Business Profile API, Facebook, TripAdvisor                                   |
| Interno        | CRM, reservas, cotizaciones, pagos, caja, facturación                                |

### Cosas críticas que se suelen olvidar

* **WhatsApp no es gratis ni libre**: tiene ventana de 24 horas, plantillas aprobadas por Meta, límites de envío y costo por conversación. Define quién lo asume (tú o el negocio).
* **Aprobación de Meta y verificación del negocio**: el onboarding de cada cliente tarda; conviene un flujo guiado (Embedded Signup).
* **Consentimiento y habeas data**: guardar el opt-in, permitir la baja y avisar de la grabación de llamadas.
* **Costos de IA**: ponle límites de uso por plan para que un bot muy activo no te quiebre el margen.
* **Fiabilidad**: cola de mensajes, reintentos y registro de webhooks. Perder un mensaje de un cliente es peor que no tener bot.
* **Seguridad de los tokens** de cada canal (cifrados, por negocio).

### Qué lanzaría primero

1. **Núcleo + bandeja de WhatsApp y chat web** (Nivel 1 completo).
2. **Plantillas, asignación y vista del cliente en el CRM** (Nivel 2 de bandeja).
3. **Chatbot con IA y base de conocimiento** que cree leads y reservas (lo que más vende hoy).
4. **Recordatorios de agenda y encuesta post-servicio con reseña en Google** (poco esfuerzo y mucho valor percibido).
5. **Tickets con SLA** y después Instagram, Facebook y correo.
6. **Telefonía y call center** al final: es lo más costoso y el que menos piden los negocios pequeños.

\-------------------------------------------------------------------------------- 


### Capa IV — Gestión Comercial y Relación con Clientes (fuente: CRM)

Esta capa es el **centro de gravedad comercial** de la plataforma. Casi todas las demás capas leen o escriben aquí: la bandeja omnicanal crea conversaciones, marketing aporta el origen del lead, ventas y pagos cierran la venta, y el módulo de obra o reservas ejecuta lo vendido. Por eso su valor depende de una idea: **una persona = una ficha, con todo su historial**. Si el CRM queda como una libreta de contactos aislada, pierde casi todo su sentido.

### Núcleo compartido (base de toda la capa)

Se construye una sola vez y lo usan todos los componentes:

* **Contacto único (tercero) con roles**: la misma persona puede ser lead, cliente, proveedor o empleado sin duplicarse. Lo comparte toda la plataforma.
* **Línea de tiempo de eventos**: cada mensaje, llamada, cotización, pago, reserva, ticket y cambio de etapa se guarda como evento con fecha, canal y responsable.
* **Origen y atribución**: fuente, medio, campaña, UTM y primer contacto guardados desde el día uno. Esto no se puede reconstruir después.
* **Campos personalizados por negocio y por vertical**, sin tocar el código (tipo de tour, membresía, tipo de obra).
* **Etiquetas, estados y listas** compartidos con marketing y comunicación.
* **Motor de tareas y de automatizaciones** de la capa de Operación.
* **Permisos por registro y por equipo** de la capa de seguridad, y **bitácora global**.
* **Consentimiento y preferencias de contacto** por canal, guardados en la ficha.
* **Aislamiento multi-negocio** estricto.

### 1\. Contactos, empresas y ficha 360

**Nivel 1: mínimo viable**

* **Base de contactos**: nombre, teléfono, correo, ciudad y origen del contacto.
* **Empresas / clientes** vinculados a sus contactos.
* **Notas e historial** por cliente.
* **Etiquetas y estados**: nuevo, interesado, cliente, perdido.
* **Búsqueda y filtros.**
* **Importar y exportar** desde Excel o CSV.

**Nivel 2: operativo**

* **Detección de duplicados** al crear o importar (mismo teléfono, correo o documento) y **fusión de fichas** sin perder historial.
* **Campos personalizados** según la vertical.
* **Importador con vista previa**: mapeo de columnas, validación de teléfonos y correos, y reporte de errores antes de guardar.
* **Normalización automática**: teléfonos con indicativo, nombres con mayúsculas correctas, ciudades estandarizadas.
* **Varios contactos por empresa** con rol (decisor, contacto técnico, facturación).
* **Vistas guardadas** (mis leads de hoy, clientes de Cartagena, VIP).
* **Adjuntos** en la ficha (documentos, fotos, cédula, contratos).

**Nivel 3: control**

* **Historial unificado**: conversaciones, cotizaciones, pagos, reservas, tickets y tareas en una sola ficha, en orden cronológico.
* **Relaciones entre contactos** (familia, grupo de viaje, empresa, referido por).
* **Propietario del contacto** y reglas de visibilidad por equipo o sede.
* **Calidad de datos**: puntaje de completitud, alertas de datos faltantes y limpieza periódica.
* **Control de exportaciones**: permiso aparte, registro de quién exportó qué y límites por rol.
* **Fusión masiva y reglas de deduplicación** configurables.
* **Enriquecimiento manual asistido**: sugerir datos faltantes desde otros módulos (una reserva trae el documento, un pago trae la facturación).

**Nivel 4: máximo**

* **Customer 360 completo**: ficha con valor de vida, productos usados, preferencias, riesgo de abandono, satisfacción, comportamiento web y próximas acciones.
* **Enriquecimiento automático** desde fuentes públicas o proveedores de datos (con consentimiento y cuidado legal).
* **Jerarquías de cuentas** (grupo empresarial, sedes, agencias con muchos clientes).
* **Resolución de identidad entre canales**: reconocer que el WhatsApp y el correo son la misma persona.
* **Memoria del cliente para la IA**: preferencias y contexto que usa el bot y el asistente.
* **Gestión de datos maestros** entre varios negocios del mismo grupo, con reglas de qué se comparte y qué no.

### 2\. Captación de leads y asignación

**Nivel 1: mínimo viable**

* **Alta manual** de leads con origen.
* **Formulario web simple** que crea el contacto en el CRM.
* **Notificación** al responsable cuando entra un lead nuevo.

**Nivel 2: operativo**

* **Captación desde formularios web, landing pages, WhatsApp y redes sociales** (Instagram, Facebook, anuncios de clic a WhatsApp).
* **Asignación de responsables**: manual, por rotación (round-robin) o por reglas (ciudad, producto, idioma).
* **Origen y UTM automáticos** en cada lead.
* **Respuesta automática inmediata** (“recibimos tu solicitud”) por WhatsApp o correo.
* **Alerta de lead sin atender** pasado un tiempo (por ejemplo, 15 minutos).
* **Formularios por vertical** (cotización de obra, reserva de tour, inscripción al gimnasio).

**Nivel 3: control**

* **Reglas de enrutamiento avanzadas**: por carga de trabajo, por disponibilidad, por especialidad o por cliente VIP.
* **Tiempo de primera respuesta** medido y con SLA por equipo.
* **Reasignación automática** si el responsable no responde a tiempo.
* **Calificación inicial** (preguntas del formulario o del bot) para separar curiosos de compradores.
* **Control de leads duplicados** y de leads recurrentes (misma persona que vuelve a escribir).
* **Importación de listas y de leads de anuncios** (Meta Lead Ads, Google) con trazabilidad.
* **Reportes de captación** por canal, campaña y formulario.

**Nivel 4: máximo**

* **Lead scoring automático** según perfil y comportamiento (visitó precios, abrió la cotización, respondió rápido).
* **Calificación conversacional con IA** por WhatsApp que filtra, pregunta y agenda.
* **Enrutamiento predictivo**: asigna al vendedor con mayor probabilidad de cerrar ese tipo de lead.
* **Integración con portales y marketplaces** (inmobiliarios, de turismo, de construcción) para recibir leads de terceros.
* **Atribución multicanal completa** conectada con anuncios y con ingresos reales.
* **Captación por QR, eventos y ferias** con carga rápida desde el celular.

### 3\. Pipeline, oportunidades y cotizaciones

**Nivel 1: mínimo viable**

* **Estados simples** del contacto (nuevo, interesado, cliente, perdido).
* **Lista de contactos por estado.**

**Nivel 2: operativo**

* **Pipeline de ventas (embudo)** con etapas personalizables y **vista Kanban** con arrastrar y soltar.
* **Oportunidades / negocios** con valor, probabilidad y fecha estimada de cierre.
* **Varios pipelines** por tipo de venta (turismo, membresías, obra).
* **Cotizaciones generadas desde la oportunidad**, con productos, descuentos, impuestos y PDF con la marca del negocio.
* **Motivo de pérdida** obligatorio al marcar una oportunidad como perdida.
* **Totales por etapa** (cuánto dinero hay en cada columna).

**Nivel 3: control**

* **Reglas por etapa**: campos obligatorios para avanzar (no pasa a “negociación” sin cotización enviada).
* **Aprobación de descuentos** según porcentaje y rol.
* **Versiones de cotización** con comparación y seguimiento (enviada, vista, aceptada, vencida).
* **Aceptación en línea** de la cotización con firma electrónica y, si aplica, anticipo con link de pago.
* **Oportunidad ganada que dispara acciones**: crea la reserva, el proyecto de obra, el contrato, la factura o el cobro.
* **Tiempo en cada etapa** y alertas de oportunidades estancadas.
* **Productos y servicios con catálogo y listas de precios** compartidos con ventas y ERP.
* **Oportunidades con varios participantes** (quien capta, quien cierra) para comisiones compartidas.

**Nivel 4: máximo**

* **Pronóstico de ventas (forecast)** por periodo, equipo y probabilidad, con escenarios (conservador, esperado, optimista).
* **Probabilidad calculada por IA** según el historial, y alertas de oportunidades en riesgo.
* **Cotizaciones configurables (CPQ)**: reglas de precio, paquetes, dependencias entre productos y propuestas generadas automáticamente.
* **Propuestas interactivas** en página web con seguimiento de lectura y firma.
* **Planificación de cuentas clave** (planes de cuenta, mapa de decisores y seguimiento a largo plazo).
* **Gestión de renovaciones** (membresías, contratos de servicio, mantenimientos) con oportunidades creadas automáticamente.
* **Integración con presupuestos de obra**: la cotización nace del presupuesto aprobado.

### 4\. Actividades, tareas, calendario y comunicación

**Nivel 1: mínimo viable**

* **Tareas y recordatorios** de seguimiento ligados al cliente.
* **Notas** por contacto.
* **Lista de “qué hago hoy”** con tareas vencidas y del día.

**Nivel 2: operativo**

* **Actividades registradas**: llamadas, reuniones, visitas, correos y mensajes, con resultado.
* **Calendario integrado** con recordatorios y sincronización con Google Calendar.
* **Plantillas de mensajes** para WhatsApp y correo con variables ({nombre}, {servicio}, {fecha}).
* **Botones de contacto directo** (llamar, WhatsApp, correo) desde la ficha, con registro automático.
* **Tareas recurrentes** y recordatorios por WhatsApp al vendedor.
* **Agendar reunión o visita** y enviar invitación con enlace de videollamada.

**Nivel 3: control**

* **Conversaciones de WhatsApp, correo y llamadas** guardadas automáticamente en la ficha (desde la bandeja omnicanal).
* **Registro de llamadas** con duración y resultado (y grabación si hay consentimiento).
* **Plantillas aprobadas y compartidas** por equipo, con control de cuáles puede usar cada rol.
* **Cola de seguimiento priorizada**: a quién contactar primero según etapa, valor y última interacción.
* **Reglas de cadencia**: máximo de intentos, intervalos y horarios permitidos de contacto.
* **Visitas y desplazamientos** (obra, ventas en terreno) con geolocalización y registro de resultado.
* **Reportes de actividad**: contactos hechos, reuniones, tareas vencidas y cumplimiento por vendedor.

**Nivel 4: máximo**

* **Copiloto de ventas con IA**: resume conversaciones, sugiere la siguiente mejor acción y redacta la respuesta con el tono del negocio.
* **Transcripción y resumen de llamadas y reuniones** con compromisos extraídos como tareas.
* **Agenda inteligente**: propone horarios, detecta conflictos y reprograma.
* **Telefonía integrada (VoIP)** con marcación desde el CRM, grabación y análisis de llamadas.
* **Coaching de ventas**: análisis de conversaciones para identificar objeciones y buenas prácticas del equipo.
* **Asistente por voz o WhatsApp** para el vendedor en campo (“registra que hablé con Pedro, quiere cotización para el viernes”).

### 5\. Automatizaciones y secuencias de seguimiento

**Nivel 1: mínimo viable**

* **Recordatorios manuales** de seguimiento.
* **Avisos** al responsable cuando entra un lead.

**Nivel 2: operativo**

* **Reglas simples “si pasa X, haz Y”**: lead nuevo, enviar WhatsApp de bienvenida y crear tarea; sin respuesta en 3 días, crear tarea de seguimiento.
* **Plantillas de automatización listas** por vertical.
* **Cambios de estado automáticos** (cotización aceptada, pasa a ganado).
* **Notificaciones** a equipo y supervisor por eventos clave.

**Nivel 3: control**

* **Secuencias de seguimiento por correo o WhatsApp**: serie de mensajes con esperas, que se detiene si el cliente responde o compra.
* **Constructor visual de flujos** con condiciones, ramas, esperas y acciones (crear tarea, mover etapa, enviar mensaje, asignar, etiquetar, llamar a un webhook).
* **Disparadores de todos los módulos**: pago recibido, reserva creada, ticket abierto, cita cancelada.
* **Aprobaciones humanas** dentro de un flujo (un descuento grande pide aprobación y el flujo sigue).
* **Límites y protecciones**: máximo de mensajes por contacto y por día, horarios permitidos, respeto de bajas y consentimientos.
* **Historial de ejecuciones** con errores, y modo de prueba antes de activar.
* **Métricas**: respuestas por secuencia, conversiones y bajas.

**Nivel 4: máximo**

* **Marketing automation completo**: campañas, embudos de varios pasos, segmentos dinámicos y **pruebas A/B**.
* **Agentes de IA** que ejecutan seguimientos completos (reactivar cotizaciones, confirmar visitas, recuperar leads fríos) con guardarraíles y supervisión.
* **Reactivación inteligente** de clientes inactivos, con mensaje y momento según su historial.
* **Orquestación entre capas**: una oportunidad ganada crea el proyecto, abre la caja de obra, programa la capacitación y avisa a compras.
* **Optimización automática** de horarios, canales y mensajes según resultados.
* **Biblioteca de flujos por vertical** (marketplace) instalables en un clic.

### 6\. Equipo comercial: roles, metas, comisiones y reportes

**Nivel 1: mínimo viable**

* **Responsable asignado** a cada contacto.
* **Lista de contactos por vendedor.**
* **Exportar** el listado a Excel.

**Nivel 2: operativo**

* **Roles básicos**: vendedor, supervisor y administrador.
* **Visibilidad**: el vendedor ve lo suyo y el administrador ve todo.
* **Metas mensuales por vendedor** y avance visible.
* **Reportes simples**: ventas del mes, leads nuevos y oportunidades abiertas por vendedor.
* **Comisión básica** (porcentaje sobre ventas cerradas).

**Nivel 3: control**

* **Roles y permisos finos** con visibilidad por equipo, sede y pipeline (el supervisor ve a su equipo, no a toda la empresa).
* **Metas y comisiones por vendedor** con esquemas (escalonados, por producto, por meta alcanzada) y **comisión que se causa solo cuando el cliente paga**.
* **Reportes comerciales**: conversión por etapa, motivos de pérdida, tiempo de cierre, ticket promedio y rendimiento por vendedor.
* **Tableros por rol**: vendedor (mi día, mis metas), supervisor (mi equipo), gerente (embudo y forecast).
* **Liquidación de comisiones** con aprobación y envío a nómina (conectado con la capa de Personas).
* **Transparencia**: cada vendedor ve cómo se calculó su comisión.
* **Control de exportaciones y de acceso a datos sensibles** del cliente.

**Nivel 4: máximo**

* **Gestión de territorios y cuentas** (reparto por zona, producto o segmento) con reasignación masiva.
* **Esquemas complejos de compensación**: aceleradores, bonos por equipo, reparto entre varios participantes y recuperación de comisiones por cancelaciones (clawback).
* **Análisis de desempeño con IA**: qué hacen distinto los mejores vendedores, riesgo de rotación y recomendaciones de coaching.
* **Competencias y capacitación comercial** conectadas con el LMS.
* **Canales externos**: agencias, afiliados y revendedores con su propio acceso, sus leads y su liquidación.
* **Comparativos entre sedes y negocios del grupo.**

### 7\. Postventa, segmentación, fidelización y portal del cliente

**Nivel 1: mínimo viable**

* **Marcar clientes** y filtrar por estado.
* **Notas de postventa** en la ficha.

**Nivel 2: operativo**

* **Segmentación básica** por etiquetas, ciudad, producto y última compra.
* **Listas para campañas** exportables o sincronizadas con WhatsApp y correo.
* **Tickets y reclamos** creados desde la ficha, con estado y responsable.
* **Encuesta de satisfacción** simple después de la compra o del servicio.
* **Recordatorios de renovación** (membresía, mantenimiento, contrato).

**Nivel 3: control**

* **Listas dinámicas** que se actualizan solas (“clientes sin comprar hace 90 días”, “cotizaciones sin respuesta”, “VIP”).
* **Postventa con SLA**: tickets, reclamos, categorías, responsables y reportes (conectado con el helpdesk).
* **NPS y CSAT** con seguimiento: una calificación baja abre una tarea de recuperación.
* **Segmentación RFM** (recencia, frecuencia y valor) y grupos de acción.
* **Cumpleaños, aniversarios y fechas clave** con mensajes automáticos.
* **Análisis de causas de reclamos** y de bajas.
* **Referidos básicos** con código y recompensa.

**Nivel 4: máximo**

* **Programa de fidelización**: puntos, niveles, cupones, recompra y reactivación de clientes inactivos, integrado con la capa de marketing.
* **Portal del cliente** para ver cotizaciones, pagos, reservas, facturas, documentos y tickets, con acceso por enlace o WhatsApp.
* **Autoservicio**: aceptar cotizaciones, pagar, reprogramar, descargar facturas y abrir solicitudes.
* **Detección de riesgo de abandono** y acciones de retención.
* **Venta cruzada y adicional (cross-sell y upsell)** sugerida por IA según el historial.
* **Gestión de cuentas post-venta** (éxito del cliente) con planes, salud de la cuenta y alertas.
* **Comunidad y clubes de clientes** (membresías, beneficios, eventos).

### 8\. IA, scoring, pronóstico y analítica

**Nivel 1: mínimo viable**

* **Contadores simples**: contactos por estado, leads del mes y clientes nuevos.
* **Resumen manual** de una cuenta o de una conversación.

**Nivel 2: operativo**

* **Embudo de conversión** por etapa y por origen.
* **Valor del pipeline** (total en juego) y ventas ganadas por periodo.
* **Resúmenes automáticos** de conversaciones con IA guardados en la ficha.
* **Respuestas sugeridas** para el vendedor.
* **Pregunta en lenguaje natural** sobre los datos (“¿qué oportunidades cierran este mes?”).

**Nivel 3: control**

* **Reportes comerciales completos**: conversión, tiempo de cierre, motivos de pérdida, rendimiento por vendedor, origen y producto.
* **Analítica de clientes**: valor de vida (LTV), costo de adquisición (CAC) por canal, retención y rentabilidad por canal (conectado con la capa de datos).
* **Cohortes** de clientes por mes de captación y por campaña.
* **Siguiente mejor acción** sugerida por la IA según la etapa, el historial y la última interacción.
* **Alertas**: oportunidades estancadas, clientes en riesgo, leads sin atender y metas en peligro.
* **Resumen diario proactivo** para cada vendedor y para el gerente.

**Nivel 4: máximo**

* **Lead scoring con modelos** (perfil, comportamiento y probabilidad de compra) y reentrenamiento con los resultados reales.
* **Forecast con IA** por equipo, producto y escenario, y detección de oportunidades con probabilidad inflada.
* **LTV y abandono predictivos** por cliente.
* **Atribución avanzada** e incrementalidad: qué canal genera ventas que no habrían ocurrido solas.
* **Agentes de ventas autónomos** (calificar, seguir, agendar, cotizar con límites, cobrar) con supervisión humana.
* **Análisis de conversaciones a escala**: objeciones frecuentes, competidores mencionados, razones de pérdida y oportunidades de producto.
* **Benchmarks anónimos** entre negocios de la misma vertical.
* **Evaluación continua de la IA**: calidad de las sugerencias, aceptación por vendedores y errores.

### 9\. Cumplimiento, auditoría, integraciones y plantillas por vertical

**Nivel 1: mínimo viable**

* **Casilla de autorización** de tratamiento de datos en formularios, sin premarcar.
* **Registro de quién creó o editó** cada contacto.
* **Importación y exportación** con cuidado de a quién se le da acceso.

**Nivel 2: operativo**

* **Registro de consentimiento** (fecha, canal, texto aceptado) en la ficha y **baja fácil** respetada en todos los canales.
* **Aviso de privacidad y política de datos** por negocio.
* **Historial de cambios** por contacto (valor anterior y nuevo).
* **Integraciones esenciales**: WhatsApp, Google Calendar, correo, formularios web y la capa de ventas y pagos.
* **Plantillas por vertical** al activar el CRM (pipeline, campos y mensajes iniciales).

**Nivel 3: control**

* **Gestión completa de habeas data (Ley 1581)**: atención de consultas, correcciones y supresiones con plazos y evidencia, y registro de quién accedió a los datos de una persona.
* **Bitácora de auditoría** y **control de exportaciones** (quién exportó qué, cuándo y con qué filtros).
* **Retención y eliminación automática** de leads inactivos y de datos sin finalidad vigente.
* **Reglas de contacto comercial** (horarios y frecuencia permitidos) aplicadas a campañas y a cobranza, y respeto de las listas de exclusión.
* **Integraciones con facturación electrónica, contabilidad y pasarelas de pago**, de modo que la oportunidad ganada fluye hasta la factura y el cobro.
* **Webhooks y API** con llaves por negocio y permisos.
* **Configuración independiente por negocio y por sede** (pipelines, campos, plantillas, equipos).

**Nivel 4: máximo**

* **API completa, webhooks firmados y marketplace de conectores** (Zapier, Make, n8n, y conectores propios y de terceros).
* **Integraciones empresariales**: Meta Ads y Google Ads (audiencias y conversiones), telefonía VoIP, firma electrónica, Siigo, Alegra, World Office y portales de leads.
* **Multi-negocio y multi-marca** con datos compartidos o aislados según reglas, y vista consolidada para el dueño del grupo.
* **Gobernanza de datos e IA**: qué datos pueden usar los modelos, trazabilidad de las decisiones automatizadas y revisión humana.
* **Plantillas avanzadas por vertical**, con pipelines, campos, automatizaciones, mensajes y reportes completos:
  * **Turismo y guías**: consulta, cotización, anticipo, voucher, itinerario, postventa y reseña.
  * **Hotel y posada**: consulta, reserva directa, pre-llegada, estancia, post-estancia y reactivación.
  * **Gimnasio**: prospecto, clase de prueba, inscripción, renovación y recuperación de inactivos.
  * **Construcción**: contacto, visita técnica, presupuesto, negociación, contrato, obra, entrega y postventa o garantía.
* **Certificaciones y cumplimiento** para clientes grandes (ISO 27001, SOC 2) y reportes de cumplimiento automáticos.

### Integraciones de esta capa

| Área           | Integraciones típicas                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Mensajería     | WhatsApp Cloud API, Instagram y Messenger (Meta), correo (Gmail, Outlook, IMAP)                                 |
| Captación      | Formularios y landing propios, Meta Lead Ads, Google Ads, QR y enlaces cortos                                   |
| Agenda y video | Google Calendar, Outlook, Meet, Zoom, Calendly                                                                  |
| Telefonía      | Twilio, Telnyx, Zadarma, SIP trunk y proveedores colombianos (VoIP con grabación)                               |
| Ventas y pagos | Wompi, PayU, Mercado Pago, Nequi, facturación electrónica DIAN vía proveedor tecnológico                        |
| Contabilidad   | Siigo, Alegra, World Office                                                                                     |
| Firma          | Firma electrónica propia con evidencia, Certicámara, Olimpia                                                    |
| IA             | Claude, OpenAI, transcripción de voz a texto                                                                    |
| Automatización | Webhooks, Zapier, Make, n8n, API propia                                                                         |
| Datos          | Réplica de lectura o almacén analítico, Looker Studio, Metabase                                                 |
| Interno        | Bandeja omnicanal, marketing, reservas, obra y presupuestos, caja menor, ERP, helpdesk, personas, capa de datos |

### Cosas críticas que se suelen olvidar

* **Un solo contacto para toda la plataforma**: si el CRM tiene su propia tabla de personas y el ERP, las reservas y la nómina tienen otras, nunca habrá una ficha 360\. Define el tercero único desde el inicio.
* **Origen y atribución desde el día uno**: lo que no se guarda en el primer contacto (canal, campaña, UTM) no se puede recuperar. Es la base del CAC y de la rentabilidad por canal.
* **Duplicados destruyen la confianza**: la misma persona con tres fichas hace que el vendedor la contacte dos veces y que las métricas mientan. Detecta duplicados al crear, al importar y al llegar mensajes por WhatsApp.
* **Calidad de datos antes que funciones**: un CRM con teléfonos mal escritos y ciudades inconsistentes no sirve para automatizar. Normaliza al entrar y valida las importaciones.
* **El CRM solo funciona si el equipo lo usa**: pide pocos campos obligatorios, haz que registrar una actividad tome segundos, y que el WhatsApp y las llamadas se guarden solos. La adopción pesa más que cualquier función.
* **WhatsApp tiene reglas propias**: ventana de 24 horas, plantillas aprobadas, riesgo de bloqueo del número por denuncias y costo por conversación. Una secuencia agresiva puede quemar el canal del cliente.
* **Habeas data en cada paso**: consentimiento registrado, finalidad clara, baja fácil y respeto de los horarios de contacto (la Ley 2300 de 2023 regula contactos de cobranza y comerciales). Consulta a un abogado de datos personales.
* **Exportaciones son la fuga más común**: un vendedor que se va con la base de clientes es un riesgo real. Haz de exportar un permiso aparte, límitalo, regístralo y avisa al administrador.
* **Visibilidad por equipo, no solo por rol**: decide desde el inicio si los vendedores ven los clientes de otros. Cambiarlo después es complicado y genera conflictos.
* **Comisiones disputadas**: la principal fuente de conflicto con el equipo comercial. Reglas escritas, cálculo transparente, causación al cobrar y aprobación antes de pagar.
* **Pipelines con demasiadas etapas**: entre 5 y 7 etapas bien definidas funcionan mejor que 15 que nadie actualiza. Pon criterios claros de entrada a cada etapa.
* **Motivos de pérdida obligatorios**: sin ellos, el equipo no aprende nada de lo que pierde. Haz que sea una lista corta de opciones, no texto libre.
* **Forecast con pocos datos engaña**: con 30 oportunidades al año no hay modelo que valga. Muestra tendencias simples y deja la predicción para cuando haya volumen.
* **La IA puede inventar**: que resuma y sugiera, pero que no prometa precios, fechas ni condiciones sin una regla o una aprobación. Muestra siempre de dónde sacó el dato y limita lo que puede enviar sola.
* **Integración con las otras capas**: si una oportunidad ganada no crea sola la reserva, el proyecto o la factura, el equipo duplica trabajo y los datos se desfasan. Ese puente es lo que justifica una plataforma frente a herramientas sueltas.
* **Vertical primero**: un CRM genérico se siente vacío. Un pipeline de turismo con consulta, cotización, anticipo y voucher, o uno de construcción con visita técnica y presupuesto, se siente hecho para el cliente desde el primer día.
* **Costos de mensajería, IA y telefonía**: mídelos por negocio y ponles límites por plan.

### Qué lanzaría primero

1. **Núcleo: contacto único, línea de tiempo de eventos, origen y UTM, campos personalizados y consentimiento.**
2. **Nivel 1 completo** con importador con vista previa y detección de duplicados.
3. **Pipeline Kanban con oportunidades y motivos de pérdida**, más **cotizaciones desde la oportunidad** (lo que mejor se percibe en negocios pequeños).
4. **Captación desde formularios, landing y WhatsApp**, con asignación rotativa y alerta de lead sin atender.
5. **Tareas, recordatorios y calendario**, con botones de WhatsApp y llamada que registran la actividad solos.
6. **Plantillas de mensajes y primeras automatizaciones** (bienvenida, seguimiento a los 3 días, recordatorio de cotización).
7. **Roles, visibilidad por equipo, metas y comisiones** causadas al cobrar.
8. **Historial unificado** con reservas, pagos y tickets, y **postventa con NPS**.
9. **Reportes comerciales, bitácora y control de exportaciones**, con habeas data completo.
10. **Secuencias, lead scoring, forecast, portal del cliente, VoIP y agentes de IA**, cuando haya volumen de datos y clientes que lo pidan.

Para tu mercado (**guías, posadas, gimnasios y constructoras**), lo que más valor percibido da es: **pipeline Kanban, seguimiento por WhatsApp, cotización con anticipo en un clic y recordatorios automáticos**. El scoring con IA, el forecast y el marketing automation completo funcionan mejor como **plan superior**.

\-------------------------------------------------------------------------------- 


### Capa V — Ventas Digitales, Comercio y Pagos (fuente: Ventas)

Esta capa es **donde entra el dinero**. Aquí los errores cuestan plata real (cobros duplicados, sobreventas, facturas mal emitidas), así que la prioridad es la **fiabilidad y la trazabilidad**, más que la cantidad de funciones.

### Núcleo compartido (base de toda la capa)

Se construye una sola vez y lo usan los siete componentes:

* **Orden unificada**: una misma estructura para una compra de tienda, una reserva, una venta de POS o una cuota de membresía (cliente, ítems, impuestos, descuentos, estado, canal de origen).
* **Catálogo unificado**: producto, servicio, tour, habitación, plan o membresía comparten tabla base, con variantes, precios y disponibilidad.
* **Libro de pagos (ledger)**: cada intento, cobro, reembolso, comisión y contracargo queda registrado, sin borrar nada.
* **Credenciales de pasarela por negocio** (multi-tenant), cifradas.
* **Webhooks idempotentes**: si la pasarela avisa dos veces, se procesa una sola.
* **Impuestos y retenciones** configurables (IVA, impoconsumo, retenciones, ICA).
* **Conciliación**: cruzar lo que dice la pasarela con lo que dice el sistema y con el banco.
* **Conexión con CRM, caja, inventario, finanzas y facturación**: cada venta genera su cliente, su movimiento contable y su documento.
* **Bitácora de auditoría** de cualquier cambio de precio, reembolso o anulación.

### 1\. E-commerce / tienda online

**Nivel 1: mínimo viable**

* Catálogo con fotos, descripción, precio y categoría.
* Carrito y checkout con datos del cliente.
* Pago por link o por transferencia con confirmación manual.
* Pedido que llega por correo y WhatsApp al negocio.

**Nivel 2: operativo**

* **Variantes** (talla, color), stock por producto y alerta de agotado.
* **Checkout con pasarela integrada** y confirmación automática del pago.
* **Costos de envío** por ciudad o zona, retiro en tienda y seguimiento básico.
* **Cupones** y descuentos.
* **Estados del pedido** (pagado, preparando, enviado, entregado) con avisos por WhatsApp.
* Carrito abandonado: recordatorio automático.
* **Tienda dentro del sitio del negocio** (bloque del constructor) y catálogo por WhatsApp.

**Nivel 3: control**

* **Inventario multi-bodega** sincronizado con el ERP y reservas de stock durante el pago.
* **Transportadoras integradas** (Servientrega, Coordinadora, Envía, Interrapidísimo): cotizar, generar guía y rastrear.
* **Devoluciones y garantías** con flujo de aprobación.
* **Reglas de precio**: por cliente, por volumen y por temporada.
* **Roles y permisos** (quién cambia precios o reembolsa).
* Reportes: ventas por producto, margen, conversión y abandono.

**Nivel 4: máximo**

* **Multi-tienda y multi-moneda**, con dominio propio por tienda.
* **Sincronización con marketplaces** (Mercado Libre, Amazon, Shopify, Instagram/Facebook Shop).
* **Recomendaciones y upsell con IA**, y búsqueda inteligente.
* **Suscripciones de producto** (recompra mensual) y preventas.
* **Dropshipping y proveedores** con inventario de terceros.
* **Antifraude** y verificación de pedidos de riesgo.
* **Portal del cliente** con historial, facturas y recompra en un clic.

### 2\. Pasarelas de pago (Wompi, PayU, Mercado Pago, Nequi, PSE)

**Nivel 1: mínimo viable**

* **Una pasarela (Wompi o la que elijas) conectada** con las llaves del negocio.
* Pago con tarjeta, PSE y Nequi desde un checkout alojado por la pasarela.
* Confirmación de pago por webhook y estado visible en la orden.

**Nivel 2: operativo**

* **Varias pasarelas**, y el negocio elige la suya y configura sus llaves con un asistente.
* **Métodos locales completos**: tarjeta, PSE, Nequi, botón Bancolombia, efectivo (Efecty, Baloto) y transferencias por QR.
* **Reembolsos totales y parciales** desde la plataforma.
* **Pagos parciales y depósitos** (anticipo del 30 %, saldo después).
* **Conciliación diaria** con reporte de diferencias.
* Cuotas y pagos en moneda extranjera según la pasarela.

**Nivel 3: control**

* **Enrutamiento entre pasarelas**: si una falla, ofrecer otra; elegir la de menor comisión.
* **Registro de comisiones** de cada pasarela y neto real recibido.
* **Gestión de contracargos** (disputas) con evidencia adjunta.
* **Reintentos de cobros fallidos** y avisos al cliente.
* **Pagos divididos** (split): una parte al negocio, otra a un guía, proveedor o a la plataforma.
* **Límites y aprobaciones** para reembolsos y anulaciones.
* **Reportes de aprobación**: tasa de pago exitoso por método y por banco.

**Nivel 4: máximo**

* **Modelo de plataforma de pagos** (la plataforma recibe y reparte, con onboarding de cada negocio como sub-comercio).
* **Pagos a terceros y dispersión** (liquidar a guías, proveedores y contratistas).
* **Tokenización de tarjeta** para cobros futuros con consentimiento.
* **Antifraude con reglas e IA** (velocidad, país, montos atípicos).
* **Billetera interna y saldo a favor.**
* **Conciliación automática con el banco** y con la contabilidad.
* **Otros rieles**: pagos instantáneos (Bre-B u otros), criptoactivos, pagos internacionales.

### 3\. Links y botones de pago, suscripciones y cobros recurrentes

**Nivel 1: mínimo viable**

* **Link de pago** con monto y concepto, enviado por WhatsApp o correo.
* **Botón de pago** en el sitio web.
* Estado del link (pendiente, pagado, vencido).

**Nivel 2: operativo**

* **Links desde cualquier documento**: cotización, reserva, factura o cuota, ya con el valor y el cliente.
* **Link con vencimiento y pago parcial.**
* **Planes de suscripción** (mensual, trimestral, anual) con cobro automático.
* **Recordatorios antes del cobro** y avisos de pago exitoso o fallido.
* **QR de cobro** para mostrar en el mostrador.

**Nivel 3: control**

* **Reintentos inteligentes** de cobros fallidos (día 1, 3, 7) y suspensión automática de beneficios.
* **Cambios de plan, pausas, cancelación** y prorrateo.
* **Periodo de prueba** y cobro posterior.
* **Cuotas y financiación** (plan de pagos por cuotas para un tour, obra o curso).
* **Cobranza**: cartera vencida, recordatorios escalonados y estado de cuenta.
* **Reportes de recurrencia**: MRR, cancelaciones (churn) y pagos fallidos.

**Nivel 4: máximo**

* **Cobros por uso o por consumo** (medición y facturación variable).
* **Dunning con IA**: elige el canal, el mensaje y el momento para recuperar el pago.
* **Débito automático bancario** y mandatos.
* **Facturación de la propia plataforma** (planes, módulos y límites que tú le cobras a cada negocio).
* **Descuentos, créditos y cupones recurrentes.**
* **Predicción de cancelación** y ofertas de retención.

### 4\. Marketplace / integración con terceros (Booking, Airbnb, GetYourGuide, Rappi)

**Nivel 1: mínimo viable**

* **Calendarios iCal** (importar y exportar) para bloquear fechas entre Airbnb, Booking y la plataforma.
* **Registro manual** de reservas que llegan por cada canal, con su origen.
* **Pedidos de Rappi** capturados manualmente o por correo.

**Nivel 2: operativo**

* **Sincronización de disponibilidad** casi en tiempo real hacia los canales conectados.
* **Importación automática de reservas** al CRM, con cliente, fechas y monto.
* **Mapeo de productos**: qué habitación, tour o plato corresponde a cada anuncio.
* **Comisión por canal** registrada en cada reserva (neto real).
* **Mensajes del canal** visibles en la bandeja omnicanal, cuando el canal lo permita.

**Nivel 3: control**

* **Channel manager completo**: tarifas, restricciones (estancia mínima, cierres) y disponibilidad enviadas a todos los canales.
* **Prevención de sobreventa** con bloqueos y colas de sincronización.
* **Reglas de precio por canal** (más caro en el canal con mayor comisión).
* **Conciliación de pagos de canales** (lo que Booking o GetYourGuide te deben liquidar).
* **Alertas** por reservas sin sincronizar, errores de conexión o desfases.
* **Reportes por canal**: ocupación, ingresos netos, cancelaciones y rentabilidad.

**Nivel 4: máximo**

* **Más canales**: Expedia, Viator, TripAdvisor, Despegar, Mercado Libre, Rappi, Uber Eats, Google Hotel Ads y Google Things to Do.
* **Tarifas dinámicas** según ocupación, temporada y demanda.
* **Marketplace propio**: directorio de negocios de la plataforma donde otros clientes buscan y reservan.
* **Distribución B2B**: agencias, mayoristas y revendedores con tarifas netas y comisión.
* **Liquidaciones a terceros** (guías, proveedores, agencias) automáticas.
* **Plataforma abierta**: otros negocios publican sus servicios y tú cobras comisión.

### 5\. Motor de reservas online con disponibilidad en tiempo real

**Nivel 1: mínimo viable**

* **Formulario de solicitud de reserva** (fecha, personas, servicio) que llega al CRM.
* **Calendario de disponibilidad** manual.
* Confirmación manual por WhatsApp o correo.

**Nivel 2: operativo**

* **Disponibilidad automática** por fecha, habitación, tour, cupo o recurso.
* **Reserva con pago** (total o anticipo) y confirmación automática con voucher en PDF.
* **Tarifas por temporada, por personas o por noche** y reglas de estancia mínima.
* **Bloqueo temporal (hold)**: se reserva el cupo durante 10-15 minutos mientras el cliente paga.
* **Widget embebible** en el sitio y link directo para redes y WhatsApp.
* **Recordatorios** y reprogramación o cancelación por el cliente.

**Nivel 3: control**

* **Políticas de cancelación** configurables, con reembolso automático según la regla.
* **Extras y upsells** (desayuno, transporte, seguro, experiencias).
* **Overbooking controlado** y lista de espera.
* **Reglas por recurso**: capacidad, guía asignado, horarios, tiempo de limpieza o preparación.
* **Códigos promocionales, grupos y reservas múltiples.**
* **Panel de ocupación** diario y semanal, con vista calendario.
* **Integración con canales** (iCal o channel manager) y con housekeeping, guías y agenda.
* **Reportes**: ocupación, ingresos, cancelaciones y origen de la reserva.

**Nivel 4: máximo**

* **Tarifas dinámicas con IA** y recomendación de precio.
* **Asignación óptima de recursos** (habitaciones, guías, vehículos).
* **Reserva por chat y voz** con el bot de la capa de comunicación.
* **Multi-propiedad y multi-sede** con inventario compartido.
* **Paquetes dinámicos** (hotel + tour + traslado) con precio combinado.
* **Check-in digital**, firma de registro y pago de saldo antes de llegar.
* **API pública** para agencias y sitios externos.

### 6\. POS (punto de venta físico y móvil)

**Nivel 1: mínimo viable**

* **Venta rápida**: elegir productos, total y medio de pago (efectivo, transferencia, tarjeta).
* **Recibo** impreso o por WhatsApp.
* **Cierre de caja diario** con arqueo.

**Nivel 2: operativo**

* **Catálogo con búsqueda, categorías y código de barras.**
* **Descuentos, propinas y pago mixto** (parte efectivo, parte tarjeta).
* **Turnos por cajero** y apertura y cierre con conteo.
* **Descuento automático de inventario** en cada venta.
* **Funciona en celular y tablet.**
* **Impresoras térmicas** y cajón monedero.
* **Clientes asociados a la venta**, con puntos y membresías.

**Nivel 3: control**

* **Modo sin conexión (offline)** con sincronización posterior, imprescindible en muchos negocios.
* **Datáfonos integrados** (Wompi, Redeban, Credibanco y similares) y cobro por QR.
* **Roles**: quién anula, da descuento o hace devolución, con PIN o autorización.
* **Facturación electrónica POS** integrada a cada venta.
* **Multi-caja y multi-sede.**
* **Cuentas abiertas, mesas y comandas** (restaurantes, bares) y cobro dividido.
* **Reportes**: ventas por hora, producto, cajero y medio de pago, diferencias de arqueo.

**Nivel 4: máximo**

* **Hardware integrado**: lectores, balanzas, pantallas de cocina (KDS), autoservicio y kioscos.
* **Pedidos de domicilio y apps de terceros** (Rappi) dentro del mismo POS.
* **Menú y precios sincronizados** con tienda online y canales.
* **Análisis de ventas con IA** (productos que se venden juntos, horas pico, desabastecimiento).
* **Control antifraude** (anulaciones sospechosas, descuentos atípicos).
* **Conexión con balanzas, básculas y lectores de membresía** (gimnasios, acceso con QR).
* **Franquicias**: catálogos, precios y reportes centralizados con permisos por sede.

### 7\. Facturación electrónica DIAN y firma electrónica de contratos

**Nivel 1: mínimo viable**

* **Emisión de factura electrónica** a través de un proveedor tecnológico autorizado (no emitir directo a la DIAN).
* **Datos del cliente y del negocio** (NIT, régimen, resolución de numeración).
* **PDF y XML** enviados al cliente por correo.
* **Documento soporte** para compras a no obligados a facturar.

**Nivel 2: operativo**

* **Factura automática desde la venta, la reserva o el POS.**
* **Notas crédito y débito** ligadas a la factura original.
* **Impuestos y retenciones** calculados según el tipo de cliente y de producto.
* **Consulta de estado ante la DIAN** (aceptada, rechazada) y corrección de rechazos.
* **Consecutivos y resoluciones** administrados, con alerta por agotamiento o vencimiento.
* **Contratos con plantilla** (reserva, servicio, membresía, obra) y envío por enlace.
* **Firma electrónica simple** con aceptación registrada (fecha, IP, dispositivo).

**Nivel 3: control**

* **Facturación por lotes** (suscripciones, membresías) y facturas recurrentes.
* **Facturación por actas de obra** y por avance (construcción).
* **Nómina electrónica y documento soporte** de nómina, si manejas RR. HH.
* **RADIAN**: eventos de recibo y aceptación, y factura como título valor si se requiere.
* **Reintentos y cola de emisión** cuando la DIAN o el proveedor fallan.
* **Firma electrónica con validez probatoria**: sellado de tiempo, huella del documento (hash) y certificado de evidencia.
* **Firma múltiple** (varias partes, en orden) y recordatorios a firmantes pendientes.
* **Contratos versionados** con biblioteca de cláusulas.
* **Reportes de facturación** por periodo, cliente e impuesto, exportables para el contador.

**Nivel 4: máximo**

* **Multi-NIT y multi-empresa** con consolidación.
* **Conciliación automática** entre facturas, pagos y contabilidad (envío a Siigo, Alegra, World Office).
* **Firma digital con certificado** (entidad certificadora acreditada) y firma de alto valor.
* **Validación de identidad** (biometría, cédula, OTP) para contratos de más riesgo.
* **Generación de contratos con IA** y revisión de cláusulas.
* **Archivo y conservación** de documentos con la retención legal exigida.
* **API para contadores** y revisores fiscales con acceso de solo lectura.
* **Cumplimiento automatizado**: alertas ante cambios normativos de la DIAN y actualización de reglas.

### Integraciones de esta capa

| Área                | Integraciones típicas                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Pasarelas           | Wompi, PayU, Mercado Pago, Nequi, PSE (vía ACH o la pasarela), Epayco                    |
| Datáfonos           | Redeban, Credibanco, Wompi presencial                                                    |
| Facturación DIAN    | Proveedor tecnológico habilitado (Alegra, Siigo, Factus, Dataico, Carvajal, Gosocket)    |
| Firma electrónica   | Certicámara, Olimpia, Lleida.net, Signaturit, firma propia con evidencia                 |
| Canales de reservas | Booking.com y Airbnb (vía partner de conectividad o iCal), Expedia, GetYourGuide, Viator |
| Domicilios          | Rappi (API de tiendas), Uber Eats                                                        |
| Envíos              | Servientrega, Coordinadora, Envía, Interrapidísimo, Mensajeros Urbanos                   |
| E-commerce externo  | Shopify, WooCommerce, Mercado Libre, catálogo de Meta                                    |
| Contabilidad        | Siigo, Alegra, World Office, Contifico                                                   |
| Interno             | CRM, inventario, caja menor, finanzas, bandeja omnicanal, bot                            |

### Cosas críticas que se suelen olvidar

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

### Qué lanzaría primero

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

\-------------------------------------------------------------------------------- 


### Capa VI — Operación, Productividad y Logística (fuente: Operación)

Esta capa es **donde el trabajo se ejecuta**: lo que se vendió en la capa comercial se convierte aquí en tareas, citas, documentos, inspecciones y compras. Su valor está en que cada pieza se **dispare sola desde otra** (una reserva crea una tarea, una tarea vencida avisa por WhatsApp, un contrato firmado abre un proyecto).

### Núcleo compartido (base de toda la capa)

Se construye una sola vez y lo usan los ocho componentes:

* **Motor de eventos**: cada cosa que pasa en la plataforma (nuevo lead, pago recibido, reserva creada, tarea vencida) se emite como evento. Es la base de las automatizaciones.
* **Tarea universal**: una misma estructura (título, responsable, fecha, estado, prioridad, adjuntos, vínculo al cliente, obra, reserva o activo) sirve para proyectos, SOP, inspecciones y mantenimiento.
* **Recursos**: personas, vehículos, habitaciones, equipos y salas, con su calendario y disponibilidad.
* **Archivos y adjuntos** con almacenamiento por negocio, permisos y versiones.
* **Terceros** compartidos: clientes, proveedores, contratistas y empleados en una sola tabla.
* **Notificaciones** por WhatsApp, correo y dentro de la app, con preferencias por usuario.
* **Roles, equipos y permisos** por módulo y por registro.
* **Bitácora de auditoría** y comentarios con menciones (@) en cualquier registro.
* **Plantillas por vertical** para arrancar rápido (obra, hotel, tour, gimnasio).

### 1\. Gestión de proyectos y tareas

**Nivel 1: mínimo viable**

* Proyectos con responsable, fechas y estado.
* Tareas con título, responsable, fecha límite y prioridad.
* Vista de lista y tablero Kanban (por hacer, en curso, hecho).
* Comentarios y adjuntos por tarea.

**Nivel 2: operativo**

* **Subtareas, etiquetas y checklists** dentro de la tarea.
* **Plantillas de proyecto** por vertical (montaje de evento, apertura de gimnasio, obra pequeña).
* **Vista de calendario** y “mis tareas de hoy”.
* **Recordatorios** de vencimiento por WhatsApp o correo.
* **Vínculo con el CRM y las ventas**: la oportunidad ganada crea el proyecto con sus tareas.
* Tareas **recurrentes** (semanales, mensuales).

**Nivel 3: control**

* **Cronograma tipo Gantt** con dependencias (la tarea B empieza cuando termina la A) y ruta crítica.
* **Carga de trabajo por persona** para no sobreasignar.
* **Horas registradas** (time tracking) y costo por proyecto.
* **Hitos y entregables** con aprobación del cliente.
* **Presupuesto vs. real** por proyecto (conectado con finanzas y con el módulo de obra).
* **Reportes**: tareas vencidas, avance por proyecto y cumplimiento por responsable.
* **Permisos por proyecto** y portal de invitados (cliente o contratista con vista limitada).

**Nivel 4: máximo**

* **Portafolio de proyectos** con semáforos, riesgos y rentabilidad consolidada.
* **Planificación de recursos** entre proyectos y detección de conflictos.
* **Línea base y desviaciones** (planeado vs. real), con valor ganado (EVM).
* **IA**: genera el plan de tareas desde una descripción, estima duraciones, detecta retrasos y resume el estado semanal.
* **Gestión de riesgos, cambios y problemas** con registro formal.
* **Sincronización con herramientas externas** (Google Calendar, Jira, Asana, Trello).

### 2\. Agenda y citas con recordatorios automáticos

**Nivel 1: mínimo viable**

* Calendario con citas manuales (cliente, fecha, hora, servicio).
* **Recordatorio por WhatsApp o correo** antes de la cita.
* Estados: pendiente, confirmada, cancelada, atendida.

**Nivel 2: operativo**

* **Agenda por profesional o recurso** con horarios de trabajo y descansos.
* **Página pública de reserva de citas** (el cliente elige servicio, profesional y hora).
* **Confirmación con un clic** y cancelación o reprogramación por el cliente.
* **Servicios con duración y precio**, y tiempos de preparación entre citas.
* **Enlace de Meet o Zoom** generado automáticamente para citas virtuales.
* Integración con el CRM: la cita queda en el historial del cliente.

**Nivel 3: control**

* **Sincronización bidireccional** con Google Calendar y Outlook.
* **Anticipo o pago al reservar** y política de cancelación y no-show.
* **Lista de espera** que llena huecos de cancelaciones automáticamente.
* **Citas recurrentes y paquetes** (10 sesiones, tratamiento por etapas).
* **Citas grupales y clases** con cupos.
* **Reglas de reserva**: antelación mínima, máximo por día y bloqueos por festivos.
* **Reportes**: ocupación, no-shows, ingresos por profesional y horas pico.

**Nivel 4: máximo**

* **Agenda inteligente con IA**: propone horarios, reduce huecos y reasigna.
* **Agendamiento por chat y voz** desde el bot de la capa de comunicación.
* **Multi-sede** con disponibilidad compartida y traslado de citas.
* **Predicción de no-show** y sobrecupo controlado.
* **Recordatorios adaptativos** (canal y momento según el comportamiento del cliente).
* **API y widget** para embeber en sitios externos y en redes.

### 3\. Gestión documental: contratos, plantillas, versiones y firma

**Nivel 1: mínimo viable**

* **Carga de archivos** por cliente, proyecto o proveedor, con carpetas y búsqueda por nombre.
* **Plantillas básicas** de contrato y propuesta con campos a rellenar.
* Descarga en PDF y envío por correo o WhatsApp.

**Nivel 2: operativo**

* **Plantillas con variables automáticas** ({cliente}, {valor}, {fecha}) que se llenan desde el CRM, la reserva o la cotización.
* **Control de versiones**: quién cambió qué y cuándo, con opción de restaurar.
* **Firma electrónica simple** con enlace, registro de fecha, IP y dispositivo.
* **Estados**: borrador, enviado, visto, firmado, vencido.
* **Vencimientos y alertas** (contratos que vencen, seguros, licencias, pólizas).

**Nivel 3: control**

* **Flujo de revisión y aprobación** interno antes de enviar.
* **Firma múltiple y en orden** (cliente, representante, testigo) con recordatorios.
* **Biblioteca de cláusulas** reutilizables y comparación entre versiones.
* **Permisos por documento** y por carpeta, con registro de accesos.
* **Evidencia de firma con validez probatoria**: sellado de tiempo, huella del documento (hash) y certificado.
* **Clasificación y etiquetas** (contrato, factura, permiso, soporte) y búsqueda dentro del contenido (OCR).
* **Retención y archivo** según el tipo de documento.

**Nivel 4: máximo**

* **Gestión del ciclo de vida de contratos**: renovación, enmiendas, obligaciones y alertas de cumplimiento.
* **Generación y revisión con IA**: redacta, resume cláusulas y detecta riesgos.
* **Firma digital con certificado** y validación de identidad (biometría, OTP, cédula).
* **Extracción automática de datos** (fechas, valores, partes) desde documentos escaneados.
* **Repositorio legal** con políticas de retención, bloqueo por proceso legal y exportación para auditoría.
* **Portal de documentos** para clientes y contratistas.
* **Integración con almacenamiento externo** (Google Drive, OneDrive, SharePoint).

### 4\. Automatizaciones (workflows) tipo Zapier

**Nivel 1: mínimo viable**

* **Reglas simples “si pasa X, haz Y”** con plantillas listas (ejemplos: lead nuevo, enviar WhatsApp de bienvenida; pago recibido, marcar reserva confirmada).
* Activar y desactivar cada regla.
* Acciones básicas: enviar mensaje, crear tarea, cambiar estado, notificar al responsable.

**Nivel 2: operativo**

* **Constructor visual** de flujos (disparador, condición, acción).
* **Disparadores de todos los módulos**: CRM, reservas, pagos, tickets, citas, inventario.
* **Condiciones y filtros** (si el monto es mayor a X, si el cliente es VIP, si es fuera de horario).
* **Esperas y programación** (“espera 3 días y vuelve a escribir”).
* **Variables y plantillas** con datos del registro.
* **Historial de ejecuciones** con éxito, error y detalle.

**Nivel 3: control**

* **Ramas y bucles**, flujos paralelos y reintentos con manejo de errores.
* **Aprobaciones humanas** dentro del flujo (un jefe aprueba un descuento y el flujo sigue).
* **Permisos y entornos**: quién crea o edita flujos, modo prueba antes de publicar.
* **Límites y protección** contra bucles infinitos y avalanchas de mensajes.
* **Webhooks entrantes y salientes** y llamadas a APIs externas.
* **Versionado de flujos** y registro de cambios.
* **Métricas**: ejecuciones, fallos, tiempo ahorrado y costo por flujo.

**Nivel 4: máximo**

* **Pasos con IA**: clasificar mensajes, extraer datos, redactar respuestas y decidir rutas.
* **Agentes autónomos** que ejecutan varios pasos con guardarraíles y aprobación humana.
* **Conectores a miles de apps** (Zapier, Make, n8n) y conectores propios.
* **Biblioteca de flujos por vertical** (marketplace) listos para instalar.
* **Orquestación entre negocios** (reglas globales de la plataforma y reglas por cliente).
* **Observabilidad avanzada**: trazas, alertas, reproducción de ejecuciones y cuotas por plan.

### 5\. Checklists y procesos (SOP)

**Nivel 1: mínimo viable**

* **Checklists simples** con ítems marcables (apertura, cierre, limpieza de habitación).
* Asignar a una persona y fecha.
* Plantillas reutilizables.

**Nivel 2: operativo**

* **Checklists recurrentes** programados (diarios, semanales) con recordatorio.
* **Ítems con evidencia**: foto, nota o valor medido.
* **Procedimientos con pasos**, texto, imágenes y videos cortos.
* **Plantillas por vertical**: housekeeping, apertura de gimnasio, seguridad de obra, salida de tour, cocina.
* **Historial de cumplimiento** por persona, turno o sede.

**Nivel 3: control**

* **Campos obligatorios y reglas** (no se puede cerrar sin foto o sin firma).
* **Ramificación**: si un ítem falla, abrir tarea o ticket de mantenimiento automáticamente.
* **Aprobación y firma** del supervisor.
* **Versionado de procedimientos** y confirmación de lectura por el equipo.
* **Indicadores**: cumplimiento por sede, ítems que más fallan y tiempo de ejecución.
* **Auditoría interna** programada con puntaje.

**Nivel 4: máximo**

* **Procesos con flujo completo** (BPM): pasos, roles, aprobaciones y tiempos objetivo.
* **IA que convierte un video o una descripción en SOP** y mantiene el procedimiento actualizado.
* **Asistente de proceso en el celular** (paso a paso guiado por voz o chat).
* **Capacitación ligada al SOP** (certificación de que la persona lo conoce).
* **Biblioteca de mejores prácticas** por vertical y mejora continua con datos de cumplimiento.
* **Cumplimiento normativo**: ISO, SG-SST, BPM de alimentos, normas de turismo sostenible.

### 6\. Gestión de flota y rutas, mantenimiento y activos

**Nivel 1: mínimo viable**

* **Registro de activos** (vehículos, embarcaciones, equipos, maquinaria) con foto, placa o serial.
* **Responsable y ubicación** actual.
* **Documentos y vencimientos** (SOAT, tecnomecánica, seguros, licencias).
* **Alertas de vencimiento** por WhatsApp o correo.

**Nivel 2: operativo**

* **Mantenimientos preventivos** por tiempo, kilometraje u horas de uso.
* **Órdenes de trabajo** de mantenimiento correctivo, con costo y proveedor.
* **Historial por activo** (reparaciones, costos y fechas).
* **Asignación de vehículos y equipos** a conductores, tours o proyectos.
* **Registro de combustible, kilometraje y gastos** por vehículo.
* **Reportes de costo** por activo.

**Nivel 3: control**

* **Reservas y disponibilidad de activos** (qué vehículo o lancha está libre).
* **Rutas y despachos**: planificación, paradas y orden de visitas.
* **Seguimiento GPS** integrado (telemática) y alertas por desvíos o exceso de velocidad.
* **Inspecciones previas al uso** (checklist del conductor o capitán) con fotos.
* **Control de repuestos e inventario** de taller.
* **Depreciación y valor en libros** (conectado con el ERP).
* **Costo por kilómetro, por hora y por servicio**, y rentabilidad por activo.
* **Gestión de conductores**: licencias, horas y desempeño.

**Nivel 4: máximo**

* **Optimización de rutas con IA** (tiempo, costo y ventanas de entrega).
* **Mantenimiento predictivo** con datos de sensores y telemetría.
* **Ciclo de vida del activo**: compra, uso, mantenimiento, venta o baja y reemplazo óptimo.
* **Gestión de seguros y siniestros.**
* **Emisiones y sostenibilidad** (huella de carbono por servicio).
* **Integración con proveedores de GPS, tanqueo y peajes.**
* **Multi-sede y multi-negocio** con activos compartidos y facturación interna.

### 7\. Control de calidad e inspecciones con fotos desde el celular

**Nivel 1: mínimo viable**

* **Formularios de inspección** con ítems de cumple o no cumple.
* **Fotos tomadas desde el celular** y notas por ítem.
* **Informe en PDF** enviable al cliente o al jefe.

**Nivel 2: operativo**

* **Plantillas por vertical**: revisión de habitación, de obra, de vehículo, de cocina, de seguridad de actividad.
* **Calificación y puntaje** por inspección.
* **Hallazgos con responsable y fecha límite**, convertidos en tareas.
* **Geolocalización y hora automática** de cada foto.
* **Historial por sitio, activo o proveedor.**

**Nivel 3: control**

* **Modo sin conexión** (offline) con sincronización: imprescindible en obra y en campo.
* **Firma del inspector y del responsable** en el celular.
* **No conformidades** con acciones correctivas, verificación de cierre y seguimiento.
* **Inspecciones programadas** y recurrentes con recordatorio.
* **Marcar sobre la foto** (flechas y comentarios) y comparación antes/después.
* **Protocolos y ensayos** (concreto, soldadura, pruebas técnicas) con resultados registrados.
* **Reportes**: no conformidades por tipo, tiempo de cierre y desempeño por proveedor o sede.

**Nivel 4: máximo**

* **Análisis de fotos con IA**: detecta defectos, falta de EPP, daños o suciedad y propone el hallazgo.
* **Auditorías multi-sede** con ranking y tendencias.
* **Certificaciones y acreditaciones** (ISO, normas sectoriales) con evidencia organizada.
* **Control estadístico de calidad** y análisis de causa raíz.
* **Inspecciones por drones, sensores o cámaras fijas.**
* **Portal para interventoría y clientes** con informes y evidencias en tiempo real.
* **Calidad del proveedor**: puntaje que alimenta la selección y las compras.

### 8\. Gestión de proveedores y contratistas

**Nivel 1: mínimo viable**

* **Ficha de proveedor**: razón social, NIT, contacto, banco, categoría y condiciones de pago.
* **Documentos básicos** (RUT, cámara de comercio, certificación bancaria).
* **Listado y búsqueda** por categoría o ciudad.

**Nivel 2: operativo**

* **Cotizaciones comparativas** entre varios proveedores.
* **Órdenes de compra y de servicio** con aprobación.
* **Historial de compras, precios y entregas** por proveedor.
* **Contratos y vencimientos** de documentos (seguridad social, pólizas, certificados).
* **Cuentas por pagar** vinculadas (conectado con finanzas y caja).
* **Evaluación simple** (calificación del servicio y de la entrega).

**Nivel 3: control**

* **Proceso de homologación**: formulario de registro, verificación de documentos y aprobación antes de contratar.
* **Contratistas de obra o servicio**: contrato, alcance, anticipo, retenciones y pagos por avance (actas).
* **Seguridad social y SG-SST del contratista**: verificación mensual de planillas y afiliaciones.
* **Evaluación periódica** con criterios (calidad, precio, cumplimiento, seguridad) y ranking.
* **Listas de control** (proveedores bloqueados, en observación o preferidos).
* **Portal del proveedor**: sube documentos, ve órdenes y estados de pago.
* **Reportes**: gasto por proveedor, concentración y cumplimiento.

**Nivel 4: máximo**

* **Gestión de riesgo del proveedor**: validación en listas restrictivas (SARLAFT), situación financiera y dependencia.
* **Licitaciones y subastas** entre proveedores con reglas y trazabilidad.
* **Contratos marco y precios pactados** con alertas de sobreprecio.
* **Análisis de gasto con IA** (consolidar compras, detectar sobrecostos y recomendar proveedores).
* **Pagos automáticos y dispersión** a contratistas con conciliación.
* **Marketplace de proveedores** dentro de la plataforma (los negocios encuentran y contratan a otros).
* **Cumplimiento y auditoría** de la cadena de suministro (sostenibilidad, laboral, legal).

### Integraciones de esta capa

| Área               | Integraciones típicas                                                                  |
| ------------------ | -------------------------------------------------------------------------------------- |
| Calendario y video | Google Calendar, Outlook, Meet, Zoom, Teams, Calendly                                  |
| Mensajería         | WhatsApp Cloud API, correo (Resend, SendGrid), notificaciones push                     |
| Almacenamiento     | Google Drive, OneDrive, SharePoint, S3 / almacenamiento propio                         |
| Firma y documentos | Certicámara, Olimpia, Lleida.net, firma propia con evidencia, OCR                      |
| Automatización     | Webhooks, Zapier, Make, n8n, API propia                                                |
| IA                 | Claude, OpenAI, visión por computador, voz a texto                                     |
| Flota y mapas      | Google Maps, GPS/telemática (Wialon, Traccar y similares), Waze                        |
| Proyectos externos | Jira, Asana, Trello, Notion                                                            |
| Cumplimiento       | Listas restrictivas, consulta de planillas de seguridad social                         |
| Interno            | CRM, obra y presupuestos, inventario, finanzas, caja menor, RR. HH., bandeja omnicanal |

### Cosas críticas que se suelen olvidar

* **Una sola tarea universal**: si cada módulo inventa su propio concepto de tarea, después no podrás tener “mi día” ni automatizaciones transversales.
* **El motor de eventos primero**: las automatizaciones, las alertas y las integraciones dependen de que cada acción emita un evento limpio y con datos consistentes. Diseñarlo tarde obliga a reescribir.
* **Automatizaciones sin freno son peligrosas**: un bucle puede mandar mil WhatsApp o duplicar cobros. Pon límites por flujo y por plan, modo de prueba y registro de ejecuciones.
* **Permisos por registro, no solo por módulo**: un contratista debe ver su proyecto y nada más. Es difícil agregarlo después.
* **Offline en campo**: inspecciones, obra y rutas ocurren donde no hay señal. Sin modo sin conexión, la app no se usa.
* **Fotos pesan**: comprime en el celular, sube en segundo plano y controla el almacenamiento por plan; si no, los costos se disparan.
* **Validez de la firma y de los documentos**: guarda la evidencia completa y la versión exacta firmada. Sin trazabilidad, un contrato firmado puede no servir en una disputa.
* **Recordatorios de citas por WhatsApp**: usan plantillas aprobadas y tienen costo; define quién lo asume y respeta el consentimiento.
* **Sincronización con calendarios**: los conflictos y duplicados son la queja número uno. Define cuál es la fuente de verdad y maneja cancelaciones desde ambos lados.
* **Datos personales de proveedores y empleados**: habeas data también aplica aquí (cédulas, planillas, certificaciones bancarias). Cifra y limita el acceso.
* **GPS y telemetría**: pide consentimiento a los conductores y define con claridad qué se rastrea y cuándo.
* **Plantillas por vertical**: el módulo genérico se siente vacío al empezar. Tener plantillas listas (SOP de hotel, inspección de obra, checklist de tour) vende más que cualquier función.
* **Costos de IA**: análisis de fotos, resúmenes y agentes consumen mucho; límites por plan y cola de procesamiento.

### Qué lanzaría primero

1. **Núcleo: tarea universal, archivos, notificaciones y motor de eventos.**
2. **Agenda y citas con recordatorios por WhatsApp** (valor inmediato y fácil de explicar al cliente).
3. **Proyectos y tareas con Kanban**, ligados al CRM y a las ventas (la oportunidad ganada crea el proyecto).
4. **Checklists y SOP con fotos** (housekeeping, apertura, cierre): sencillo y muy usado.
5. **Automatizaciones simples con plantillas listas** (seguimiento, recordatorios, avisos de pago), antes del constructor visual completo.
6. **Documentos con plantillas, variables y firma electrónica** (reutiliza lo de la capa de ventas).
7. **Proveedores y contratistas** con documentos, órdenes de compra y vencimientos, conectado con finanzas y obra.
8. **Inspecciones de calidad offline** con no conformidades que generan tareas.
9. **Flota, rutas y mantenimiento**: empieza por activos, vencimientos y mantenimiento preventivo; GPS y rutas después.
10. **Gantt, planificación de recursos, IA y agentes autónomos**, ya con datos reales de uso.

\-------------------------------------------------------------------------------- 


### Capa VII — Caja Menor, Finanzas Operativas y Contabilidad (fuente: Caja)

Esta capa es el **control del efectivo y de los gastos pequeños del día a día**. Parece sencilla, pero es donde más se pierde plata por descuido o fraude hormiga. Su valor está en conectarse con el resto: cada gasto se carga a una obra, sede o proyecto, se contabiliza y deja evidencia. Y su regla de oro es que **nada se borra: todo se anula con motivo**.

### Núcleo compartido (base de toda la capa)

Se construye una sola vez y lo usan los ocho componentes:

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

### 1\. Cajas, apertura, saldo y arqueo

**Nivel 1: mínimo viable**

* **Apertura de caja**: monto base (fondo fijo), responsable y fecha.
* **Saldo en tiempo real**: fondo inicial menos gastos igual a efectivo disponible.
* **Cierre y arqueo**: comparar el saldo del sistema con el efectivo contado y registrar la diferencia.
* Reporte simple del arqueo.

**Nivel 2: operativo**

* **Múltiples cajas**: una por sede, área o persona, cada una con su fondo y su responsable.
* **Conteo por denominaciones** (billetes y monedas) en el arqueo.
* **Arqueo imprimible** con firmas del cajero y del revisor.
* **Traslado entre cajas** y entre caja y banco, con registro de ambos lados.
* **Tope de fondo** por caja y alerta de saldo bajo.
* Estado de la caja: abierta, cerrada, en arqueo, bloqueada.

**Nivel 3: control**

* **Arqueos sorpresa** programados o aleatorios, hechos por un auditor.
* **Tratamiento de diferencias**: sobrantes y faltantes con motivo, aprobación y, si aplica, cargo al responsable.
* **Cierre por periodos** (diario, semanal, mensual) que bloquea la edición.
* **Caja sin cerrar**: alerta y escalamiento al jefe.
* **Custodia**: cambio de responsable con acta de entrega y arqueo en el traspaso.
* **Límite de efectivo en caja** y reglas de consignación.

**Nivel 4: máximo**

* **Cajas multi-negocio y multi-moneda**, con consolidación.
* **Cajas virtuales o digitales** (tarjeta prepago, billetera Nequi del negocio) con el mismo control.
* **Conciliación automática** con extractos y movimientos bancarios.
* **Arqueo con IA**: detección de patrones de diferencias por cajero, sede u hora.
* **Cajas por proyecto u obra** que se abren y se cierran con el ciclo del proyecto.
* **Cierre automático** con asiento contable y envío del informe al contador.

### 2\. Movimientos: egresos, ingresos, reposiciones y comprobantes

**Nivel 1: mínimo viable**

* **Registro de egresos**: fecha, concepto, valor, beneficiario y categoría.
* **Registro de ingresos y reposiciones** cuando se repone el fondo.
* **Comprobante adjunto**: foto o PDF del recibo o factura.
* **Listado y filtros** por fecha, categoría y responsable.

**Nivel 2: operativo**

* **Numeración consecutiva de vales** (recibo de caja menor), con formato imprimible.
* **Reembolso y reposición de caja**: se pide reponer y se cuadra contra los comprobantes.
* **Captura desde el celular**: foto del recibo y registro en segundos.
* **Gastos con varios ítems o varias categorías** en un solo comprobante.
* **Exportar a Excel y PDF.**
* **Búsqueda** por beneficiario, concepto, valor y número de vale.

**Nivel 3: control**

* **Anulaciones con motivo** (nunca borrar), con aprobación y movimiento inverso visible.
* **Reglas de soporte obligatorio**: no se puede cerrar un gasto sin comprobante, o queda marcado como “sin soporte” con alerta.
* **Detección de duplicados** (mismo valor, tercero y fecha, o mismo número de factura).
* **Reposición con cuadre**: el valor repuesto debe coincidir con los gastos legalizados.
* **Gastos en moneda extranjera** con tasa de cambio registrada.
* **Adjuntos múltiples y versionados**, con registro de quién subió qué.

**Nivel 4: máximo**

* **OCR de facturas**: la foto del recibo llena automáticamente fecha, valor, NIT y concepto.
* **Gastos recurrentes programados** (internet, vigilancia, aseo), con vale generado automático y aprobación.
* **Registro por WhatsApp**: el empleado envía la foto del recibo al número del negocio y el sistema crea el borrador del gasto.
* **Sugerencia automática de categoría y centro de costo** según el tercero y el historial.
* **Importación masiva** de movimientos desde Excel o desde tarjetas.
* **Firma digital** del vale y del beneficiario en el celular.

### 3\. Solicitudes, aprobaciones y anticipos

**Nivel 1: mínimo viable**

* **Autorización manual** del jefe antes de gastar (registrada como una nota o un check de aprobado).
* **Anticipo simple** a un empleado, con valor y fecha.

**Nivel 2: operativo**

* **Solicitud y aprobación de gastos**: el empleado pide, el jefe aprueba y solo entonces se desembolsa.
* **Anticipos a empleados con legalización posterior**: el anticipo queda abierto hasta que se entregan comprobantes y se devuelve o se cobra la diferencia.
* **Topes**: monto máximo por gasto y por día.
* **Aviso al solicitante** del estado (aprobada, rechazada, desembolsada) por WhatsApp.
* **Lista de anticipos pendientes de legalizar** con días de antigüedad.

**Nivel 3: control**

* **Flujo de aprobación por montos**: hasta $X lo aprueba el jefe, por encima lo aprueba gerencia.
* **Segregación de funciones**: quien solicita no aprueba, quien aprueba no desembolsa.
* **Delegación** de aprobación en vacaciones, con vencimiento.
* **Bloqueo de nuevos anticipos** a quien tiene anticipos vencidos sin legalizar.
* **Cobro de saldos pendientes por nómina** (descuento autorizado por el empleado, con trazabilidad, conectado a la capa de Personas).
* **Aprobación en el celular** por enlace o botón de WhatsApp, con registro de quién, cuándo y desde dónde.
* **Reglas por centro de costo o por proyecto** (cada obra con su aprobador).

**Nivel 4: máximo**

* **Motor de políticas de gasto** (viáticos, alimentación, transporte) con topes por cargo, ciudad y tipo de gasto.
* **Aprobación condicional con IA**: pre-aprueba lo rutinario y escala lo atípico.
* **Presupuesto comprometido**: al aprobar, se reserva el valor contra el presupuesto antes de gastarlo.
* **Solicitudes de compra** que escalan a órdenes de compra cuando superan el alcance de la caja menor.
* **Anticipos con tarjeta o billetera prepago** que se cierran solos al legalizar.
* **Reembolsos a empleados** que pagaron de su bolsillo, con pago por nómina o por transferencia.

### 4\. Categorías, centros de costo y presupuesto

**Nivel 1: mínimo viable**

* **Lista de categorías** simple (transporte, papelería, aseo, alimentación, mantenimiento).
* **Filtro y total por categoría.**

**Nivel 2: operativo**

* **Categorías y subcategorías** configurables por negocio.
* **Centros de costo, proyectos y sedes**: a qué negocio o área se carga cada gasto.
* **Plantillas por vertical** con categorías listas (obra, hotel, gimnasio, tour).
* **Reporte de gasto por categoría, centro de costo y periodo.**
* **Vínculo con obra o proyecto**: el gasto aparece en el costo real de ese proyecto.

**Nivel 3: control**

* **Presupuesto mensual por categoría y por centro de costo**, con avance y semáforos.
* **Alertas de sobreejecución** (80 % y 100 %) al responsable y al jefe.
* **Cuentas contables (PUC) por categoría**, para que cada gasto ya nazca con su cuenta.
* **Reglas de imputación**: porcentaje del gasto repartido entre varias sedes u obras.
* **Categorías bloqueadas o restringidas** (por ejemplo, no permitir licor o gastos personales).
* **Comparativo presupuesto vs. real** por periodo.

**Nivel 4: máximo**

* **Presupuestos multi-periodo y por escenarios**, con ajustes y aprobación.
* **Pronóstico de gasto**: “al ritmo actual, esta caja se queda sin presupuesto el día 22”.
* **Costeo por actividad**: llevar el gasto de caja al capítulo o ítem de obra correspondiente.
* **Reglas de reclasificación masiva** con registro de cambios.
* **Benchmarks anónimos** del gasto por vertical y tamaño de negocio.
* **Reparto entre empresas del grupo** con facturación interna.

### 5\. Terceros, soportes e impuestos

**Nivel 1: mínimo viable**

* **Beneficiario** con nombre y documento.
* **Tipo de comprobante** (factura, recibo simple, sin soporte).

**Nivel 2: operativo**

* **Ficha del tercero**: NIT o cédula, nombre, ciudad y tipo (proveedor, empleado, ocasional).
* **Tipo de soporte** elegible: factura de venta, factura electrónica, documento soporte o recibo simple.
* **Búsqueda y creación rápida** del proveedor desde el mismo gasto.
* **Verificación de duplicados** de terceros (mismo NIT con nombres distintos).
* **Historial por proveedor**: cuánto se le ha pagado y cuándo.

**Nivel 3: control**

* **Documento soporte en adquisiciones a no obligados a facturar**: generación y transmisión por un proveedor tecnológico, con numeración propia.
* **Impuestos por gasto**: IVA descontable, impuesto al consumo, retenciones (fuente, ICA, IVA) según el tipo de tercero y la base mínima.
* **Régimen y responsabilidades del tercero** (responsable de IVA, no responsable, gran contribuyente, autorretenedor) para aplicar la regla correcta.
* **Validación del NIT** (dígito de verificación) y del formato de factura.
* **Alertas de gastos sin soporte válido** o con soporte que no cumple requisitos.
* **Control de pagos en efectivo** a un mismo tercero frente a los límites de deducibilidad vigentes (lo valida el contador, pero el sistema alerta).
* **Archivo del soporte** con la retención legal exigida.

**Nivel 4: máximo**

* **Lectura de la factura electrónica (XML o código QR)**: trae NIT, valor, IVA y número sin digitar.
* **Validación de la factura contra la DIAN** (si existe, si está aceptada, si ya se registró antes).
* **Consulta del RUT y de listas restrictivas** del proveedor (SARLAFT, según el caso).
* **Cruce con las facturas de proveedores que llegan al correo** para detectar gastos ya pagados por otra vía.
* **Gestión de terceros ocasionales** con formulario de autorización de datos y firma.
* **Retenciones y certificados automáticos** para el tercero y para la contabilidad.

### 6\. Contabilidad y conciliación

**Nivel 1: mínimo viable**

* **Exportar movimientos** a Excel para que el contador los registre.
* **Resumen del periodo**: total de ingresos, egresos y saldo.

**Nivel 2: operativo**

* **Reporte para el contador** por periodo: fecha, tercero, concepto, categoría, valor y soporte.
* **Cuenta contable sugerida** por categoría.
* **Libro auxiliar de caja menor** imprimible.
* **Reposición contabilizada**: la reposición genera el movimiento banco a caja.

**Nivel 3: control**

* **Asientos contables automáticos** por movimiento y por cierre, con el PUC del negocio.
* **Conciliación entre caja, banco y contabilidad**: lo repuesto contra lo retirado en el banco, y lo registrado contra el libro contable.
* **Centros de costo y terceros en el asiento**, para reportes por obra o sede.
* **Contabilización de impuestos y retenciones** por gasto.
* **Cierre contable por periodos** con bloqueo de edición y reapertura con autorización.
* **Vista para el contador y el revisor fiscal** con acceso de solo lectura y limitado en el tiempo.
* **Provisión de anticipos pendientes** y diferencias de arqueo como cuentas por cobrar o gasto.

**Nivel 4: máximo**

* **Integración bidireccional con Siigo, Alegra y World Office**: envía asientos y recibe confirmación y estado.
* **Multi-empresa y multi-moneda** con diferencia en cambio.
* **Conciliación automática con el extracto bancario** (sugiere los cruces).
* **Cierre mensual asistido**: lista de verificación (arqueos hechos, anticipos legalizados, sin soportes pendientes) antes de cerrar.
* **Reportes para auditoría** (muestras, trazabilidad de punta a punta y evidencia por movimiento).
* **Consolidación del grupo**: gastos de caja menor de todas las empresas en un solo estado.

### 7\. Control, alertas y auditoría

**Nivel 1: mínimo viable**

* **Registro de quién creó cada movimiento** y cuándo.
* **Alerta simple de saldo bajo.**

**Nivel 2: operativo**

* **Alertas por reglas**: saldo bajo, caja sin cerrar, gasto sin comprobante, anticipo vencido, tope superado.
* **Notificación por WhatsApp o correo** al responsable.
* **Historial de cambios** por movimiento (valor anterior y nuevo).
* **Reporte de gastos sin soporte** y de anticipos abiertos.

**Nivel 3: control**

* **Roles y permisos**: cajero, solicitante, aprobador, auditor, contador y administrador, con permisos por caja y por centro de costo.
* **Bitácora de auditoría completa**: quién creó, editó, anuló o aprobó, con IP y dispositivo.
* **Bloqueo de periodos cerrados**: nadie edita, ni siquiera el administrador, salvo reapertura registrada.
* **Alertas de duplicados, de montos redondos repetidos y de gastos en fines de semana o festivos.**
* **Control de fraccionamiento**: varios gastos pequeños al mismo tercero el mismo día que suman más que el tope.
* **Informe de excepciones** para el auditor: anulaciones, ediciones tardías, diferencias de arqueo y gastos sin soporte.
* **Acceso de auditor** de solo lectura.

**Nivel 4: máximo**

* **Detección de anomalías con modelos**: montos atípicos para la categoría, proveedores nuevos con valores altos, patrones repetidos por un mismo empleado, horas inusuales.
* **Puntaje de riesgo por caja, empleado y proveedor.**
* **Bitácora inmutable** (firmas encadenadas o almacenamiento de solo escritura) y verificación de integridad.
* **Análisis de colusión**: el mismo aprobador con el mismo proveedor de forma recurrente.
* **Respuesta automática**: bloquear una caja, congelar anticipos o pedir arqueo inmediato ante una señal crítica, con aprobación humana cuando el riesgo es alto.
* **Informes de cumplimiento** para auditorías internas y externas.

### 8\. Analítica, app móvil, integraciones y plantillas por vertical

**Nivel 1: mínimo viable**

* **Total de gastos por periodo, categoría y responsable.**
* **Uso desde el celular** con el navegador (diseño responsive).

**Nivel 2: operativo**

* **Tablero simple**: gasto del mes, saldo por caja, gastos por categoría y los más grandes.
* **Comparativo con el mes anterior.**
* **App móvil o PWA** con carga de comprobante desde la cámara y modo ligero.
* **Notificaciones**: aprobación pendiente, reposición lista, cierre vencido.
* **Plantillas por vertical** (categorías y reglas iniciales) al activar el módulo.

**Nivel 3: control**

* **Tablero de analítica**: gasto por categoría, responsable y centro de costo, tendencias, top proveedores y comparativo mensual.
* **Modo sin conexión** para registrar gastos en obra o en tours y sincronizar después.
* **Firma digital en el celular** del vale, de la legalización y del arqueo.
* **Reportes programados** por correo o WhatsApp al dueño o al contador (resumen semanal, cierre mensual).
* **API y webhooks**: eventos de gasto creado, aprobado, anulado y caja cerrada.
* **Integración con Obra, Proyectos, Inventario y Nómina** (el gasto de caja menor alimenta el costo real y los anticipos se descuentan en nómina).

**Nivel 4: máximo**

* **Asistente de IA**: “¿cuánto gastamos en transporte en la obra X este mes?”, “¿qué gastos no tienen soporte?”, “prepárame el cierre de septiembre”.
* **Plantillas avanzadas por vertical**:
  * **Obra**: caja menor por obra, categorías de campamento, fletes, herramienta menor y alimentación de cuadrillas, con imputación al capítulo y al ítem del presupuesto.
  * **Hotel**: caja de recepción y de mantenimiento, compras urgentes de housekeeping y propinas.
  * **Agencia de turismo y guías**: caja de tour (entradas, transporte, alimentación del grupo, propinas) con liquidación al cierre del tour.
  * **Gimnasio, restaurante y comercio**: caja de compras menores, domicilios y reposición de insumos.
* **Integraciones bancarias** (extractos, pagos y reposiciones por API), tarjetas prepago y billeteras.
* **Predicción de caja**: necesidad de reposición según el ritmo de gasto y los gastos recurrentes.
* **Marketplace de plantillas y reglas** por vertical y por país.

### Integraciones de esta capa

| Área           | Integraciones típicas                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Contabilidad   | Siigo, Alegra, World Office, Contifico                                                                                                      |
| DIAN           | Proveedor tecnológico para documento soporte y lectura o validación de facturas electrónicas (Alegra, Siigo, Factus, Dataico)               |
| Bancos         | Extractos y archivos de conciliación, API de pagos, Nequi y tarjetas prepago                                                                |
| Captura        | OCR y visión (Claude, Google Vision, AWS Textract), cámara del celular, lectura de QR de factura                                            |
| Mensajería     | WhatsApp Cloud API (registro por foto, avisos y aprobaciones), correo                                                                       |
| Firma          | Firma electrónica propia con evidencia, Certicámara, Olimpia                                                                                |
| Almacenamiento | Archivos propios por negocio, Drive u OneDrive como respaldo                                                                                |
| Interno        | Obra y presupuestos, proyectos, nómina (anticipos y reembolsos), inventario, compras, finanzas, bitácora global, alertas y automatizaciones |

### Cosas críticas que se suelen olvidar

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

### Qué lanzaría primero

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

Para tu mercado (**constructoras, hoteles, agencias y guías**), lo que más valor percibido da es: **caja por obra o por tour, foto del recibo desde el celular, anticipos legalizados y cierre con arqueo imprimible**. El OCR, las anomalías con IA y las integraciones contables funcionan muy bien como **plan superior**.

\-------------------------------------------------------------------------------- 


### Capa VIII — Talento Humano y Administración del Equipo (fuente: Personas)

Esta capa es **donde la plataforma toca a las personas**: quién trabaja, cuándo, cuánto se le paga, qué sabe y cómo rinde. Es la capa con más **riesgo legal** (laboral, datos personales, nómina), así que conviene decidir qué se construye y qué se integra con proveedores especializados.

### Núcleo compartido (base de toda la capa)

Se construye una sola vez y lo usan los seis componentes:

* **Ficha única del empleado**: datos personales, documentos, contrato vigente, cargo, sede, jefe directo, banco, EPS, pensión, caja de compensación y cesantías. Es un tercero más del núcleo, con el rol “empleado”.
* **Estructura organizacional**: negocios, sedes, áreas, cargos, equipos y jerarquía (quién reporta a quién).
* **Historial laboral**: ingreso, cambios de cargo y salario, novedades, sanciones, retiro. Nada se borra.
* **Calendario laboral**: festivos, turnos, vacaciones, incapacidades y permisos en una sola vista.
* **Roles y permisos finos**: el jefe ve a su equipo, RR. HH. ve todo, el empleado ve lo suyo, y **el salario es un permiso aparte**.
* **Portal del empleado** (autogestión) y app móvil.
* **Datos sensibles protegidos**: cifrado, acceso auditado y consentimiento (habeas data, Ley 1581); la biometría y la salud son datos sensibles.
* **Notificaciones** por WhatsApp, correo y app, y **bitácora de auditoría** de cada cambio.
* **Conexión con finanzas, caja, proyectos, obra y reservas**: el costo de personal se carga a la obra, sede o centro de costo.

### 1\. RR. HH. y nómina electrónica

**Nivel 1: mínimo viable**

* Ficha del empleado con documentos y datos básicos.
* **Contratos** con plantilla (término fijo, indefinido, obra o labor, prestación de servicios) y firma electrónica.
* **Vacaciones**: solicitud, aprobación y saldo de días.
* **Permisos, incapacidades y licencias** registrados manualmente.
* Listado y búsqueda de empleados con alertas de vencimiento de contrato.

**Nivel 2: operativo**

* **Liquidación de nómina**: salario, auxilio de transporte, horas extra, recargos, comisiones, deducciones y neto.
* **Seguridad social y parafiscales**: cálculo de aportes y generación del archivo PILA (o integración con un operador).
* **Prestaciones**: prima, cesantías, intereses de cesantías y vacaciones, con provisiones mensuales.
* **Nómina electrónica DIAN** a través de un proveedor tecnológico autorizado.
* **Desprendible de pago** por correo o WhatsApp y descarga en el portal.
* **Novedades**: incapacidades, préstamos, embargos, libranzas y bonos.
* **Liquidación de contrato** (finiquito) y certificados laborales automáticos.
* **Calendario de vacaciones** y control de saldos.

**Nivel 3: control**

* **Pago masivo de nómina** por archivo bancario o dispersión directa, con conciliación.
* **Contabilización automática** de nómina y provisiones (envío a finanzas o a Siigo, Alegra, World Office).
* **Costos por centro de costo, sede u obra**: cuánto cuesta cada proyecto en personal.
* **Retención en la fuente laboral** y certificados de ingresos y retenciones.
* **Dotación, EPP y SG-SST**: entregas, exámenes médicos, capacitaciones obligatorias y vencimientos.
* **Gestión de incapacidades** con seguimiento del cobro a la EPS o ARL.
* **Flujos de aprobación** para vacaciones, permisos, horas extra y cambios salariales.
* **Reportes**: costo laboral, rotación, ausentismo, horas extra y proyección de provisiones.
* **Cierre de nómina por periodos** que bloquea la edición.

**Nivel 4: máximo**

* **Multi-NIT y multi-empresa** con consolidación, empleados compartidos entre empresas y centros de costo.
* **Nómina para varios países** (reglas laborales y fiscales por país).
* **Simulador de costos**: cuánto cuesta contratar a alguien, subir un salario o abrir un turno.
* **Gestión de contratistas y prestadores de servicios** con control de seguridad social y riesgo de subordinación.
* **Compensación variable y bonificaciones** con reglas complejas.
* **Planeación de plantilla**: presupuesto de nómina, vacantes y proyección a 12 meses.
* **IA**: consulta en lenguaje natural (“¿cuánto pagué en horas extra en septiembre?”), detección de errores en nómina y alertas de riesgo de rotación.
* **Cumplimiento automatizado**: actualización de salario mínimo, aportes y cambios normativos.

### 2\. Reclutamiento y onboarding

**Nivel 1: mínimo viable**

* **Registro de vacantes** (cargo, sede, requisitos) y de candidatos con su hoja de vida.
* Estados simples: recibido, entrevista, oferta, contratado, descartado.
* **Convertir candidato en empleado** con un clic (pasa sus datos a la ficha).

**Nivel 2: operativo**

* **Pipeline de selección tipo Kanban** con etapas personalizables.
* **Página pública de vacantes** en el sitio del negocio y formulario de postulación.
* **Publicación en bolsas de empleo** (Computrabajo, Indeed, LinkedIn, grupos de WhatsApp).
* **Agenda de entrevistas** con recordatorios y enlace de videollamada.
* **Plantillas de mensajes** y de oferta laboral.
* **Checklist de onboarding**: documentos, contrato, afiliaciones, dotación, accesos y presentación al equipo.
* Solicitud de documentos por enlace y firma del contrato en línea.

**Nivel 3: control**

* **Pruebas y evaluaciones** (técnicas, de conocimientos o de personalidad) con puntaje.
* **Scorecards de entrevista** con criterios comunes y comparación entre candidatos.
* **Verificación de referencias y antecedentes** (con consentimiento) y exámenes médicos de ingreso.
* **Aprobación de vacantes** y presupuesto por cargo.
* **Onboarding por cargo y por vertical** (mesero, recepcionista, guía, instructor, maestro de obra) con tareas para el jefe, RR. HH. y el empleado.
* **Periodo de prueba** con seguimiento y evaluación antes de vencer.
* **Base de talento**: candidatos descartados que se pueden reactivar.
* **Reportes**: tiempo de contratación, costo por contratación, origen de candidatos y conversión por etapa.

**Nivel 4: máximo**

* **IA para preseleccionar hojas de vida**, resumir perfiles y redactar vacantes (con revisión humana y vigilando sesgos).
* **Entrevista inicial por chatbot o por WhatsApp** que filtra y agenda.
* **Contratación masiva y por temporada** (temporada alta en hoteles y turismo).
* **Programa de referidos de empleados** con bonos.
* **Onboarding con ruta de aprendizaje** conectada al LMS y a un “compañero guía”.
* **Planificación de sucesión** y movilidad interna.
* **Marketplace de talento** y personal por demanda (extras para eventos o temporadas).

### 3\. Control de horarios y turnos (reloj de marcación o geolocalización)

**Nivel 1: mínimo viable**

* **Marcación de entrada y salida** desde el celular o la web.
* Registro de horas por día y por empleado.
* **Horario base** asignado a cada persona.

**Nivel 2: operativo**

* **Turnos**: crear, asignar, publicar y repetir semanalmente, con vista de calendario.
* **Geolocalización y geocerca**: solo se puede marcar dentro del área del negocio u obra.
* **Foto en la marcación** o código QR por sede para validar presencia.
* **Cálculo automático de horas** ordinarias, extra, nocturnas, dominicales y festivas, con los recargos legales vigentes.
* **Retardos, ausencias y salidas anticipadas** con justificación.
* **Solicitud de cambio de turno** entre compañeros con aprobación.
* Alertas al jefe cuando alguien no marca.

**Nivel 3: control**

* **Reloj biométrico o lector** (huella, facial, tarjeta) integrado, con consentimiento y trato de dato sensible.
* **Reglas de jornada** configurables: jornada máxima legal, descansos, compensatorios y turnos flexibles.
* **Aprobación de horas extra** antes de pagarlas y límites por persona y por mes.
* **Marcación offline** con sincronización posterior (obra, campo, tours).
* **Horarios por proyecto o por recurso** (guía asignado a un tour, cuadrilla asignada a una obra).
* **Disponibilidad y preferencias** de cada empleado al armar turnos.
* **Conexión directa con nómina**: las horas aprobadas pasan solas a la liquidación.
* **Reportes**: ausentismo, puntualidad, costo de horas extra y cobertura de turnos.
* **Antifraude**: detección de marcaciones desde ubicación falsa, mismo dispositivo para varias personas o patrones atípicos.

**Nivel 4: máximo**

* **Generación automática de turnos con IA** según demanda (ocupación del hotel, reservas del día, afluencia del gimnasio) y costo.
* **Pronóstico de demanda de personal** y alertas de falta o exceso de cobertura.
* **Bolsa de turnos**: ofrecer turnos libres a empleados o a personal externo.
* **Cumplimiento automático** de límites legales y alertas de riesgo (exceso de horas, falta de descanso).
* **Marcación por voz, QR dinámico o reconocimiento facial** con prueba de vida.
* **Integración con control de acceso físico** (puertas, torniquetes, cerraduras).
* **Multi-sede y multi-empresa** con reglas distintas por sede.

### 4\. Capacitación interna (LMS): cursos y certificaciones

**Nivel 1: mínimo viable**

* **Cursos con lecciones** de texto, video (enlace) y archivos.
* Asignar un curso a una persona o a un cargo.
* **Marcar como completado** y registro de quién lo hizo.

**Nivel 2: operativo**

* **Rutas de aprendizaje** por cargo y por vertical (nuevo guía, nuevo instructor, nuevo auxiliar de obra).
* **Evaluaciones** con preguntas y nota mínima para aprobar.
* **Certificado automático** en PDF con código verificable.
* **Biblioteca de contenidos**: videos, manuales, SOP y presentaciones reutilizables.
* **Asignación automática** al ingresar, cambiar de cargo o vencer una certificación.
* **Recordatorios** por WhatsApp y correo a quien tiene cursos pendientes.
* Vínculo con los SOP: confirmar lectura y comprensión.

**Nivel 3: control**

* **Capacitaciones obligatorias** (SG-SST, manipulación de alimentos, alturas, primeros auxilios) con vigencia y renovación automática.
* **Matriz de competencias**: qué debe saber cada cargo y quién lo cumple.
* **Control de asistencia a capacitaciones presenciales** (QR o firma) y registro para auditorías.
* **Cursos en vivo** (videollamada) y grabaciones.
* **Reportes de cumplimiento** por persona, sede y curso, con semáforos.
* **Bloqueos opcionales**: no asignar a un tour o a una obra a quien no tenga la certificación vigente.
* **Banco de preguntas** y evaluaciones aleatorias.
* **Portal de contenidos para contratistas y proveedores.**

**Nivel 4: máximo**

* **Generación de cursos y evaluaciones con IA** desde manuales, videos o procedimientos.
* **Tutor IA** que responde dudas con la base de conocimiento del negocio.
* **Microaprendizaje por WhatsApp** (lecciones cortas diarias).
* **Gamificación**: puntos, insignias y rankings.
* **Aprendizaje adaptativo** que ajusta el contenido según los errores.
* **Certificaciones externas** y convenios (SENA, universidades) con registro de credenciales.
* **LMS para clientes** (cursos como producto: venta de formación, membresías educativas).
* **Análisis de impacto**: relación entre capacitación, calidad del servicio y desempeño.

### 5\. Comunicación interna: chat de equipo, anuncios y tablero de novedades

**Nivel 1: mínimo viable**

* **Anuncios generales** visibles al abrir la app, con confirmación de lectura.
* **Tablero de novedades** (cambios de turno, menú del día, reglas nuevas, cumpleaños).
* **Directorio del equipo** con teléfono, cargo y sede.

**Nivel 2: operativo**

* **Chat de equipo** por canales (por sede, área, obra, turno) y mensajes directos.
* **Anuncios segmentados** (solo a recepción, solo a la obra X).
* **Adjuntos, fotos y notas de voz.**
* **Comentarios y menciones (@)** en tareas, proyectos y tickets, con notificación.
* **Notificaciones por WhatsApp** a quien no tiene la app abierta.
* **Encuestas rápidas** y reacciones.

**Nivel 3: control**

* **Confirmación de lectura obligatoria** para comunicados críticos (seguridad, cambios de política).
* **Canales con permisos** (solo administradores publican, o todos responden).
* **Mensaje de turno** (entrega de turno con novedades, pendientes y alertas para quien llega).
* **Historial y búsqueda**, con retención configurable.
* **Comunicación con personal sin correo** (operarios, camareras, obreros) por WhatsApp o app simple.
* **Alertas urgentes** (emergencia, evacuación, clima) a toda la plantilla.
* **Cumpleaños, aniversarios y reconocimientos públicos.**
* **Buzón de sugerencias y línea de denuncias** (con opción anónima y trazabilidad).

**Nivel 4: máximo**

* **Chat integrado a los datos operativos**: del mensaje sale una tarea, un ticket o una orden de mantenimiento.
* **Traducción automática** entre idiomas para equipos mixtos.
* **Resúmenes con IA** de canales largos y de reuniones.
* **Asistente interno** que responde preguntas del equipo (“¿cuál es la política de vacaciones?”, “¿qué turno tengo mañana?”).
* **Intranet completa**: políticas, manuales, noticias, formularios y beneficios.
* **Analítica de clima laboral**: pulso semanal, participación y señales de desmotivación.
* **Comunicación hacia exteriores**: invitados, proveedores y clientes en canales compartidos con control de acceso.
* **Integración con Slack, Teams y Google Chat** para quien ya los usa.

### 6\. Evaluación de desempeño y comisiones

**Nivel 1: mínimo viable**

* **Comisiones simples**: porcentaje fijo sobre ventas o reservas por vendedor o guía.
* **Reporte mensual** de lo que ganó cada persona en comisiones.
* **Evaluación manual** con una calificación y comentarios del jefe.

**Nivel 2: operativo**

* **Reglas de comisión** por producto, por servicio, por meta alcanzada o por escalas.
* **Cálculo automático desde las ventas**, reservas, cobros o cierres del CRM.
* **Metas individuales y de equipo** con avance en tiempo real.
* **Evaluaciones periódicas** con formulario (competencias, cumplimiento, actitud) y firma del empleado.
* **Comentarios y objetivos acordados** que quedan en el historial.
* **Comisión ligada al pago del cliente**: se causa solo si el cobro se hizo.

**Nivel 3: control**

* **Esquemas complejos**: comisiones por escalones, aceleradores, bonos por equipo, reparto entre varios participantes (quien capta, quien cierra, quien atiende).
* **Reglas de clawback**: se descuenta si el cliente cancela o no paga.
* **Aprobación de liquidaciones** de comisiones antes de enviarlas a nómina.
* **Evaluación 360°**: jefe, pares, subordinados y autoevaluación.
* **OKR y KPI por cargo** conectados a datos reales (ventas, tickets resueltos, NPS, cumplimiento de checklists).
* **Calibración** entre evaluadores para evitar sesgos.
* **Planes de mejora** (PIP) con seguimiento y fechas.
* **Reportes**: ranking, distribución de calificaciones, comisión como porcentaje de la venta y costo del programa.
* **Transparencia**: cada empleado ve cómo se calculó su comisión.

**Nivel 4: máximo**

* **Motor de compensación** completo: bonos anuales, participación en utilidades, incentivos de largo plazo y simulaciones de impacto.
* **Desempeño en tiempo real** alimentado por todas las capas (calidad, tiempos, satisfacción del cliente, asistencia).
* **IA**: detecta riesgo de renuncia, sugiere ascensos, resume retroalimentación y propone metas.
* **Matriz de talento** (desempeño y potencial) y planes de carrera y sucesión.
* **Reconocimiento entre pares** con puntos canjeables.
* **Equidad salarial**: análisis de brechas por cargo, género y antigüedad.
* **Comisiones para canales externos** (agencias, guías independientes, afiliados) con liquidación y pago automático.
* **Integración con pagos y contabilidad** para dispersar y provisionar comisiones.

### Integraciones de esta capa

| Área           | Integraciones típicas                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Nómina y DIAN  | Proveedor tecnológico de nómina electrónica (Alegra, Siigo, Factus, Dataico), operadores PILA (Aportes en Línea, Mi Planilla, SOI) |
| Contabilidad   | Siigo, Alegra, World Office                                                                                                        |
| Bancos         | Archivos de dispersión (Bancolombia, Davivienda, otros) y pagos por API                                                            |
| Reloj y acceso | Lectores biométricos (ZKTeco, Hikvision), cerraduras inteligentes, QR                                                              |
| Mapas          | Google Maps (geocercas)                                                                                                            |
| Selección      | Computrabajo, Indeed, LinkedIn, Magneto, correo y WhatsApp                                                                         |
| Videollamada   | Meet, Zoom, Teams                                                                                                                  |
| Capacitación   | Contenido propio, YouTube/Vimeo (privado), SCORM, certificados verificables                                                        |
| Comunicación   | WhatsApp Cloud API, Slack, Teams, correo, notificaciones push                                                                      |
| Firma          | Certicámara, Olimpia, firma propia con evidencia                                                                                   |
| IA             | Claude, OpenAI, voz a texto                                                                                                        |
| Interno        | CRM, ventas, reservas, obra, proyectos, finanzas, caja menor, documentos                                                           |

### Cosas críticas que se suelen olvidar

* **La nómina es riesgo legal puro**: un error en prestaciones, aportes o retención genera reclamaciones y sanciones. Valora **integrar un proveedor** (Siigo, Alegra, Factus) en vez de construirla desde cero, o ponla como módulo premium con validación de un contador.
* **La ley laboral cambia**: la reforma laboral reciente movió recargos nocturnos y dominicales, y el salario mínimo cambia cada año. Haz que las reglas sean **parámetros editables con vigencia**, no código fijo, y verifícalas con un abogado laboral o contador.
* **Datos sensibles**: huella, rostro, salud, sindicato y datos de menores o familiares exigen consentimiento explícito, finalidad clara y seguridad reforzada (Ley 1581). Minimiza lo que guardas.
* **Biometría y geolocalización**: informa al empleado qué se mide y cuándo; rastrear fuera del horario laboral es un problema legal y de confianza.
* **Salario como permiso aparte**: un jefe de sede no debería ver el salario de su par ni el de su superior. Es de lo primero que genera conflictos si se hace mal.
* **Retención de datos**: define cuánto tiempo se conservan hojas de vida, contratos, nóminas y registros de asistencia (los plazos legales son largos) y cómo se eliminan los de candidatos descartados.
* **Contratistas vs. empleados**: tratar como “prestador” a quien cumple horario y órdenes genera riesgo de contrato realidad. El sistema debería avisar cuando un contratista se comporta como empleado.
* **Marcación sin internet**: en obra, tours y zonas rurales no hay señal. Sin offline, el control de asistencia no funciona.
* **Fraude de asistencia**: ubicación falsa, “marcar por otro” y fotos repetidas. Combina geocerca, foto, prueba de vida y revisión de patrones.
* **IA en selección y evaluación**: puede reproducir sesgos. Que sugiera, que decida un humano, y guarda trazabilidad.
* **Comisiones disputadas**: la causa número uno de conflictos. Reglas escritas, cálculo transparente, historial de ajustes y aprobación antes de pagar.
* **Costos de WhatsApp y de IA**: recordatorios a toda la plantilla y tutores IA consumen; límites por plan.
* **Adopción**: el personal operativo suele no tener correo ni usar apps complejas. Prioriza WhatsApp, interfaces muy simples y acceso por QR.

### Qué lanzaría primero

1. **Núcleo: ficha de empleado, estructura, permisos (con salario protegido) y portal básico.**
2. **Contratos con plantilla y firma, vacaciones, permisos y vencimientos** (RR. HH. nivel 1 y 2 sin nómina).
3. **Marcación por celular con geocerca y turnos** (control de horarios nivel 2): lo que más se pide en hoteles, gimnasios y obras.
4. **Comunicación interna simple**: anuncios con confirmación de lectura, canales y avisos por WhatsApp.
5. **Comisiones desde el CRM y las reservas** (nivel 2), con reporte transparente para cada vendedor o guía.
6. **Onboarding con checklist y reclutamiento básico** con página de vacantes.
7. **Capacitaciones obligatorias con vigencia** (SG-SST y las propias de cada vertical) y certificados.
8. **Nómina**: primero **exportar horas y novedades** a Siigo, Alegra o un proveedor; después, liquidación propia si hay demanda.
9. **Evaluaciones de desempeño y LMS completo.**
10. **Planificación de turnos con IA, matriz de talento y compensación avanzada**, cuando ya tengas datos reales de ocupación, ventas y asistencia.

\-------------------------------------------------------------------------------- 


### Capa IX — Inteligencia de Negocio, Analítica e IA (fuente: Datos)

Esta capa es el **cerebro y el sistema de vigilancia** de la plataforma. No genera datos: **los lee de todas las demás capas** y los convierte en decisiones, avisos y evidencia. Por eso su calidad depende de algo previo: que los módulos anteriores guarden datos limpios, con origen y con eventos consistentes. Si esa base falla, el mejor dashboard muestra números en los que nadie confía.

### Núcleo compartido (base de toda la capa)

Se construye una sola vez y lo usan los seis componentes:

* **Capa de datos unificada**: una vista consolidada de ventas, reservas, pagos, clientes, tareas, nómina e inventario, separada de la base operativa para que los reportes pesados no frenen la app (réplica de lectura o almacén analítico).
* **Modelo semántico / catálogo de métricas**: una sola definición de “venta”, “cliente activo”, “ocupación” o “margen”. Si cada dashboard calcula “venta” a su manera, los números nunca coinciden.
* **Eventos y cronología del cliente**: cada interacción, compra o ticket queda como evento con fecha, canal y origen.
* **Aislamiento multi-tenant**: cada negocio ve solo sus datos; el SuperAdmin ve agregados sin mezclar información de clientes.
* **Permisos sobre datos**: quién ve qué métrica, qué sede y qué columnas (el margen y los salarios son permisos aparte).
* **Calidad de datos**: validaciones, deduplicación de clientes y marcas de “dato incompleto”.
* **Motor de notificaciones** compartido con las otras capas (WhatsApp, correo, app).
* **Registro inmutable de eventos del sistema**, que alimenta la bitácora de auditoría.

### 1\. BI y dashboards unificados de todos los módulos

**Nivel 1: mínimo viable**

* **Dashboard de inicio por negocio**: ventas del día, semana y mes, reservas, saldo de caja, tareas pendientes y leads nuevos.
* **Tarjetas de KPI** con comparación contra el periodo anterior.
* **Filtros** por fecha y por sede.
* **Exportar a Excel o PDF.**

**Nivel 2: operativo**

* **Dashboards por vertical** listos para usar: hotel (ocupación, ADR, RevPAR), gimnasio (membresías activas, bajas, asistencia), turismo (cupos vendidos, margen por tour), construcción (presupuesto vs. ejecutado).
* **Dashboards por rol**: dueño, administrador, vendedor y contador.
* **Gráficos interactivos**: clic para ver el detalle y filtrar.
* **Comparativos** (mes contra mes, año contra año) y tendencias.
* **Vista consolidada de todos los módulos** en una sola pantalla.
* **Enlace de solo lectura** o vista compartida para socios y contadores.

**Nivel 3: control**

* **Constructor de reportes propio**: elegir fuente, campos, filtros, agrupaciones y gráfico, sin programar.
* **Métricas oficiales y certificadas** (definición única, con descripción visible).
* **Dashboards personalizables** con arrastrar y soltar y guardado por usuario o por equipo.
* **Multi-sede y multi-negocio**: comparación entre sedes y vista de grupo.
* **Permisos a nivel de fila y de columna.**
* **Segmentos guardados** (clientes VIP, canal Booking, temporada alta) reutilizables en cualquier reporte.
* **Análisis de embudo** (de visita a lead, a cotización, a venta, a pago).
* **Rendimiento**: caché y precálculo de métricas pesadas.

**Nivel 4: máximo**

* **Consulta en lenguaje natural** que genera el gráfico (“ventas por canal en septiembre, comparadas con agosto”).
* **Almacén de datos y modelado avanzado** (ETL/ELT, tablas históricas, cohortes).
* **BI embebido y white-label**: dashboards con la marca de cada negocio o de revendedores.
* **Benchmarks anónimos entre negocios de la misma vertical** (“tu ocupación está 8 puntos por debajo del promedio de posadas similares”).
* **Exportación a herramientas externas** (Looker Studio, Power BI, Metabase) y acceso por API.
* **Simulaciones y escenarios** (“¿qué pasa si subo la tarifa un 10 %?”).
* **Narrativas automáticas**: cada dashboard acompañado de un resumen en texto de lo importante.

### 2\. Reportes programados enviados por correo o WhatsApp

**Nivel 1: mínimo viable**

* **Resumen diario o semanal** automático por correo (ventas, reservas, caja) al dueño.
* **Programación** simple: frecuencia y hora.
* **Formato PDF o enlace** al dashboard.

**Nivel 2: operativo**

* **Resumen por WhatsApp** con los números clave en texto corto (“Ayer: $4,2 M en ventas, 12 reservas, caja $1,8 M”).
* **Reportes por destinatario**: el dueño recibe el consolidado, cada jefe de sede el suyo, el contador el de impuestos.
* **Plantillas de reporte por vertical** (cierre diario del hotel, ocupación semanal, resumen del gimnasio).
* **Reportes con filtros guardados** y adjuntos en Excel o PDF.
* **Historial de envíos** y confirmación de entrega.

**Nivel 3: control**

* **Reportes condicionales**: se envían solo si pasa algo (“si la ocupación baja de 50 %”).
* **Cierre automático diario y mensual** con arqueo, ventas, cartera y novedades.
* **Distribución por grupos y roles** con permisos (nadie recibe datos que no puede ver).
* **Reportes por cliente final** (para agencias o administradores que reportan a terceros), con marca propia.
* **Control de calidad del envío**: reintentos, alertas de fallo y límites por plan.
* **Reportes regulatorios y para el contador**: libros de ventas, IVA, retenciones y exportes listos.
* **Programación avanzada**: zonas horarias, festivos y fin de mes.

**Nivel 4: máximo**

* **Informes redactados por IA**: resumen ejecutivo con hallazgos, causas probables y acciones sugeridas.
* **Reportes interactivos por chat**: el dueño responde al WhatsApp con “¿y por qué bajó?” y recibe el detalle.
* **Reportes de voz** (nota de audio con el resumen del día).
* **Paquetes de informes mensuales** para juntas, inversionistas y bancos.
* **Entrega personalizada** (canal, hora y nivel de detalle según el comportamiento de cada destinatario).
* **Orquestación**: el reporte dispara automatizaciones (si algo es crítico, crear tarea o avisar al responsable).

### 3\. Analítica de clientes: LTV, CAC, retención y rentabilidad por canal

**Nivel 1: mínimo viable**

* **Ficha del cliente con totales**: cuánto ha comprado, cuántas veces y cuándo fue la última.
* **Clientes nuevos vs. recurrentes.**
* **Origen del cliente** (canal de captación guardado desde el primer contacto).
* **Lista de clientes inactivos.**

**Nivel 2: operativo**

* **Valor del cliente (LTV) simple**: ingresos acumulados por cliente y por segmento.
* **Costo de adquisición (CAC) por canal**: inversión en anuncios, comisiones y tiempo, dividida entre clientes nuevos.
* **Tasa de retención y recompra** por mes.
* **Segmentación RFM** (recencia, frecuencia, valor monetario) con grupos como “campeones”, “en riesgo” y “dormidos”.
* **Embudo por canal**: leads, cotizaciones, ventas y conversión.
* **Rentabilidad por canal**: ingreso menos comisión y costo de captación (por ejemplo, reserva directa frente a Booking).

**Nivel 3: control**

* **Análisis de cohortes**: cómo se comportan los clientes captados en cada mes o campaña.
* **LTV con margen**, no solo con ingresos, y relación LTV/CAC y tiempo de recuperación de la inversión.
* **Churn y bajas**: causas, momento y señales previas (membresías, suscripciones, clientes recurrentes).
* **Atribución multicanal** (primer toque, último toque, lineal) conectada con la capa de marketing.
* **Rentabilidad por cliente, producto, servicio, sede y vendedor** con costos asignados.
* **Listas dinámicas para acción**: “clientes en riesgo”, “clientes que más gastan”, “clientes con cotización sin respuesta”, sincronizadas con el CRM y las campañas.
* **Satisfacción vinculada**: NPS y reseñas contra valor y retención.

**Nivel 4: máximo**

* **LTV predictivo** (cuánto valdrá un cliente nuevo según su comportamiento temprano).
* **Predicción de abandono** y de compra, con puntaje por cliente.
* **Próxima mejor acción** por cliente (ofrecer, contactar, reactivar, no molestar).
* **Modelos de atribución avanzados** y medición de incrementalidad (qué ventas no habrían ocurrido sin la campaña).
* **Optimización del presupuesto de marketing** entre canales según LTV/CAC real.
* **Análisis de precio y elasticidad** (cómo cambia la demanda al mover tarifas).
* **Customer 360**: una vista única con reservas, pagos, chats, tickets, reseñas, comportamiento web y valor, que alimenta a las demás capas.

### 4\. IA transversal

**Nivel 1: mínimo viable**

* **Asistente de consultas básicas** sobre los datos del negocio: “¿cuánto vendí esta semana?”, “¿cuántas reservas hay mañana?”, “¿qué cliente me debe más?”.
* **Resumen de una conversación** o de un ticket a pedido.
* **Redacción asistida** de mensajes y respuestas.

**Nivel 2: operativo**

* **Asistente integrado en la app** (botón o barra) con acceso a ventas, reservas, caja, inventario y CRM, y respuestas con tablas o gráficos.
* **Resúmenes automáticos** de conversaciones, llamadas y reuniones, guardados en la ficha del cliente.
* **Sugerencias simples**: “este cliente no responde hace 5 días, ¿quieres enviar un recordatorio?”.
* **Búsqueda inteligente** en documentos, chats y notas.
* **Acceso por WhatsApp**: el dueño pregunta por chat y recibe la respuesta.
* **Respeta permisos**: cada usuario solo obtiene lo que puede ver.

**Nivel 3: control**

* **Acciones con confirmación**: el asistente redacta, crea tareas, prepara cotizaciones o programa campañas, pero el usuario aprueba antes de ejecutar.
* **Base de conocimiento por negocio** (políticas, precios, procedimientos) para responder con datos propios.
* **Resúmenes diarios proactivos** (“hoy tienes 3 cotizaciones por cerrar y 2 pagos vencidos”).
* **Explicaciones**: por qué cambió una métrica, con las causas más probables y los datos que lo respaldan.
* **Controles y límites**: qué datos puede usar la IA, qué acciones puede ejecutar, topes de gasto y de uso por plan.
* **Registro de cada consulta y acción** de la IA en la bitácora.
* **Retroalimentación**: marcar respuestas buenas o malas para mejorar.

**Nivel 4: máximo**

* **Agentes autónomos** que ejecutan flujos completos (seguimiento de cotizaciones, cobranza, reactivación) con guardarraíles y supervisión.
* **Copiloto por rol**: dueño, recepcionista, contador, jefe de obra, cada uno con herramientas y contexto propios.
* **Análisis profundo de negocio**: detecta oportunidades (“tus martes tienen 40 % de ocupación; prueba una promoción”), riesgos y desviaciones.
* **Memoria de largo plazo** del negocio y del cliente.
* **Multimodal**: entiende fotos (facturas, inspecciones), audios y documentos.
* **Evaluación continua** de calidad de las respuestas, pruebas automáticas y monitoreo de alucinaciones.
* **Asistente configurable por negocio** (tono, reglas, límites) y mercado de agentes por vertical.
* **Modelos propios o afinados** cuando el volumen lo justifique.

### 5\. Alertas inteligentes y detección de anomalías

**Nivel 1: mínimo viable**

* **Alertas por reglas fijas**: saldo de caja bajo, stock mínimo, factura vencida, cita sin confirmar, tarea atrasada.
* **Entrega por la app, correo o WhatsApp.**
* **Activar o desactivar** cada alerta.

**Nivel 2: operativo**

* **Umbrales configurables por negocio** (ocupación bajo X %, gasto diario sobre Y).
* **Alertas entre módulos**: pago fallido, reserva sin pago, lead sin respuesta en 30 minutos, contrato por vencer.
* **Prioridad y agrupación** para evitar spam de avisos.
* **Responsable y estado** (nueva, vista, resuelta) con seguimiento.
* **Alertas de cierre**: caja sin cerrar, diferencias de arqueo.
* **Horarios de silencio** y preferencias por usuario.

**Nivel 3: control**

* **Alertas comparadas con el comportamiento normal** (no solo umbrales fijos): “hoy se vendió 60 % menos que un martes típico”.
* **Detección de anomalías en dinero**: gastos duplicados, montos atípicos, fraccionamiento de gastos para evadir topes, anulaciones y descuentos inusuales, reembolsos repetidos.
* **Anomalías operativas**: pico de tickets, caída de mensajes entrantes, canal desconectado, sincronización fallida.
* **Alertas de seguridad**: inicios de sesión raros, exportaciones masivas, cambios de permisos, acceso fuera de horario.
* **Escalamiento automático**: si nadie atiende la alerta en X tiempo, sube al jefe.
* **Acciones sugeridas** en la propia alerta y vínculo directo al registro afectado.
* **Métricas de las alertas**: cuántas se atienden, cuáles son falsas y cuáles se ignoran.

**Nivel 4: máximo**

* **Modelos de detección con aprendizaje** que se ajustan a la estacionalidad (temporada alta, festivos, fines de semana).
* **Antifraude avanzado**: patrones de colusión, proveedores ficticios, comisiones manipuladas, marcaciones falsas.
* **Alertas predictivas**: “al ritmo actual te quedarás sin caja en 12 días”, “esta obra terminará 9 % sobre presupuesto”.
* **Correlación de eventos** que explica la causa raíz (cayeron las reservas tras cambiar el precio y pausar un anuncio).
* **Monitoreo de salud de la plataforma por negocio**: uso, adopción, riesgo de cancelación del cliente (útil para ti como SaaS).
* **Respuesta automática**: pausar un anuncio, bloquear un cupón, congelar un pago sospechoso o crear el ticket, con aprobación humana cuando el riesgo es alto.
* **Centro de control del SuperAdmin**: alertas de toda la plataforma (fallos de pasarelas, colas atascadas, picos de costos de IA).

### 6\. Bitácora de auditoría global

**Nivel 1: mínimo viable**

* **Registro de acciones críticas**: quién creó, editó, anuló o eliminó, con fecha y hora.
* **Inicios de sesión** y cambios de contraseña.
* **Consulta simple** por usuario y por fecha.

**Nivel 2: operativo**

* **Registro en todos los módulos** con valor anterior y valor nuevo (qué cambió exactamente).
* **Búsqueda y filtros** por módulo, usuario, registro, tipo de acción y rango de fechas.
* **Línea de tiempo por registro**: ver el historial completo de una factura, un cliente o una reserva.
* **Dirección IP, dispositivo y ubicación aproximada** de cada acción.
* **Exportar** el registro a Excel o PDF.
* **Registro de acciones del SuperAdmin** y de las suplantaciones (“entrar como el negocio X”).

**Nivel 3: control**

* **Bitácora inmutable**: los registros no se pueden editar ni borrar, ni siquiera por administradores (firmas encadenadas o almacenamiento de solo escritura).
* **Registro de lecturas sensibles**: quién vio salarios, datos personales, exportaciones y documentos confidenciales.
* **Eventos de seguridad**: cambios de roles y permisos, claves de API creadas, integraciones conectadas, exportaciones masivas.
* **Registro de las acciones de la IA y las automatizaciones** (qué ejecutó, por orden de quién y con qué datos).
* **Retención configurable** según el tipo de dato y la normativa.
* **Alertas sobre eventos críticos** (eliminaciones masivas, cambios de permisos fuera de horario).
* **Vista para auditor o revisor fiscal** con acceso de solo lectura y limitado en el tiempo.
* **Soporte de solicitudes de titulares** (habeas data): quién accedió a los datos de una persona.

**Nivel 4: máximo**

* **Cumplimiento y certificaciones**: preparación para ISO 27001, SOC 2 y auditorías externas, con evidencia automática.
* **Envío a sistemas de seguridad (SIEM)** y almacenamiento de largo plazo.
* **Verificación de integridad** programada (se puede demostrar que la bitácora no fue alterada).
* **Detección de comportamiento interno sospechoso** con análisis de patrones.
* **Informes de cumplimiento automáticos** (accesos, cambios, incidentes, retención).
* **Gestión de incidentes**: cuando algo sale mal, reconstruir qué pasó, quién fue afectado y notificar según la ley.
* **Auditoría por negocio y de plataforma**: cada cliente audita lo suyo, y tú auditas el sistema entero.
* **Legal hold**: congelar la eliminación de datos ante un proceso legal.

### Integraciones de esta capa

| Área                 | Integraciones típicas                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Datos y BI           | Postgres con réplica de lectura, BigQuery, ClickHouse, dbt, Metabase, Looker Studio, Power BI |
| Entrega de reportes  | WhatsApp Cloud API, correo (Resend, SendGrid), notificaciones push                            |
| Marketing y anuncios | Meta Ads, Google Ads, GA4, Search Console (para CAC y atribución)                             |
| IA                   | Claude, OpenAI, almacenes de vectores (pgvector), voz a texto                                 |
| Seguridad y registro | SIEM (Datadog, Splunk, Elastic), almacenamiento WORM (S3 Object Lock), Sentry                 |
| Monitoreo            | Uptime, métricas de infraestructura, alertas de costos                                        |
| Contabilidad         | Siigo, Alegra, World Office (conciliación de cifras)                                          |
| Interno              | Todas las capas anteriores: CRM, ventas, pagos, reservas, operación, personas                 |

### Cosas críticas que se suelen olvidar

* **Los números deben cuadrar con los de los módulos**: si el dashboard dice una venta distinta a la del módulo de ventas, nadie volverá a confiar. Define las métricas una sola vez y pruébalas contra casos reales.
* **No hagas analítica sobre la base operativa**: los reportes pesados la ralentizan. Usa una réplica de lectura o precálculos desde el principio.
* **Atribución desde el primer contacto**: si no guardaste el origen del cliente cuando llegó, el CAC y la rentabilidad por canal no se pueden reconstruir después.
* **LTV y CAC sin costos completos engañan**: un canal puede parecer barato y dejar clientes poco rentables. Incluye comisiones de canal, descuentos y costos de atención.
* **Tamaño de muestra**: un negocio pequeño con 40 clientes no tiene datos para predicciones; muestra tendencias simples y evita modelos que aparenten una precisión que no existe.
* **La IA puede equivocarse con números**: haz que calcule con consultas reales a la base (no que “adivine”), muestra la fuente de cada cifra y permite ver el detalle. Una respuesta incorrecta sobre ventas o caja destruye la confianza.
* **La IA respeta permisos**: un empleado que pregunta “¿cuánto gana el gerente?” no debe recibir respuesta. Los permisos se aplican a los datos antes de que lleguen al modelo.
* **Privacidad de los datos enviados a modelos externos**: define qué sale de tu infraestructura, con qué contrato de proveedor y con qué minimización (habeas data). Evita enviar datos sensibles innecesarios.
* **Fatiga de alertas**: demasiadas alertas se ignoran todas. Empieza con pocas, de alto valor, y mide cuántas se atienden.
* **Anomalía no es fraude**: una alerta es una pregunta, no una acusación. Redacta los avisos con cuidado, sobre todo los que involucran a empleados.
* **Bitácora que no se puede alterar**: si cualquier administrador puede borrar el registro, no sirve para auditoría. Hazla de solo escritura desde el diseño.
* **Costo de almacenamiento y retención**: la bitácora y los eventos crecen sin parar. Define políticas de retención y archivo por tipo de dato.
* **Reportes por WhatsApp tienen costo y reglas**: usan plantillas aprobadas y ventanas de conversación; decide quién asume el costo y respeta el consentimiento.
* **Datos de varios negocios**: los benchmarks entre clientes solo funcionan con datos anonimizados y agregados, con consentimiento expreso en los términos de la plataforma.
* **Zona horaria y corte de día**: “ventas de hoy” depende de la zona horaria del negocio y del cierre de caja. Un error ahí rompe la confianza en todo.

### Qué lanzaría primero

1. **Núcleo: eventos limpios, catálogo de métricas y bitácora de auditoría básica** (se hace desde el inicio; después cuesta mucho).
2. **Dashboard de inicio por negocio** con 8 a 10 KPI bien definidos y comparación con el periodo anterior.
3. **Resumen diario por WhatsApp o correo al dueño**: es el primer “wow” y es poco esfuerzo.
4. **Alertas por reglas simples** (caja baja, pagos vencidos, leads sin respuesta, stock mínimo).
5. **Dashboards por vertical** (hotel, gimnasio, turismo, construcción).
6. **Asistente de IA para consultas** sobre ventas, reservas y caja, con permisos, solo lectura y mostrando la fuente de cada cifra.
7. **Analítica de clientes**: origen, recompra, RFM y rentabilidad por canal (LTV y CAC cuando ya tengas datos de inversión).
8. **Bitácora completa con valores anteriores y nuevos, y vista para auditor.**
9. **Constructor de reportes y detección de anomalías** (gastos duplicados, descuentos atípicos, anulaciones).
10. **Agentes de IA con acciones, modelos predictivos, benchmarks entre negocios y certificaciones de seguridad**, cuando haya volumen de datos y clientes que lo justifiquen.

\-------------------------------------------------------------------------------- 


### Capa X — Plataforma SaaS, Gobernanza y Escalabilidad (fuente: Seguridad)

Esta capa es el **cimiento y el contrato de confianza** de todo lo demás. Nadie la ve cuando funciona, pero una falla aquí (fuga de datos, un negocio viendo datos de otro, un backup que no restaura, un cobro mal hecho) puede acabar con la plataforma. Y es la capa que **no se puede dejar para después**: aislamiento, permisos, auditoría y facturación son muy caros de añadir cuando ya hay clientes reales.

### Núcleo compartido (base de toda la capa)

Se construye una sola vez y lo usan los ocho componentes:

* **Modelo multi-tenant estricto**: cada negocio tiene su identificador y **toda consulta, archivo, caché, cola y tarea se filtra por él**. Idealmente con una segunda barrera (por ejemplo, políticas a nivel de fila en la base de datos) para que un error de código no exponga datos entre clientes.
* **Identidad unificada**: un usuario puede pertenecer a varios negocios con roles distintos, y el SuperAdmin de la plataforma es una identidad separada y mucho más protegida.
* **Catálogo de permisos y módulos**: qué módulos tiene activos cada negocio, qué puede hacer cada rol y qué límites tiene cada plan, en un solo lugar que consultan todas las capas.
* **Gestión de secretos y cifrado**: llaves de pasarelas, tokens de WhatsApp y redes, y datos sensibles cifrados, con rotación y sin aparecer en logs.
* **Registro de eventos y auditoría** (la bitácora de la capa 6), con eventos propios de seguridad.
* **Configuración por negocio** (marca, dominios, idioma, zona horaria, impuestos, políticas) y **banderas de funciones** (feature flags) para activar cosas por cliente o por plan.
* **Medición de uso** (mensajes, almacenamiento, llamadas a IA, usuarios, facturas emitidas) que alimenta límites y cobros.
* **Entornos separados**: desarrollo, pruebas y producción, con datos de prueba que nunca son datos reales.

### 1\. Roles, permisos y multi-negocio

**Nivel 1: mínimo viable**

* **Roles fijos**: propietario, administrador, empleado y solo lectura.
* **Un usuario, un negocio**, con invitación por correo o WhatsApp.
* **Permisos por módulo** (ver o no ver CRM, finanzas, nómina).
* **Aislamiento total de datos** entre negocios.

**Nivel 2: operativo**

* **Roles personalizables** con permisos por módulo y por acción (ver, crear, editar, anular, exportar, aprobar).
* **Un usuario en varios negocios** con selector y roles distintos en cada uno.
* **Sedes y equipos**: el vendedor de la sede A no ve la sede B.
* **Permisos sobre datos sensibles** como un permiso aparte (salarios, márgenes, datos personales).
* **Suspensión y reactivación** de usuarios y de negocios, con el motivo registrado.
* **Plantillas de roles por vertical** (recepcionista de hotel, instructor de gimnasio, residente de obra).

**Nivel 3: control**

* **Permisos por registro** (un contratista ve solo su proyecto; un guía, solo sus tours).
* **Segregación de funciones**: quien crea un pago no lo aprueba; quien factura no anula sin autorización.
* **Aprobaciones y límites por monto** configurables por rol.
* **Acceso temporal y delegado** (vacaciones, auditores externos, soporte) con vencimiento automático.
* **Revisión periódica de accesos**: lista de quién puede qué, con alertas de permisos excesivos o usuarios inactivos.
* **Suplantación auditada del SuperAdmin** (“entrar como el negocio X”) con motivo, banner visible, límite de tiempo y registro completo.
* **Jerarquía de organizaciones**: un grupo con varios negocios y una vista consolidada para el dueño.

**Nivel 4: máximo**

* **Motor de políticas** (permisos por atributos y condiciones: horario, ubicación, dispositivo, monto, sede).
* **Roles heredados y jerarquías complejas** para holdings y franquicias.
* **Aprovisionamiento automático de usuarios** (SCIM) desde el directorio de la empresa.
* **Aislamiento reforzado por cliente** (base de datos o esquema dedicado, región de datos propia) para planes empresariales.
* **Simulador de permisos** (“¿qué vería este usuario?”) antes de asignar un rol.
* **Detección de privilegios riesgosos** con IA y recomendaciones de menor privilegio.
* **Gestión de partners y revendedores**: agencias que administran muchos negocios con permisos delegados y facturación propia.

### 2\. Autenticación segura (2FA, SSO) y gestión de sesiones

**Nivel 1: mínimo viable**

* **Correo y contraseña** con almacenamiento seguro (hash fuerte, nunca texto plano).
* **Recuperación de contraseña** con enlace de un solo uso y vencimiento corto.
* **Cierre de sesión** y expiración por inactividad.
* **Reglas mínimas de contraseña** y verificación del correo.

**Nivel 2: operativo**

* **2FA** con aplicación autenticadora (TOTP) y **códigos de respaldo**.
* **Inicio de sesión con Google y Microsoft.**
* **Código por WhatsApp o SMS** como opción (más débil, pero práctico para público no técnico).
* **Lista de sesiones activas** con dispositivo y ubicación, y cierre remoto.
* **Aviso por correo o WhatsApp** ante inicios de sesión desde un dispositivo nuevo.
* **Bloqueo temporal** tras intentos fallidos y protección contra bots (captcha).

**Nivel 3: control**

* **2FA obligatorio por negocio o por rol** (para quien ve finanzas, nómina o configuración).
* **Passkeys / WebAuthn** y llaves de seguridad físicas para administradores.
* **SSO empresarial** (SAML, OIDC con Google Workspace, Microsoft Entra, Okta).
* **Políticas de sesión**: duración máxima, reautenticación para acciones sensibles (cambiar un pago, exportar datos, crear una llave de API).
* **Restricciones de acceso**: lista blanca de IP, horarios, países y dispositivos de confianza.
* **Protección de la cuenta del SuperAdmin**: 2FA obligatorio con llave física, sin SMS, y accesos solo desde entornos controlados.
* **Alertas y registro de seguridad**: inicios de sesión sospechosos, cambios de 2FA y de contraseña.

**Nivel 4: máximo**

* **Autenticación adaptativa**: pide más verificación según el riesgo (ubicación inusual, dispositivo nuevo, acción sensible).
* **Detección de robo de sesión y de credenciales filtradas** (contraseñas expuestas en brechas conocidas).
* **Gestión de dispositivos** (MDM) y requisitos de seguridad del dispositivo para planes empresariales.
* **Acceso de proveedores y soporte con acceso justo a tiempo** (Just-in-Time), aprobado y caducable.
* **Autenticación sin contraseña** como opción por defecto.
* **Autenticación de clientes finales** (portal del cliente, portal del proveedor) con inicio por enlace mágico o WhatsApp.
* **Certificaciones y pruebas**: pruebas de penetración periódicas, programa de reporte de vulnerabilidades.

### 3\. Backups, versionado y recuperación

**Nivel 1: mínimo viable**

* **Copias de seguridad automáticas diarias** de la base de datos, en una ubicación distinta del servidor principal.
* **Copia de los archivos** (fotos, documentos, comprobantes).
* **Retención básica** (por ejemplo, 7 a 30 días).

**Nivel 2: operativo**

* **Recuperación a un punto en el tiempo** (restaurar el estado de ayer a las 3 p. m.).
* **Papelera de reciclaje** para registros y archivos eliminados, con restauración por el propio usuario durante un periodo.
* **Versionado de documentos y de contenido** (sitio web, plantillas, contratos).
* **Copias cifradas** y almacenamiento en otra región o proveedor.
* **Exportación de datos** por negocio (el cliente se lleva su información en Excel, CSV o JSON).
* **Prueba de restauración periódica** (un backup que nunca se restauró no es un backup).

**Nivel 3: control**

* **Objetivos definidos de recuperación**: cuánto tiempo puede estar caído el sistema (RTO) y cuántos datos se pueden perder (RPO), documentados por plan.
* **Restauración por negocio** (recuperar los datos de un solo cliente sin afectar a los demás).
* **Copias inmutables** (no se pueden borrar ni cifrar por un atacante o un error) y separación de credenciales de producción y de respaldo.
* **Alta disponibilidad**: réplicas, conmutación automática por falla y despliegues sin interrupción.
* **Plan de recuperación ante desastres** escrito y probado, con simulacros.
* **Monitoreo y alertas** de backups fallidos, tamaño anómalo y tiempos de restauración.
* **Retención y eliminación coherentes con la ley**: guardar lo que se debe, borrar lo que se debe y poder demostrarlo.

**Nivel 4: máximo**

* **Multi-región activa** con failover automático y replicación continua.
* **Recuperación ante ransomware** con copias aisladas y procedimientos ensayados.
* **Retención configurable por cliente** y bloqueo legal (legal hold) ante procesos judiciales.
* **Ingeniería del caos**: pruebas deliberadas de fallos para validar la resiliencia.
* **Página de estado pública** (status page) con incidentes, historial y suscripción a avisos.
* **SLA contractuales** con créditos por incumplimiento.
* **Portabilidad total y migración asistida** (importar y exportar entre plataformas) como argumento de confianza.

### 4\. Cumplimiento: habeas data (Ley 1581), consentimientos, términos y políticas

**Nivel 1: mínimo viable**

* **Política de tratamiento de datos personales** y **términos y condiciones** publicados, con aceptación registrada al crear la cuenta.
* **Aviso de privacidad** en formularios y en la captura de leads.
* **Casilla de autorización** para contacto comercial, sin estar premarcada.
* **Canal para solicitudes** de los titulares (consulta, actualización, supresión).

**Nivel 2: operativo**

* **Registro de consentimientos**: quién aceptó, qué, cuándo, desde dónde y con qué versión del texto.
* **Baja fácil** (unsubscribe) en correos y WhatsApp, y respeto inmediato de esa baja en todos los canales.
* **Banner de cookies** y configuración de rastreo según el consentimiento.
* **Plantillas legales por negocio**: cada cliente de la plataforma publica su propia política y aviso de privacidad con sus datos (porque ante sus clientes finales él es el responsable).
* **Contrato de encargo de tratamiento**: la plataforma como encargada y cada negocio como responsable, con cláusulas claras.
* **Atención de derechos del titular**: flujo con plazos legales, responsable y evidencia.

**Nivel 3: control**

* **Mapa de datos personales** (qué se guarda, dónde, para qué, por cuánto tiempo y quién accede).
* **Políticas de retención y eliminación automática** por tipo de dato (candidatos descartados, leads inactivos, grabaciones de llamadas).
* **Gestión de incidentes y brechas**: procedimiento, registro y notificación a los afectados y a la autoridad cuando aplique.
* **Registro Nacional de Bases de Datos (RNBD)** de la SIC: apoyar a los negocios obligados a inscribir sus bases.
* **Evaluaciones de riesgo** al activar funciones sensibles (biometría, geolocalización de empleados, grabación de llamadas, IA sobre datos personales).
* **Datos sensibles y de menores**: consentimiento reforzado, minimización y acceso restringido.
* **Reglas de contacto comercial y de cobranza** (horarios y frecuencia permitidos, como lo regula la Ley 2300 de 2023) aplicadas en campañas, recordatorios de cobro y WhatsApp.
* **Transferencias internacionales**: documentar dónde viajan los datos (nubes, proveedores de IA, mensajería) y con qué garantías.
* **Evidencia de firma y de mensajes de datos** con validez probatoria (Ley 527 de 1999 y normas de firma electrónica).

**Nivel 4: máximo**

* **Programa integral de gestión de datos personales** (oficial de protección de datos, políticas internas, capacitación y auditorías).
* **Cumplimiento multi-país**: GDPR (turistas europeos), leyes de México, Perú, Chile, Estados Unidos (CCPA) y reglas por región de datos.
* **Certificaciones**: ISO 27001, ISO 27701, SOC 2 e informes para clientes empresariales.
* **Centro de confianza (Trust Center)** público con políticas, subencargados, estado de seguridad y documentos descargables.
* **Gestión automatizada de solicitudes de titulares** (búsqueda en todos los módulos, paquete de datos y borrado verificado).
* **Control de proveedores y subencargados** (pasarelas, nube, IA, mensajería) con evaluación y contratos.
* **Cumplimiento por vertical**: Registro Nacional de Turismo y reporte de huéspedes (TRA/SIRE) en hoteles, SG-SST en obras y nómina, historia clínica en salud, normas de seguridad en actividades de aventura.
* **Gobernanza de IA**: transparencia, evaluación de sesgos, registro de modelos y datos usados, y límites de decisión automatizada.

### 5\. API pública, webhooks y marketplace de módulos/plugins

**Nivel 1: mínimo viable**

* **Llaves de API por negocio** con permisos (solo lectura o lectura y escritura).
* **API REST documentada** para lo esencial (clientes, reservas, ventas, productos).
* **Webhooks salientes** para eventos clave (nueva reserva, pago recibido, nuevo lead).
* **Límite de peticiones** (rate limit) básico.

**Nivel 2: operativo**

* **Documentación pública interactiva** (OpenAPI), ejemplos y entorno de pruebas (sandbox).
* **Webhooks firmados** (el receptor puede verificar que vienen de ti), con reintentos y registro de entregas.
* **Alcances (scopes) granulares** por llave y rotación de llaves.
* **Versionado de la API** (v1, v2) y política de cambios y de retirada de versiones.
* **OAuth 2.0** para que apps de terceros accedan en nombre del negocio, con pantalla de consentimiento.
* **Conectores listos** para Zapier, Make y n8n.
* **Panel del desarrollador**: llaves, uso, errores y registros de webhooks.

**Nivel 3: control**

* **Límites por plan y por llave**, con cuotas, alertas de consumo y respuestas claras ante exceso.
* **Idempotencia y paginación** correctas, filtros y actualizaciones parciales.
* **SDK oficiales** (JavaScript, Python) y colección de Postman.
* **Registro y auditoría de cada llamada** y de cada acceso de terceros, con revocación inmediata.
* **Directorio de integraciones** propias (las que tú mantienes) con instalación en un clic.
* **Eventos como producto**: catálogo estable de eventos de la plataforma para automatizar.
* **Entornos de prueba por cliente** y datos de ejemplo.
* **Estado y métricas de la API** (latencia, errores, disponibilidad).

**Nivel 4: máximo**

* **Marketplace abierto de módulos y plugins** (propios y de terceros) con publicación, revisión de seguridad y calidad, instalación por negocio y permisos explícitos.
* **Programa de desarrolladores y socios**: portal, certificación, soporte y reparto de ingresos (por ejemplo, 70/30).
* **Extensibilidad profunda**: campos personalizados, acciones personalizadas, pantallas embebidas y módulos por vertical creados por terceros.
* **Aislamiento de plugins** (ejecución en entorno restringido, límites de recursos y datos permitidos).
* **API GraphQL, streaming de eventos y acceso masivo** a datos (exportes programados al almacén del cliente).
* **Servidor MCP / herramientas para agentes de IA** que permitan a asistentes externos operar la plataforma con permisos controlados.
* **Facturación y liquidación a desarrolladores** de lo que venden en el marketplace.
* **Revisión continua**: escaneo de seguridad, retirada de plugins vulnerables y reporte de incidentes a los negocios afectados.

### 6\. White-label: marca propia, dominio propio y apps personalizadas por negocio

**Nivel 1: mínimo viable**

* **Logo, colores y nombre del negocio** en el panel y en los documentos (cotizaciones, facturas, vouchers).
* **Subdominio propio** por negocio (`negocio.nexusthrive.co`).
* **Correos y mensajes** con el nombre del negocio como remitente visible.

**Nivel 2: operativo**

* **Dominio propio** (por ejemplo, `reservas.minegocio.com`) con asistente DNS paso a paso, verificación y SSL automático.
* **Correo de envío con dominio propio** (SPF, DKIM, DMARC) guiado.
* **Marca completa**: tipografía, favicon, pantallas de acceso, plantillas de documentos y de WhatsApp.
* **Quitar o reemplazar la marca de la plataforma** (“Hecho con...”) según el plan.
* **Portales de clientes y proveedores con la marca del negocio.**
* **Idiomas y textos personalizables.**

**Nivel 3: control**

* **App móvil con marca del negocio** (PWA instalable, o apps nativas publicadas en las tiendas bajo cuenta del cliente o la tuya).
* **Revendedores y agencias (partners)**: un panel para administrar muchos clientes, con marca propia de la agencia, precios y márgenes propios.
* **Temas y plantillas** personalizables por negocio y por vertical, con vista previa.
* **Configuración por entorno**: la agencia define una configuración base y la despliega a sus clientes.
* **Dominios de correo y de enlaces cortos** propios.
* **Control de funciones visibles** por negocio (ocultar módulos, renombrar secciones, adaptar el vocabulario a la vertical).
* **Gestión de certificados y dominios** a escala (renovaciones, errores de DNS, alertas).

**Nivel 4: máximo**

* **Plataforma white-label completa**: otra empresa vende el producto como suyo, con su propio sitio de ventas, planes, facturación a sus clientes, soporte y marca, sobre tu infraestructura.
* **Apps nativas personalizadas publicadas automáticamente** en App Store y Google Play para cada negocio.
* **Instancias dedicadas** (base de datos y despliegue aislados) y regiones elegibles para clientes grandes.
* **Constructor de módulos y pantallas sin código** para que el negocio o el partner cree sus propias vistas y flujos.
* **Configuración como código** y plantillas de negocio completas (clonar un hotel modelo en un clic).
* **Marketplace de plantillas de negocio por vertical** de partners.
* **Gestión de marca a escala**: cientos de negocios con identidad propia sin intervención manual.

### 7\. Facturación de la propia plataforma: planes, módulos, cobros y límites de uso

**Nivel 1: mínimo viable**

* **Planes fijos** (por ejemplo, Básico, Pro, Empresa) con precio mensual y lista de módulos incluidos.
* **Cobro manual o por link de pago** y activación del plan al recibir el pago.
* **Estados de cuenta**: activa, en prueba, vencida, suspendida.
* **Periodo de prueba** gratuito con vencimiento claro.

**Nivel 2: operativo**

* **Cobro recurrente automático** (tarjeta, Nequi o débito, según la pasarela) con recordatorios antes del cobro.
* **Módulos como complementos**: el negocio activa y paga solo los que usa (Gimnasio, Caja menor, Construcción, WhatsApp).
* **Límites por plan** (usuarios, sedes, contactos, mensajes, almacenamiento, facturas emitidas, llamadas a IA) con aviso al acercarse al tope.
* **Cambio de plan**, subida y bajada, con prorrateo.
* **Facturas y recibos automáticos** de la plataforma al negocio (con facturación electrónica DIAN).
* **Reintentos de cobro y periodo de gracia** antes de suspender, sin perder los datos.
* **Panel de facturación** para el negocio: plan, uso, próximos cobros e historial.

**Nivel 3: control**

* **Cobro por uso (medido)**: mensajes de WhatsApp, créditos de IA, almacenamiento y facturas por encima del plan, con paquetes prepagados de créditos.
* **Costos pasados al cliente de forma transparente** (comisión de Meta por conversación, costo de IA, envíos).
* **Descuentos, cupones, anualidades y precios especiales** por cliente o por partner.
* **Facturación por moneda e impuestos** (COP y USD, IVA y retenciones según el caso).
* **Dunning (cobranza de suscripciones)**: secuencia de recordatorios, cambio de método de pago y suspensión escalonada y reversible.
* **Métricas de la plataforma**: MRR, ARR, churn, expansión, conversión de prueba a pago, ARPU y costo por cliente.
* **Panel del SuperAdmin**: planes, precios, uso por negocio, deuda y alertas de clientes que se pasan del límite.
* **Reglas de suspensión y reactivación** claras (solo lectura primero, luego bloqueo) y exportación de datos garantizada.

**Nivel 4: máximo**

* **Motor de precios flexible**: por puesto, por uso, por módulo, por sede, híbrido y personalizado para clientes empresariales.
* **Contratos y facturación empresarial**: órdenes de compra, facturación por periodos, condiciones de pago a 30 o 60 días.
* **Reparto de ingresos** con partners, revendedores y desarrolladores del marketplace, con liquidación automática.
* **Optimización de ingresos**: pruebas de precios, recuperación de pagos fallidos con IA y ofertas de retención antes de la cancelación.
* **Análisis de rentabilidad por cliente**: ingreso menos costo real (infraestructura, IA, mensajería, soporte).
* **Previsión de ingresos y de costos** y alertas de márgenes negativos por uso excesivo.
* **Conciliación contable automática** con tu propia contabilidad y reconocimiento de ingresos.
* **Marketplace de pagos para partners** (cada revendedor cobra a sus clientes con su propia facturación).

### 8\. Centro de ayuda, tutoriales y onboarding guiado

**Nivel 1: mínimo viable**

* **Centro de ayuda** con artículos básicos (cómo crear un negocio, conectar WhatsApp, emitir una factura).
* **Botón de soporte** que abre WhatsApp o correo con el contexto del negocio.
* **Videos cortos** de los flujos principales.

**Nivel 2: operativo**

* **Onboarding guiado paso a paso**: lista de configuración con progreso (datos del negocio, módulos, primer cliente, primera venta).
* **Plantilla de arranque por vertical**: al elegir “gimnasio” o “hotel”, se crean categorías, servicios, roles y ejemplos listos.
* **Ayuda contextual dentro de la app** (tooltips, enlaces a artículos desde cada pantalla).
* **Buscador del centro de ayuda** y artículos por módulo y por vertical.
* **Importación asistida** de datos (clientes, productos, inventario desde Excel) con validación y vista previa.
* **Estados vacíos útiles**: cada pantalla sin datos explica qué hacer y ofrece datos de ejemplo.

**Nivel 3: control**

* **Recorridos interactivos** (product tours) por rol y por módulo, con seguimiento de quién los completó.
* **Soporte integrado**: tickets con SLA, historial y acceso (con permiso del cliente) para ver su configuración.
* **Métricas de activación**: qué pasos completan los negocios nuevos, dónde se atascan y cuánto tardan en su primera venta.
* **Mensajes de adopción** automáticos (por WhatsApp o correo) cuando un negocio no avanza.
* **Academia / capacitación para clientes** con cursos y certificados.
* **Novedades del producto** (changelog) y avisos de nuevas funciones dentro de la app.
* **Comunidad y retroalimentación**: votación de funciones y hoja de ruta pública.
* **Servicio de implementación** (onboarding asistido) como servicio de pago, con checklist y seguimiento.

**Nivel 4: máximo**

* **Asistente de IA de soporte** que responde con la documentación y con el estado real de la cuenta, ejecuta acciones simples (reconectar un canal, reiniciar una sincronización) y escala a un humano.
* **Onboarding personalizado con IA**: configura el negocio a partir de una conversación o de su sitio y sus redes (“cuéntame de tu posada”) y deja el sistema listo.
* **Guías adaptativas** según el uso real y señales de riesgo de abandono.
* **Éxito del cliente (customer success)**: puntaje de salud por negocio, alertas al equipo y acciones proactivas.
* **Red de partners certificados** que implementan y dan soporte local.
* **Documentación multi-idioma** y contenido por región y por vertical.
* **Base de conocimiento viva**: se actualiza con los tickets más frecuentes y con los cambios del producto.

### Integraciones de esta capa

| Área                       | Integraciones típicas                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Identidad y acceso         | Google, Microsoft, Okta, Auth0, Clerk, Supabase Auth, passkeys / WebAuthn                                            |
| Infraestructura y respaldo | AWS, Google Cloud, Cloudflare (DNS, SSL, WAF, protección DDoS), S3 con bloqueo de objetos, Backblaze                 |
| Seguridad y monitoreo      | Sentry, Datadog, Grafana, Cloudflare Turnstile, escáneres de vulnerabilidades, gestores de secretos (Vault, Doppler) |
| Dominios y correo          | Cloudflare, GoDaddy y Namecheap (guía DNS), Resend, SendGrid, Amazon SES                                             |
| Cobros de la plataforma    | Wompi, PayU, Mercado Pago, Stripe (clientes internacionales), facturación DIAN vía proveedor                         |
| Desarrolladores            | OpenAPI, Postman, Zapier, Make, n8n, OAuth 2.0                                                                       |
| Soporte y ayuda            | Centro de ayuda propio, Intercom o Crisp, WhatsApp, Loom y videos propios                                            |
| Apps móviles               | PWA, Expo / React Native, App Store Connect y Google Play                                                            |
| Cumplimiento               | Consulta del RNBD de la SIC, herramientas de gestión de consentimientos, firma electrónica con evidencia             |
| Interno                    | Todas las capas: la medición de uso, los permisos y la bitácora atraviesan toda la plataforma                        |

### Cosas críticas que se suelen olvidar

* **Aislamiento entre negocios es lo primero**: el peor incidente posible es que un cliente vea datos de otro. Filtra por negocio en cada consulta, archivo, caché, cola y búsqueda, y agrega pruebas automáticas que intenten cruzar datos.
* **Eres encargado y cada negocio es responsable**: ante la Ley 1581, quien decide sobre los datos de los clientes finales es el negocio, y tú los tratas por su encargo. Eso exige contratos claros, avisos de privacidad por negocio y buenas prácticas de seguridad. Pide revisión a un abogado de datos personales.
* **Un backup que no se probó no existe**: programa restauraciones de prueba y mide el tiempo real. También respalda archivos y configuración, no solo la base de datos.
* **Backups y derecho de supresión**: cuando alguien pide borrar sus datos, define cómo se refleja en los respaldos (vencen por retención) y documéntalo.
* **Suplantación del SuperAdmin**: es útil para soporte y peligrosa para la confianza. Debe pedir motivo, mostrar un banner, tener límite de tiempo, no permitir acciones destructivas por defecto y quedar registrada de forma inalterable.
* **Llaves y tokens de terceros**: las llaves de pasarelas, WhatsApp y redes de cada negocio son lo más valioso que guardas. Cífralas, nunca las muestres completas, rótalas y pon alertas por uso anormal.
* **Dominios propios son el mayor foco de soporte**: DNS mal configurado, certificados que no se renuevan, dominios que expiran. Haz un asistente con verificación, alertas y reintentos automáticos.
* **Límites y costos desde el día uno**: WhatsApp, IA, almacenamiento y facturación electrónica tienen costo por uso real. Mide el consumo por negocio y por módulo antes de fijar precios, o tendrás clientes que te cuestan más de lo que pagan.
* **Suspender sin borrar**: un negocio moroso pasa a solo lectura, no pierde su información. Garantiza la exportación de sus datos siempre; es un tema de confianza y a veces legal.
* **Facturación electrónica de tu propio cobro**: tú también facturas a tus clientes. Resuélvelo con un proveedor desde el primer cobro y considera retenciones que te practiquen.
* **API es un contrato**: cada cambio rompe integraciones de alguien. Versiona desde la primera versión, avisa con anticipación y no cambies campos existentes.
* **Webhooks fiables**: firma, reintentos con retroceso, orden no garantizado y panel de entregas. Sin esto, tus clientes no podrán confiar en las integraciones.
* **Marketplace de plugins es un riesgo de seguridad**: un plugin malicioso puede leer los datos de un negocio. No lo abras hasta tener permisos finos, aislamiento, revisión y capacidad de retirar plugins rápido.
* **White-label tiene reglas propias**: define quién es el responsable ante el cliente final, quién da soporte, qué pasa con los datos si el partner se va y cómo se separa la marca de la tuya (incluyendo pagos y facturación).
* **Apps nativas por negocio son costosas**: cuentas de desarrollador, revisiones de las tiendas y actualizaciones. Empieza con PWA y deja las apps nativas para planes altos.
* **Habeas data en WhatsApp y cobranza**: consentimiento previo, horarios permitidos de contacto y baja fácil. Esto afecta campañas, recordatorios de pago y bots.
* **Cumplimiento por vertical**: los hoteles tienen reportes de huéspedes y registro de turismo, las obras tienen SG-SST, la salud tiene historia clínica. No asumas que un módulo genérico cumple.
* **Seguridad no es una función, es un proceso**: pruebas de penetración, dependencias actualizadas, revisión de código, gestión de incidentes y un correo público para reportar vulnerabilidades.
* **Onboarding es retención**: la mayoría de las cancelaciones ocurren en las primeras semanas. Un negocio que no hace su primera venta en el sistema pronto, probablemente se va.

### Qué lanzaría primero

1. **Aislamiento multi-negocio sólido + roles y permisos con salario y márgenes protegidos** (ya lo tienes en parte: refuérzalo con pruebas y una segunda barrera de seguridad).
2. **Autenticación segura**: 2FA obligatorio para propietarios y administradores, y sesiones controlables. 2FA con llave física para el SuperAdmin.
3. **Backups automáticos con restauración probada**, papelera de reciclaje y exportación de datos por negocio.
4. **Cumplimiento mínimo serio**: política de datos, términos, registro de consentimientos, baja fácil, contrato de encargo y plantillas legales por negocio, con revisión de un abogado.
5. **Facturación de la plataforma**: planes, módulos como complementos, cobro recurrente, límites de uso y suspensión en solo lectura. Es tu modelo de ingresos.
6. **Onboarding guiado con plantillas por vertical** e importación asistida desde Excel (lo que más reduce el abandono).
7. **Centro de ayuda y soporte por WhatsApp** con contexto del negocio.
8. **White-label básico**: marca, subdominio y luego dominio propio con asistente DNS.
9. **API con llaves, webhooks firmados y documentación**, después OAuth y conectores para Zapier o n8n.
10. **SSO empresarial, partners y revendedores, marketplace de plugins, apps nativas por negocio, certificaciones (ISO 27001, SOC 2) e instancias dedicadas**, cuando haya clientes grandes que los pidan.

Para tu producto, enfocado en **negocios pequeños y medianos de Colombia** (posadas, gimnasios, guías, constructoras), lo que más pesa al inicio es: **aislamiento de datos, 2FA para dueños, backups probados, consentimientos bien hechos, facturación por planes y módulos, y un onboarding por vertical que deje al negocio operando el primer día**. El marketplace, el white-label avanzado y las certificaciones suben de prioridad cuando empieces a vender a agencias, cadenas o empresas grandes.

Con esta capa ya tienes los siete bloques desglosados: **Atención, Marketing, Ventas y pagos, Operación, Personas, Datos e inteligencia, y Seguridad y plataforma**, además del grupo 8 (específicos por vertical) que dejaste aparte. Si quieres, el siguiente paso útil es armar el **mapa de dependencias y un roadmap por fases** (qué construir primero para que cada capa se apoye en la anterior), o desglosar el grupo 8 por vertical.

\-------------------------------------------------------------------------------- 


### Capa XI — Especialización por Vertical (fuente: Construcción)

Sí, encaja como una **vertical con módulo propio** dentro de la plataforma. Además se conecta con lo que ya tienes: terceros, cotizaciones, caja menor, inventario y finanzas. En construcción es de los módulos con más valor, porque el presupuesto es el corazón del negocio.

### Nivel 1: Mínimo viable (presupuesto simple)

* **Proyectos / obras**: cliente, ubicación, fechas y responsable.
* **Presupuesto por capítulos y actividades**: ítem, unidad, cantidad, valor unitario y total.
* **Catálogo de insumos**: materiales, mano de obra, equipo y transporte, con precio.
* **APU básico**: cada actividad se compone de insumos × rendimiento (lo que tienes hoy).
* **Importar desde Excel**.
* **AIU**: administración, imprevistos y utilidad, más IVA sobre utilidad.
* **Exportar presupuesto a PDF / Excel** con formato presentable.

### Nivel 2: Presupuesto profesional (donde puedes mejorar tu APU)

* **Biblioteca de APU reutilizable**: plantillas por actividad (muro en bloque, placa, pañete) que se copian a cualquier proyecto.
* **Insumos con precios por fecha y por ciudad/proveedor**, con historial.
* **Actualización masiva de precios**: cambiar el cemento y que se recalculen todos los APU y presupuestos que lo usan.
* **APU compuestos**: un APU que usa otro APU (por ejemplo, mortero dentro de pañete).
* **Desperdicios y rendimientos** configurables por insumo.
* **Mano de obra con prestaciones**: factor prestacional y cuadrillas (oficial + ayudante).
* **Importador inteligente**: detecta columnas, valida errores, muestra una vista previa y empareja insumos duplicados o con nombres distintos.
* **Versiones del presupuesto**: v1, v2, “ajustado”, comparar cambios.
* **Cantidades de obra**: memorias de cálculo (largo × ancho × alto) ligadas a cada ítem.
* **Análisis de insumos**: lista consolidada de cuánto cemento, acero o jornales necesita toda la obra.
* **Cotización al cliente** generada desde el presupuesto, con la parte que quieras mostrar (sin revelar costos internos).

### Nivel 3: Control de obra

* **Presupuesto vs. ejecutado**: costo real contra lo presupuestado por capítulo.
* **Cronograma** (Gantt) ligado a las actividades y flujo de caja proyectado.
* **Avance de obra**: porcentaje por actividad, actas de avance y **actas de corte** para cobro.
* **Requisiciones y compras por obra**: pedir materiales contra el presupuesto, con alerta si te pasas.
* **Subcontratos**: contratos por actividad, anticipos, retenciones y pagos por avance.
* **Inventario por obra** (bodega de obra), entradas, salidas y consumos.
* **Control de personal de obra**: asistencia, jornales y nómina por obra.
* **Bitácora de obra** con fotos, clima, novedades e incidentes.
* **Caja menor por obra** (ya la tienes, conéctala).
* **Órdenes de cambio / adicionales**: obra extra con aprobación del cliente.
* **Control de pagos del cliente**: anticipo, actas, retenciones (retegarantía) y saldo.

### Nivel 4: Máximo (nivel empresa constructora)

* **Control de costos con valor ganado (EVM)**: CPI, SPI y proyección de sobrecosto.
* **Portafolio multiobra**: tablero de todas las obras, márgenes y flujo de caja consolidado.
* **Licitaciones**: preparar propuestas, comparar con presupuesto oficial y controlar documentos.
* **Pólizas y garantías**: vencimientos y alertas.
* **Seguridad y salud (SG-SST)**: inspecciones, permisos de trabajo, EPP, reportes de accidentes.
* **Calidad**: protocolos, ensayos (cilindros de concreto, densidades) y no conformidades.
* **Maquinaria y equipos**: horas máquina, mantenimiento y costo por equipo.
* **Integración con planos**: cuantificación desde PDF/DWG o BIM (mediciones asistidas).
* **IA**: leer un presupuesto en PDF o Excel desordenado, sugerir APU, detectar precios fuera de rango y proyectar sobrecostos.
* **App móvil de obra**: avances, fotos, requisiciones y asistencia sin conexión.
* **Portal del cliente / interventoría**: ver avance, actas y fotos.
* **Integración con contabilidad** y facturación electrónica por acta.

### Apéndice — Mapa del sistema completo (visión OS)

Ya cubriste **CRM, ERP y Caja menor**. Para manejar *todo lo digital* de un negocio, estos son los demás sistemas, agrupados por área.

### 1\. Atención y comunicación

* **Bandeja omnicanal**: WhatsApp, Instagram, Facebook, correo y chat web en un solo lugar.
* **Chatbots y asistentes IA** que atienden 24/7 y escalan a un humano.
* **Helpdesk / tickets** de soporte y postventa, con SLA.
* **Telefonía / VoIP** con grabación y registro en el CRM.
* **Videollamadas y agenda** (Meet o Zoom integrados).
* **Encuestas, NPS y reseñas**: pedir y gestionar opiniones en Google.

### 2\. Marketing y captación

* **Sitio web y landing pages** con constructor propio y subdominio (ya lo tienes).
* **Email y WhatsApp marketing**: campañas, listas y secuencias.
* **Redes sociales**: calendario, programación y métricas.
* **SEO y Google Business Profile**.
* **Gestor de anuncios** (Meta Ads, Google Ads) con atribución por canal.
* **Blog / CMS** y biblioteca de contenido.
* **Fidelización**: puntos, cupones, referidos y membresías.
* **Generador de QR, enlaces cortos y formularios.**

### 3\. Ventas digitales y pagos

* **E-commerce / tienda online** con catálogo y carrito.
* **Pasarelas de pago**: Wompi, PayU, Mercado Pago, Nequi, PSE.
* **Links y botones de pago**, suscripciones y cobros recurrentes.
* **Marketplace / integración con terceros** (Booking, Airbnb, GetYourGuide, Rappi).
* **Motor de reservas online** con disponibilidad en tiempo real.
* **POS** (punto de venta físico y móvil).
* **Facturación electrónica DIAN** y firma electrónica de contratos.

### 4\. Operación y productividad

* **Gestión de proyectos y tareas** (Kanban, cronograma, Gantt).
* **Agenda y citas** con recordatorios automáticos.
* **Gestión documental**: contratos, plantillas, versiones y firma.
* **Automatizaciones (workflows)** tipo Zapier: “si pasa X, haz Y”.
* **Checklists y procesos (SOP)**: procedimientos estandarizados.
* **Gestión de flota y rutas**, mantenimiento y activos.
* **Control de calidad e inspecciones** con fotos desde el celular.
* **Gestión de proveedores y contratistas.**

### 5\. Personas y equipo

* **RR. HH. y nómina electrónica**: contratos, vacaciones, turnos y asistencia.
* **Reclutamiento** y onboarding de empleados.
* **Control de horarios y turnos** (reloj de marcación o geolocalización).
* **Capacitación interna (LMS)**: cursos y certificaciones.
* **Comunicación interna**: chat de equipo, anuncios y tablero de novedades.
* **Evaluación de desempeño y comisiones.**

### 6\. Datos, inteligencia y control

* **BI y dashboards** unificados de todos los módulos.
* **Reportes programados** enviados por correo o WhatsApp.
* **Analítica de clientes**: LTV, CAC, retención y rentabilidad por canal.
* **IA transversal**: asistente que responde “¿cuánto vendí esta semana?”, resume conversaciones y sugiere acciones.
* **Alertas inteligentes** y detección de anomalías.
* **Bitácora de auditoría** global.

### 7\. Seguridad, legal y plataforma

* **Roles, permisos y multi-negocio** (ya los manejas).
* **Autenticación segura** (2FA, SSO) y gestión de sesiones.
* **Backups, versionado y recuperación.**
* **Cumplimiento**: habeas data (Ley 1581), consentimientos, términos y políticas.
* **API pública, webhooks y marketplace de módulos/plugins.**
* **White-label**: marca propia, dominio propio y apps personalizadas por negocio.
* **Facturación de la propia plataforma**: planes, módulos, cobros y límites de uso.
* **Centro de ayuda, tutoriales y onboarding guiado.**

### 8\. Específicos por vertical

| Vertical           | Módulos propios                                                     |
| ------------------ | ------------------------------------------------------------------- |
| Gimnasio           | Membresías, control de acceso, rutinas, clases, check-in QR         |
| Hotel / posada     | Channel manager, housekeeping, ocupación, tarifas dinámicas         |
| Turismo / guías    | Tours, itinerarios, cupos, liquidación a guías, voucher             |
| Construcción       | Presupuesto de obra, APU, avance, subcontratos, bitácora de obra    |
| Restaurante        | Comandas, mesas, recetas, domicilios, cocina (KDS)                  |
| Salud / belleza    | Historia clínica o ficha, agenda por profesional, paquetes          |
| Educación          | Matrículas, notas, asistencia, pagos de pensiones                   |
| Inmobiliaria       | Portafolio, visitas, contratos, comisiones                          |
| Mecánica / náutica | Órdenes de trabajo, repuestos, historial por vehículo o embarcación |

### Cómo se ve el “OS” completo

| Capa             | Qué incluye                                                 |
| ---------------- | ----------------------------------------------------------- |
| **Núcleo**       | Terceros, usuarios, roles, bitácora, módulos activables     |
| **Comercial**    | CRM, cotizaciones, reservas, e-commerce, pagos              |
| **Comunicación** | WhatsApp/omnicanal, email, chatbot, helpdesk                |
| **Financiero**   | Caja menor, finanzas, ERP, facturación DIAN                 |
| **Operación**    | Proyectos, inventario, agenda, documentos, automatizaciones |
| **Personas**     | RR. HH., nómina, turnos                                     |
| **Inteligencia** | BI, reportes, IA asistente                                  |
| **Plataforma**   | API, marketplace, white-label, planes y cobros              |

### Qué priorizaría para tu plataforma

Lo que más valor da a negocios pequeños, y que probablemente aún te falta:

1. **Bandeja omnicanal de WhatsApp con chatbot IA.**
2. **Pagos online** (Wompi/Nequi) y links de cobro.
3. **Sitio web y motor de reservas** integrados al CRM.
4. **Automatizaciones** simples (recordatorios, seguimiento, cobros).
5. **Agenda/citas** y **documentos con firma**.
6. **Asistente IA global** que consulte los datos del negocio.
7. **Marketplace de módulos** y **white-label** para revender la plataforma.

Esto último es lo que convierte tu producto de “un sistema” en una **plataforma**: otros pueden vender y construir sobre ella.

\-------------------------------------------------------------------------------- 
