---
id: mapa-de-capacidades
titulo: "Mapa de capacidades empresariales vs. capas de NEXUS"
type: analisis
created: 2026-10-23
updated: 2026-10-23
tags: [guia, mercado, capas, ruta]
---

# Mapa de capacidades empresariales vs. capas de NEXUS

[← Guía](README.md) · Contrasta el inventario de **30 áreas y 447 capacidades** que
usa una empresa (de una persona a varios departamentos) con las capas de NEXUS y
con lo que existe hoy en el código. Sirve para separar **lo que NEXUS ya tiene**
de **lo que es visión**, y para decidir qué sigue.

| Estado | Significa |
| --- | --- |
| ✅ Hecho | Existe en el producto de punta a punta |
| 🟡 Parcial | Existe una parte, o existe solo en el panel interno de NEXUS y no para los negocios |
| 🏷️ De un rubro | Existe, pero solo para un rubro (construcción, gimnasio, museo) |
| ⬜ Falta | No existe; está prevista en una subcapa |
| 🔌 Integrar | Se decide integrar con un tercero, no construir (DIAN, contabilidad, nómina, n8n, Clerk…) |
| ➖ Fuera de alcance | No es para pymes ahora o lo da otra herramienta (correo corporativo, gestión de TI…) |

**Fase**: la de la [ruta de la guía](README.md#4-ruta-por-fases) según la subcapa
(2 cimientos · 3 vender, cobrar y facturar · 4 atender y automatizar · 5 que te
encuentren · 6 equipo y contabilidad). "—" = está en las capas sin fecha.

## 1. Resumen

| Estado | Capacidades |
| --- | --- |
| ✅ Hecho | 43 |
| 🟡 Parcial | 72 |
| 🏷️ De un rubro | 25 |
| ⬜ Falta | 237 |
| 🔌 Integrar | 30 |
| ➖ Fuera de alcance | 40 |
| **Total** | **447** |

### Por área

| # | Área | ✅ | 🟡 | 🏷️ | ⬜ | 🔌 | ➖ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | [Dirección y administración](#01-dirección-y-administración) | 1 |  | 1 | 5 |  | 3 |
| 02 | [Clientes y CRM](#02-clientes-y-crm) | 2 | 6 | 1 | 6 |  |  |
| 03 | [Marketing y presencia digital](#03-marketing-y-presencia-digital) |  | 1 |  | 14 | 1 |  |
| 04 | [Ventas, pedidos y POS](#04-ventas-pedidos-y-pos) | 1 | 4 | 1 | 9 |  | 1 |
| 05 | [Finanzas, tesorería y caja](#05-finanzas-tesorería-y-caja) | 4 | 5 |  | 9 |  | 2 |
| 06 | [Contabilidad e impuestos](#06-contabilidad-e-impuestos) | 1 | 1 |  | 4 | 12 |  |
| 07 | [Facturación y pagos](#07-facturación-y-pagos) | 2 | 5 |  | 8 | 1 |  |
| 08 | [Productos, servicios e inventario](#08-productos-servicios-e-inventario) | 4 | 6 |  | 8 |  |  |
| 09 | [Compras y proveedores](#09-compras-y-proveedores) |  |  | 1 | 13 |  |  |
| 10 | [Operaciones y procesos](#10-operaciones-y-procesos) |  | 4 | 3 | 8 |  |  |
| 11 | [Proyectos y servicios profesionales](#11-proyectos-y-servicios-profesionales) |  |  | 7 | 9 |  |  |
| 12 | [Recursos humanos](#12-recursos-humanos) |  |  |  | 16 | 2 |  |
| 13 | [Equipo, roles y colaboración](#13-equipo-roles-y-colaboración) | 3 | 3 |  | 6 | 1 | 2 |
| 14 | [Atención y soporte al cliente](#14-atención-y-soporte-al-cliente) |  | 4 |  | 11 |  |  |
| 15 | [Comunicación y mensajería](#15-comunicación-y-mensajería) | 2 | 5 |  | 7 |  |  |
| 16 | [Agenda, reservas y membresías](#16-agenda-reservas-y-membresías) | 5 | 4 | 4 | 2 |  |  |
| 17 | [Documentos, archivos y conocimiento](#17-documentos-archivos-y-conocimiento) | 2 | 2 | 1 | 10 |  |  |
| 18 | [Logística y distribución](#18-logística-y-distribución) |  |  |  | 8 | 4 | 2 |
| 19 | [Producción y fabricación](#19-producción-y-fabricación) |  |  | 2 | 10 |  | 2 |
| 20 | [Analítica e inteligencia empresarial](#20-analítica-e-inteligencia-empresarial) | 2 | 6 |  | 6 |  | 1 |
| 21 | [Automatización e inteligencia artificial](#21-automatización-e-inteligencia-artificial) | 1 | 2 |  | 12 | 1 |  |
| 22 | [Seguridad y control de acceso](#22-seguridad-y-control-de-acceso) | 5 | 3 |  | 5 | 4 |  |
| 23 | [TI e infraestructura](#23-ti-e-infraestructura) |  |  |  | 4 | 1 | 9 |
| 24 | [Legal, riesgos y cumplimiento](#24-legal-riesgos-y-cumplimiento) |  | 1 |  | 8 |  | 5 |
| 25 | [Activos, instalaciones y mantenimiento](#25-activos-instalaciones-y-mantenimiento) |  |  | 1 | 10 |  | 1 |
| 26 | [Comercio electrónico y canales digitales](#26-comercio-electrónico-y-canales-digitales) |  | 1 |  | 9 | 1 | 1 |
| 27 | [Investigación, producto e innovación](#27-investigación-producto-e-innovación) |  |  |  | 2 |  | 10 |
| 28 | [Funciones especializadas por sector](#28-funciones-especializadas-por-sector) |  | 2 | 3 | 6 |  | 1 |
| 29 | [Integraciones y ecosistema](#29-integraciones-y-ecosistema) |  | 4 |  | 8 | 2 |  |
| 30 | [Gestión del propio software SaaS](#30-gestión-del-propio-software-saas) | 8 | 3 |  | 4 |  |  |

<!-- analisis:inicio -->
### Qué dice el mapa

1. **Las capas cubren casi todo.** De 447 capacidades, 407 tienen una subcapa
   donde vivir. Las 40 que no (➖) son de TI interna, gestión de riesgos,
   investigación de producto o cosas que ya da Google o Microsoft (correo,
   documentos colaborativos). **No hace falta una capa nueva**: hace falta
   construir lo que ya está en las capas, en el orden correcto.
2. **NEXUS ya toca 140 capacidades (31 %)**: 43 hechas, 72 parciales y 25 de
   un rubro. La fuerza está concentrada en caja menor, membresías y agenda,
   acceso por QR/NFC, CRM de clientes, construcción y la operación del propio
   SaaS. Ninguna herramienta tipo Alegra tiene ese núcleo operativo por rubro.
3. **Mucho de lo "parcial" ya existe en el panel interno de NEXUS** (bandeja de
   WhatsApp y correo, tickets, embudo de prospectos, encuestas, salud de
   cuentas) pero no para los negocios. Es código que se puede reutilizar para
   ofrecérselo a ellos.
4. **Contra lo que usa una empresa pequeña** (las 14 necesidades típicas):

   | Necesidad | Estado |
   | --- | --- |
   | Clientes | ✅ |
   | Productos y servicios | ✅ |
   | Agenda | ✅ |
   | Equipo (usuarios, roles) | ✅ |
   | Seguridad | ✅ |
   | Ventas | 🟡 sin cotización genérica, pedidos ni carrito |
   | Finanzas | 🟡 sin cartera, abonos ni cuentas por pagar |
   | Inventario | 🟡 sin variantes, compras ni conteos |
   | Comunicación | 🟡 WhatsApp manual, sin correo |
   | Documentos | 🟡 adjuntos, sin plantillas ni firma |
   | Informes | 🟡 sin exportar clientes ni ventas |
   | **Facturación** | ⬜ **sin factura electrónica DIAN** |
   | Marketing | ⬜ |
   | Automatización | ⬜ |

### La cadena de una venta se rompe en tres puntos

El valor de un sistema operativo es que **una venta se registra una sola vez y
mueve todo lo demás**. Hoy:

| Paso | Estado |
| --- | --- |
| 1. Se identifica al cliente | ✅ CRM |
| 2. Se registra lo vendido | 🟡 un producto a la vez |
| 3. Se actualiza el inventario | ✅ `sellProduct` descuenta el stock |
| 4. **Se genera el documento comercial** | ⬜ **no hay documento unificado** |
| 5. Se registra el cobro y la caja | ✅ `money-service`, transaccional |
| 6. **Se actualiza la cartera si queda debiendo** | ⬜ **no hay cartera ni abonos** |
| 7. Se guarda para los informes | 🟡 métricas sueltas por módulo |
| 8. **Se dispara una automatización** | ⬜ **no hay eventos** |

La razón de fondo: **hoy una venta vive en cinco formas distintas** según el
módulo. La venta directa es un `Payment`; recibos y cuentas de cobro son
`Invoice` (sin impuestos ni descuentos); la taquilla es `TicketSale`; las
cotizaciones de obra son `Quote`; las membresías son cobros sueltos. Sin un
documento común no hay factura DIAN, ni cartera, ni POS de varias líneas, ni un
agente que pueda responder "¿cómo nos fue hoy?" con datos confiables.

## Qué es lo siguiente, en realidad

No es la IA ni la DIAN directamente: es **el documento comercial unificado**,
porque todo lo demás se apoya en él.

| # | Qué | Subcapas | Por qué ahora |
| --- | --- | --- | --- |
| **0** | **Códigos de activación a medida** (precio, módulos y límites por cliente) | X.00 | Es lo que te deja cobrar hoy. Pequeño e independiente: va en paralelo |
| **1** | **Registro de capacidades y separar construcción de cotizaciones** | X.00, IV.02 | Los pasos siguientes agregan módulos; hoy cada módulo se declara en 5 sitios (ARCH-01). Corto y técnico |
| **2** | **Documento comercial unificado**: cotización → pedido → factura o recibo → nota crédito, con líneas de varios productos, impuestos por línea, descuentos, estados y numeración. Venta directa, taquilla y membresías pasan a generar este documento | I.00 (N1), V.06 | Cierra el paso 4 de la cadena y es la base de todo lo que sigue |
| **3** | **Cartera**: abonos y pagos parciales sobre el documento, cuentas por cobrar por antigüedad, recordatorios | VII.02 | Cierra el paso 6; usa el servicio de dinero que ya existe |
| **4** | **POS de varias líneas** sobre el documento (carrito, descuento, pago mixto) | V.03 | La venta de mostrador real |
| **5** | **Tercero único mínimo** (tipo y número de documento, NIT con DV, régimen) e **importar/exportar** clientes y catálogo | I.00, I.01, IV.00 | Requisito de la DIAN y lo primero que pide quien llega desde Excel o desde Alegra |
| **6** | **Factura electrónica por proveedor tecnológico** y **Nequi** | VII.04, V.00 | Con el documento listo, facturar es "enviar este documento"; cobrar con Nequi es "pagar este documento" |
| **7** | **Eventos (outbox) → API `/api/v1` → agente de consulta → n8n y WhatsApp** | I.05, X.02, IX.04, VI.08, III.01 | El agente y las automatizaciones ya tienen datos confiables y un evento por cada venta |

**Qué no hacer todavía**: talento humano y nómina (VIII), producción (VI.07),
logística (área 18), tienda en línea completa (V.04), telefonía (III.03) y
marketing automatizado (II.05). Están en las capas; no mueven la venta diaria
ni la decisión de compra de una pyme hoy.

**Criterio para cerrar el paso 2**: una venta en mostrador, una entrada de
museo y una renovación de membresía generan el mismo tipo de documento; el
informe de ventas del día sale de una sola tabla; anular emite una nota
crédito en vez de borrar.
<!-- analisis:fin -->

## 2. Detalle por área

### 01. Dirección y administración

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Panel ejecutivo y dashboard de indicadores | ✅ Hecho | [IX.00](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/00-Dashboards-y-Analitica-Operativa/README.md) | hecho | Inicio con KPI del negocio |
| Planificación estratégica y objetivos | ➖ Fuera de alcance | — | — |  |
| Gestión de sucursales y sedes | ⬜ Falta | [I.04](capas/I-Fundacion-Nucleo-e-Infraestructura/04-Multi-Tenancy-y-Aislamiento-de-Datos/README.md) | — | N2 "Sedes y equipos" |
| Presupuestos departamentales | ⬜ Falta | [VII.06](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/06-Presupuestos-y-Centros-de-Costo/README.md) | — |  |
| Plan de negocio | ➖ Fuera de alcance | — | — |  |
| Organigrama y estructura empresarial | ⬜ Falta | [VIII.00](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/00-Expediente-del-Empleado-y-Contratos/README.md) | 6 |  |
| Gestión de políticas internas | ⬜ Falta | [VI.02](capas/VI-Operacion-Productividad-y-Logistica/02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | — |  |
| Reuniones y actas | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | actas de avance de obra |
| Gestión de decisiones | ➖ Fuera de alcance | — | — |  |
| Cuadro de mando integral | ⬜ Falta | [IX.00](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/00-Dashboards-y-Analitica-Operativa/README.md) | 6 |  |

### 02. Clientes y CRM

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Base de datos de clientes | ✅ Hecho | [IV.00](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/00-Perfil-Integral-del-Cliente-CRM-360/README.md) | hecho |  |
| CRM 360° e historial de interacciones | ✅ Hecho | [IV.00](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/00-Perfil-Integral-del-Cliente-CRM-360/README.md) | hecho | ficha 360° con pagos, membresías, notas y línea de tiempo |
| Segmentación de clientes | 🟡 Parcial | [IV.00](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/00-Perfil-Integral-del-Cliente-CRM-360/README.md) | 2 | etiquetas y filtros |
| Gestión de prospectos y leads | 🟡 Parcial | [IV.03](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/03-Calificacion-y-Asignacion-de-Prospectos/README.md) | — | existe en el panel de NEXUS, no para los negocios |
| Embudo comercial | 🟡 Parcial | [IV.01](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/01-Embudos-Comerciales-y-Oportunidades/README.md) | — | existe en el panel de NEXUS, no para los negocios |
| Oportunidades de venta | ⬜ Falta | [IV.01](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/01-Embudos-Comerciales-y-Oportunidades/README.md) | — |  |
| Seguimiento de llamadas y reuniones | ⬜ Falta | [III.03](capas/III-Atencion-y-Comunicacion/03-Telefonia-Voip-e-Integracion-de-Llamadas/README.md) | — |  |
| Tareas comerciales | ⬜ Falta | [IV.01](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/01-Embudos-Comerciales-y-Oportunidades/README.md) | — |  |
| Cotizaciones y propuestas | 🏷️ De un rubro | [IV.02](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/02-Cotizaciones-y-Propuestas-Comerciales/README.md) | 2 | solo construcción |
| Contratos con clientes | ⬜ Falta | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — |  |
| Gestión de cuentas empresariales | ⬜ Falta | [IV.00](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/00-Perfil-Integral-del-Cliente-CRM-360/README.md) | 2 | N2 "Varios contactos por empresa" |
| Fidelización y puntos | ⬜ Falta | [II.04](capas/II-Visibilidad-Captacion-y-Presencia-Digital/04-Fidelizacion-Puntos-Cupones-y-Referidos/README.md) | 5 |  |
| Encuestas de satisfacción | 🟡 Parcial | [III.04](capas/III-Atencion-y-Comunicacion/04-Encuestas-de-Satisfaccion-y-Reputacion/README.md) | — | el panel de NEXUS encuesta a sus clientes |
| Customer success | 🟡 Parcial | [IV.00](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/00-Perfil-Integral-del-Cliente-CRM-360/README.md) | 2 | salud de cuentas en el panel de NEXUS |
| Renovaciones y retención | 🟡 Parcial | [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) | 4 | renovación y vencimientos de membresías |

### 03. Marketing y presencia digital

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Sitio web empresarial | ⬜ Falta | [II.00](capas/II-Visibilidad-Captacion-y-Presencia-Digital/00-Sitios-Web-Landing-Pages-y-Cms/README.md) | 5 | Presence diagnostica y el equipo NEXUS hace el sitio a pedido |
| Landing pages | ⬜ Falta | [II.00](capas/II-Visibilidad-Captacion-y-Presencia-Digital/00-Sitios-Web-Landing-Pages-y-Cms/README.md) | 5 |  |
| Blog y contenido | ⬜ Falta | [II.00](capas/II-Visibilidad-Captacion-y-Presencia-Digital/00-Sitios-Web-Landing-Pages-y-Cms/README.md) | 5 |  |
| Gestión de redes sociales | ⬜ Falta | [II.06](capas/II-Visibilidad-Captacion-y-Presencia-Digital/06-Redes-Sociales-y-Contenido/README.md) | 5 |  |
| Calendario editorial | ⬜ Falta | [II.06](capas/II-Visibilidad-Captacion-y-Presencia-Digital/06-Redes-Sociales-y-Contenido/README.md) | 5 |  |
| Diseño gráfico | 🔌 Integrar | [II.06](capas/II-Visibilidad-Captacion-y-Presencia-Digital/06-Redes-Sociales-y-Contenido/README.md) | 5 | integrar editor (tipo Canva) |
| Gestión de campañas publicitarias | ⬜ Falta | [II.02](capas/II-Visibilidad-Captacion-y-Presencia-Digital/02-Publicidad-Digital-y-Atribucion-Multicanal/README.md) | — |  |
| Email marketing | ⬜ Falta | [II.05](capas/II-Visibilidad-Captacion-y-Presencia-Digital/05-Email-y-Whatsapp-Marketing/README.md) | 4 |  |
| SMS y mensajería comercial | ⬜ Falta | [II.05](capas/II-Visibilidad-Captacion-y-Presencia-Digital/05-Email-y-Whatsapp-Marketing/README.md) | 4 |  |
| SEO y posicionamiento | 🟡 Parcial | [II.01](capas/II-Visibilidad-Captacion-y-Presencia-Digital/01-SEO-Tecnico-y-Posicionamiento-Local/README.md) | 5 | Presence mide la presencia |
| Gestión de reputación y reseñas | ⬜ Falta | [III.04](capas/III-Atencion-y-Comunicacion/04-Encuestas-de-Satisfaccion-y-Reputacion/README.md) | — |  |
| Generación de leads | ⬜ Falta | [IV.03](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/03-Calificacion-y-Asignacion-de-Prospectos/README.md) | — |  |
| Formularios y captación | ⬜ Falta | [II.03](capas/II-Visibilidad-Captacion-y-Presencia-Digital/03-Formularios-Enlaces-Cortos-y-Codigos-Qr/README.md) | — |  |
| Automatización de marketing | ⬜ Falta | [II.05](capas/II-Visibilidad-Captacion-y-Presencia-Digital/05-Email-y-Whatsapp-Marketing/README.md) | 4 |  |
| Analítica de campañas | ⬜ Falta | [II.02](capas/II-Visibilidad-Captacion-y-Presencia-Digital/02-Publicidad-Digital-y-Atribucion-Multicanal/README.md) | — |  |
| Gestión de marca y recursos digitales | ⬜ Falta | [II.06](capas/II-Visibilidad-Captacion-y-Presencia-Digital/06-Redes-Sociales-y-Contenido/README.md) | 5 |  |

### 04. Ventas, pedidos y POS

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Punto de venta (POS) | 🟡 Parcial | [V.03](capas/V-Ventas-Digitales-Comercio-y-Pagos/03-Punto-de-Venta-Fisico-y-Movil-POS/README.md) | 3 | venta de un producto a la vez |
| Ventas en mostrador | ✅ Hecho | [V.03](capas/V-Ventas-Digitales-Comercio-y-Pagos/03-Punto-de-Venta-Fisico-y-Movil-POS/README.md) | hecho | venta directa desde el Catálogo con recibo |
| Ventas B2B y B2C | 🟡 Parcial | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 | cuentas de cobro y recibos |
| Carrito de compras | ⬜ Falta | [V.03](capas/V-Ventas-Digitales-Comercio-y-Pagos/03-Punto-de-Venta-Fisico-y-Movil-POS/README.md) | 3 |  |
| Pedidos y órdenes de venta | ⬜ Falta | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 | el módulo Pedidos es solo una pantalla vacía |
| Listas de precios | ⬜ Falta | [I.01](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md) | 2 |  |
| Descuentos y promociones | ⬜ Falta | [V.03](capas/V-Ventas-Digitales-Comercio-y-Pagos/03-Punto-de-Venta-Fisico-y-Movil-POS/README.md) | 3 |  |
| Combos y paquetes | ⬜ Falta | [I.01](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md) | 2 |  |
| Comisiones de vendedores | ⬜ Falta | [IV.04](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/04-Metas-Comisiones-e-Incentivos-Comerciales/README.md) | — |  |
| Metas comerciales | ⬜ Falta | [IV.04](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/04-Metas-Comisiones-e-Incentivos-Comerciales/README.md) | — |  |
| Devoluciones y reembolsos | 🟡 Parcial | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 | anulación de cobros con motivo |
| Canales de venta | ⬜ Falta | [V.07](capas/V-Ventas-Digitales-Comercio-y-Pagos/07-Marketplace-y-Distribucion-Multicanal/README.md) | — |  |
| Reservas con pago | 🏷️ De un rubro | [V.05](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md) | 5 | taquilla del museo con pago y aforo |
| Ventas recurrentes | 🟡 Parcial | [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) | 4 | membresías con renovación manual |
| Comercio electrónico | ⬜ Falta | [V.04](capas/V-Ventas-Digitales-Comercio-y-Pagos/04-Comercio-Electronico/README.md) | 5 |  |
| Gestión de distribuidores | ➖ Fuera de alcance | — | — |  |

### 05. Finanzas, tesorería y caja

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Flujo de caja | 🟡 Parcial | [VII.07](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/07-Tesoreria-Bancos-y-Liquidez/README.md) | — | ingresos, gastos y saldo |
| Caja menor | ✅ Hecho | [VII.00](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/00-Caja-Menor-y-Arqueos/README.md) | hecho |  |
| Apertura y cierre de caja | ✅ Hecho | [VII.00](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/00-Caja-Menor-y-Arqueos/README.md) | hecho |  |
| Arqueos y diferencias | ✅ Hecho | [VII.00](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/00-Caja-Menor-y-Arqueos/README.md) | hecho |  |
| Cuentas por cobrar | 🟡 Parcial | [VII.02](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/02-Cuentas-por-Cobrar-Cuentas-por-Pagar-y-Cartera/README.md) | 3 | cuentas de cobro |
| Cuentas por pagar | ⬜ Falta | [VII.02](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/02-Cuentas-por-Cobrar-Cuentas-por-Pagar-y-Cartera/README.md) | 3 |  |
| Registro de ingresos y gastos | ✅ Hecho | [VII.00](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/00-Caja-Menor-y-Arqueos/README.md) | hecho |  |
| Conciliación bancaria | ⬜ Falta | [VII.07](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/07-Tesoreria-Bancos-y-Liquidez/README.md) | — |  |
| Presupuesto financiero | ⬜ Falta | [VII.06](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/06-Presupuestos-y-Centros-de-Costo/README.md) | — |  |
| Proyección de efectivo | ⬜ Falta | [VII.07](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/07-Tesoreria-Bancos-y-Liquidez/README.md) | — |  |
| Gestión de deudas | ⬜ Falta | [VII.02](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/02-Cuentas-por-Cobrar-Cuentas-por-Pagar-y-Cartera/README.md) | 3 |  |
| Préstamos y financiación | ➖ Fuera de alcance | — | — |  |
| Centros de costos | ⬜ Falta | [VII.06](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/06-Presupuestos-y-Centros-de-Costo/README.md) | — |  |
| Control de gastos por empleado | 🟡 Parcial | [VII.01](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/01-Vales-Anticipos-y-Legalizaciones/README.md) | — | vales de caja menor |
| Gestión de activos fijos | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Rentabilidad por producto | ⬜ Falta | [IX.02](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/02-Analitica-de-Clientes-y-Comportamiento-Comercial/README.md) | — |  |
| Rentabilidad por cliente | 🟡 Parcial | [IX.02](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/02-Analitica-de-Clientes-y-Comportamiento-Comercial/README.md) | — | totales en la ficha 360° |
| Consolidación financiera | ➖ Fuera de alcance | — | — |  |
| Gestión de tesorería | ⬜ Falta | [VII.07](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/07-Tesoreria-Bancos-y-Liquidez/README.md) | — |  |
| Informes financieros | 🟡 Parcial | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 | métricas de Finanzas |

### 06. Contabilidad e impuestos

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Plan de cuentas | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 | exportar al contador o integrar software contable |
| Libro diario y mayor | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 |  |
| Asientos contables | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 |  |
| Balance general | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 |  |
| Estado de resultados | 🟡 Parcial | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 | ingresos menos gastos |
| Estado de flujo de efectivo | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 |  |
| Cierres contables | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 |  |
| Cuentas contables por pagar y cobrar | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 |  |
| Depreciaciones | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 |  |
| Retenciones e impuestos | ⬜ Falta | [VII.03](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/03-Documentos-Transaccionales-y-Reglas-Fiscales/README.md) | 3 | impuestos por ítem son requisito de la factura DIAN |
| Impuestos locales | ⬜ Falta | [VII.03](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/03-Documentos-Transaccionales-y-Reglas-Fiscales/README.md) | 3 |  |
| Informes fiscales | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 |  |
| Auditoría contable | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 |  |
| Soportes y comprobantes | ✅ Hecho | [VII.00](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/00-Caja-Menor-y-Arqueos/README.md) | hecho | soporte de cada gasto con escaneo OCR |
| Integración con bancos | ⬜ Falta | [VII.07](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/07-Tesoreria-Bancos-y-Liquidez/README.md) | — |  |
| Facturación electrónica | 🔌 Integrar | [VII.04](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/04-Facturacion-Electronica-y-RADIAN/README.md) | 3 | por proveedor tecnológico (objetivo) |
| Notas crédito y débito | ⬜ Falta | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 |  |
| Gestión de obligaciones tributarias | 🔌 Integrar | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 |  |

### 07. Facturación y pagos

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Facturas comerciales | 🟡 Parcial | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 | recibos y cuentas de cobro |
| Cuentas de cobro | ✅ Hecho | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | hecho |  |
| Recibos de caja | ✅ Hecho | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | hecho | recibo consecutivo con enlace público y QR |
| Abonos y pagos parciales | ⬜ Falta | [VII.02](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/02-Cuentas-por-Cobrar-Cuentas-por-Pagar-y-Cartera/README.md) | 3 |  |
| Planes de pago | ⬜ Falta | [VII.02](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/02-Cuentas-por-Cobrar-Cuentas-por-Pagar-y-Cartera/README.md) | 3 |  |
| Cobros recurrentes | ⬜ Falta | [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) | 4 |  |
| Pasarelas de pago | ⬜ Falta | [V.00](capas/V-Ventas-Digitales-Comercio-y-Pagos/00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md) | 3 | objetivo: Nequi / Wompi |
| Enlaces de pago | ⬜ Falta | [V.01](capas/V-Ventas-Digitales-Comercio-y-Pagos/01-Enlaces-y-Solicitudes-de-Cobro/README.md) | 3 |  |
| Pagos con QR | ⬜ Falta | [V.00](capas/V-Ventas-Digitales-Comercio-y-Pagos/00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md) | 3 | objetivo: QR dinámico de Nequi |
| Integración con datáfonos | 🔌 Integrar | [V.03](capas/V-Ventas-Digitales-Comercio-y-Pagos/03-Punto-de-Venta-Fisico-y-Movil-POS/README.md) | 3 |  |
| Gestión de suscripciones | 🟡 Parcial | [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) | 4 | membresías |
| Reembolsos | 🟡 Parcial | [V.00](capas/V-Ventas-Digitales-Comercio-y-Pagos/00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md) | 3 | anulación de cobro con devolución a caja |
| Control de pagos fallidos | ⬜ Falta | [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) | 4 |  |
| Recordatorios de vencimiento | 🟡 Parcial | [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) | 4 | recordatorio manual por WhatsApp |
| Gestión de cartera | ⬜ Falta | [VII.02](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/02-Cuentas-por-Cobrar-Cuentas-por-Pagar-y-Cartera/README.md) | 3 |  |
| Validación de comprobantes de pago | 🟡 Parcial | [VII.00](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/00-Caja-Menor-y-Arqueos/README.md) | — | escaneo del comprobante |

### 08. Productos, servicios e inventario

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Catálogo de productos | ✅ Hecho | [I.01](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md) | hecho |  |
| Catálogo de servicios | ✅ Hecho | [I.01](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md) | hecho | servicios, planes, entradas y tours |
| Variantes y atributos | ⬜ Falta | [I.01](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md) | 2 |  |
| SKU y códigos de barras | 🟡 Parcial | [I.01](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md) | 2 | SKU sí |
| Etiquetas y QR | 🟡 Parcial | [II.03](capas/II-Visibilidad-Captacion-y-Presencia-Digital/03-Formularios-Enlaces-Cortos-y-Codigos-Qr/README.md) | — | QR en recibos y carné |
| Control de existencias | ✅ Hecho | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | hecho |  |
| Stock mínimo y máximo | 🟡 Parcial | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 | mínimo con aviso |
| Kardex y movimientos | 🟡 Parcial | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 | historial de movimientos |
| Lotes y números de serie | ⬜ Falta | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 |  |
| Vencimientos | ⬜ Falta | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 |  |
| Transferencias entre bodegas | ⬜ Falta | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 |  |
| Conteos físicos | ⬜ Falta | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 |  |
| Ajustes de inventario | ✅ Hecho | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | hecho | con motivo obligatorio |
| Costeo de productos | 🟡 Parcial | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 | costo por producto |
| Kits y componentes | ⬜ Falta | [VI.07](capas/VI-Operacion-Productividad-y-Logistica/07-Produccion-y-Planeacion/README.md) | — |  |
| Reservas de stock | ⬜ Falta | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 |  |
| Trazabilidad | 🟡 Parcial | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 | quién movió qué y cuándo |
| Inventario de activos y herramientas | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |

### 09. Compras y proveedores

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Directorio de proveedores | ⬜ Falta | [I.00](capas/I-Fundacion-Nucleo-e-Infraestructura/00-Nucleo-Transversal-y-Modelo-de-Tercero-Unico/README.md) | 2 | tercero único (hoy solo un texto en el gasto) |
| Solicitudes de compra | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |
| Órdenes de compra | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |
| Solicitudes de cotización | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |
| Comparación de ofertas | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |
| Aprobación de compras | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |
| Recepción de mercancía | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |
| Evaluación de proveedores | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |
| Contratos de suministro | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |
| Cuentas por pagar | ⬜ Falta | [VII.02](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/02-Cuentas-por-Cobrar-Cuentas-por-Pagar-y-Cartera/README.md) | 3 |  |
| Devoluciones a proveedores | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |
| Historial de precios | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | historial de precios de insumos APU |
| Control de gastos de adquisición | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |
| Abastecimiento automático | ⬜ Falta | [VI.05](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md) | 3 |  |

### 10. Operaciones y procesos

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Gestión de procesos empresariales | ⬜ Falta | [VI.02](capas/VI-Operacion-Productividad-y-Logistica/02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | — |  |
| Flujos de trabajo | ⬜ Falta | [VI.08](capas/VI-Operacion-Productividad-y-Logistica/08-Automatizaciones-y-Flujos-de-Trabajo/README.md) | 4 |  |
| Procedimientos operativos | ⬜ Falta | [VI.02](capas/VI-Operacion-Productividad-y-Logistica/02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | — |  |
| Listas de verificación | ⬜ Falta | [VI.02](capas/VI-Operacion-Productividad-y-Logistica/02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | — |  |
| Órdenes de trabajo | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Asignación de responsables | 🟡 Parcial | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — | responsable en citas, cajas y obras |
| Seguimiento de operaciones | 🟡 Parcial | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — | avance de obra |
| Control de calidad | ⬜ Falta | [VI.02](capas/VI-Operacion-Productividad-y-Logistica/02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | — |  |
| Gestión de incidencias | ⬜ Falta | [VI.02](capas/VI-Operacion-Productividad-y-Logistica/02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | — |  |
| Gestión de capacidad | 🟡 Parcial | [V.05](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md) | 5 | cupos de agenda y aforo de taquilla |
| Planificación de recursos | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | Lean y recursos del presupuesto |
| Tiempos de ejecución | ⬜ Falta | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — |  |
| Gestión de turnos operativos | 🟡 Parcial | [VII.00](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/00-Caja-Menor-y-Arqueos/README.md) | — | turnos de caja |
| Mejora continua | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | causas de no cumplimiento (Lean) |
| Indicadores de productividad | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | PPC del planificador Lean |

### 11. Proyectos y servicios profesionales

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Gestión de proyectos | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | obras completas |
| Tareas y subtareas | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | tareas del lookahead Lean |
| Tableros Kanban | ⬜ Falta | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — |  |
| Cronogramas y Gantt | ⬜ Falta | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — |  |
| Hitos y entregables | ⬜ Falta | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — |  |
| Asignación de equipo | ⬜ Falta | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — |  |
| Horas trabajadas | ⬜ Falta | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — |  |
| Costos por proyecto | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | presupuesto y avance de obra |
| Presupuestos de proyecto | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | APU, AIU, línea base y bloqueo |
| Cotizaciones de servicios | 🏷️ De un rubro | [IV.02](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/02-Cotizaciones-y-Propuestas-Comerciales/README.md) | 2 | cotizaciones de obra |
| Contratos y alcance | ⬜ Falta | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — |  |
| Control de cambios | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | línea base y bloqueo del presupuesto |
| Riesgos de proyecto | ⬜ Falta | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — |  |
| Informes de avance | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | actas e informes semanales |
| Facturación por proyecto | ⬜ Falta | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 |  |
| Gestión de portafolio | ⬜ Falta | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — |  |

### 12. Recursos humanos

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Expedientes del personal | ⬜ Falta | [VIII.00](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/00-Expediente-del-Empleado-y-Contratos/README.md) | 6 |  |
| Reclutamiento | ⬜ Falta | [VIII.01](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/01-Reclutamiento-y-Seleccion/README.md) | — |  |
| Seguimiento de candidatos | ⬜ Falta | [VIII.01](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/01-Reclutamiento-y-Seleccion/README.md) | — |  |
| Contratación y onboarding | ⬜ Falta | [VIII.01](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/01-Reclutamiento-y-Seleccion/README.md) | — |  |
| Organigrama | ⬜ Falta | [VIII.00](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/00-Expediente-del-Empleado-y-Contratos/README.md) | 6 |  |
| Gestión de cargos | ⬜ Falta | [VIII.00](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/00-Expediente-del-Empleado-y-Contratos/README.md) | 6 |  |
| Asistencia y puntualidad | ⬜ Falta | [VIII.02](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/02-Asistencia-Horarios-y-Turnos/README.md) | 6 |  |
| Control de horarios | ⬜ Falta | [VIII.02](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/02-Asistencia-Horarios-y-Turnos/README.md) | 6 |  |
| Turnos laborales | ⬜ Falta | [VIII.02](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/02-Asistencia-Horarios-y-Turnos/README.md) | 6 |  |
| Vacaciones y permisos | ⬜ Falta | [VIII.00](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/00-Expediente-del-Empleado-y-Contratos/README.md) | 6 |  |
| Nómina | 🔌 Integrar | [VIII.03](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/03-Nomina-Electronica-y-Prestaciones-Sociales/README.md) | 6 | nómina electrónica por proveedor |
| Prestaciones y beneficios | 🔌 Integrar | [VIII.03](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/03-Nomina-Electronica-y-Prestaciones-Sociales/README.md) | 6 |  |
| Evaluación de desempeño | ⬜ Falta | [VIII.07](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/07-Evaluacion-de-Desempeno-y-Compensacion-Laboral/README.md) | — |  |
| Capacitación | ⬜ Falta | [VIII.05](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/05-Formacion-Induccion-y-Certificaciones/README.md) | — |  |
| Gestión de competencias | ⬜ Falta | [VIII.05](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/05-Formacion-Induccion-y-Certificaciones/README.md) | — |  |
| Clima organizacional | ⬜ Falta | [VIII.06](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/06-Comunicacion-Interna-del-Equipo/README.md) | — |  |
| Desvinculación | ⬜ Falta | [VIII.00](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/00-Expediente-del-Empleado-y-Contratos/README.md) | 6 |  |
| Portal del empleado | ⬜ Falta | [VIII.04](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/04-Portal-del-Empleado-y-Autogestion/README.md) | — |  |

### 13. Equipo, roles y colaboración

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Invitaciones al equipo | ✅ Hecho | [I.02](capas/I-Fundacion-Nucleo-e-Infraestructura/02-Autenticacion-Usuarios-e-Identidad-Unificada/README.md) | hecho | invitación por enlace con rol |
| Usuarios y perfiles | ✅ Hecho | [I.02](capas/I-Fundacion-Nucleo-e-Infraestructura/02-Autenticacion-Usuarios-e-Identidad-Unificada/README.md) | hecho |  |
| Roles y permisos | ✅ Hecho | [I.03](capas/I-Fundacion-Nucleo-e-Infraestructura/03-Permisos-Granulares-y-Control-de-Acceso-RBAC-ABAC/README.md) | hecho | matriz única de permisos |
| Grupos y departamentos | ⬜ Falta | [I.04](capas/I-Fundacion-Nucleo-e-Infraestructura/04-Multi-Tenancy-y-Aislamiento-de-Datos/README.md) | — |  |
| Calendarios compartidos | 🟡 Parcial | [VI.01](capas/VI-Operacion-Productividad-y-Logistica/01-Agenda-y-Sincronizacion-de-Calendarios/README.md) | 4 | agenda del negocio con responsable |
| Chat interno | ⬜ Falta | [VIII.06](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/06-Comunicacion-Interna-del-Equipo/README.md) | — |  |
| Videoconferencias | 🔌 Integrar | [III.03](capas/III-Atencion-y-Comunicacion/03-Telefonia-Voip-e-Integracion-de-Llamadas/README.md) | — | enlace de Meet o Zoom |
| Correo corporativo | ➖ Fuera de alcance | — | — | lo da Google o Microsoft |
| Documentos colaborativos | ➖ Fuera de alcance | — | — | lo da Google o Microsoft |
| Tareas asignadas | 🟡 Parcial | [VI.00](capas/VI-Operacion-Productividad-y-Logistica/00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | — | tareas Lean de la obra |
| Anuncios internos | ⬜ Falta | [VIII.06](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/06-Comunicacion-Interna-del-Equipo/README.md) | — |  |
| Directorio interno | 🟡 Parcial | [VIII.06](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/06-Comunicacion-Interna-del-Equipo/README.md) | — | lista del equipo en Ajustes |
| Gestión de disponibilidad | ⬜ Falta | [VI.01](capas/VI-Operacion-Productividad-y-Logistica/01-Agenda-y-Sincronizacion-de-Calendarios/README.md) | 4 |  |
| Aprobaciones | ⬜ Falta | [I.00](capas/I-Fundacion-Nucleo-e-Infraestructura/00-Nucleo-Transversal-y-Modelo-de-Tercero-Unico/README.md) | 2 | motor de aprobaciones del núcleo |
| Encuestas internas | ⬜ Falta | [VIII.06](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/06-Comunicacion-Interna-del-Equipo/README.md) | — |  |

### 14. Atención y soporte al cliente

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Tickets de soporte | 🟡 Parcial | [III.02](capas/III-Atencion-y-Comunicacion/02-Helpdesk-Tickets-y-SLA/README.md) | — | existe en el panel de NEXUS, no para los negocios |
| Bandeja unificada | 🟡 Parcial | [III.00](capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) | 4 | existe en el panel de NEXUS (WhatsApp y correo) |
| Chat en vivo | ⬜ Falta | [III.00](capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) | 4 |  |
| Chatbot de atención | ⬜ Falta | [III.01](capas/III-Atencion-y-Comunicacion/01-Agentes-Conversacionales-e-Inteligencia-Artificial/README.md) | 4 | objetivo: asistente por WhatsApp |
| Centro de ayuda | 🟡 Parcial | [X.04](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/04-Centro-de-Ayuda-y-Onboarding/README.md) | — | el de NEXUS |
| Base de conocimiento | ⬜ Falta | [III.02](capas/III-Atencion-y-Comunicacion/02-Helpdesk-Tickets-y-SLA/README.md) | — |  |
| Preguntas frecuentes | ⬜ Falta | [III.01](capas/III-Atencion-y-Comunicacion/01-Agentes-Conversacionales-e-Inteligencia-Artificial/README.md) | 4 |  |
| Asignación de agentes | ⬜ Falta | [III.00](capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) | 4 |  |
| SLA y tiempos de respuesta | ⬜ Falta | [III.02](capas/III-Atencion-y-Comunicacion/02-Helpdesk-Tickets-y-SLA/README.md) | — |  |
| Escalamiento de casos | ⬜ Falta | [III.02](capas/III-Atencion-y-Comunicacion/02-Helpdesk-Tickets-y-SLA/README.md) | — |  |
| Reclamos y devoluciones | ⬜ Falta | [III.02](capas/III-Atencion-y-Comunicacion/02-Helpdesk-Tickets-y-SLA/README.md) | — |  |
| Garantías | ⬜ Falta | [III.02](capas/III-Atencion-y-Comunicacion/02-Helpdesk-Tickets-y-SLA/README.md) | — |  |
| Encuestas postventa | ⬜ Falta | [III.04](capas/III-Atencion-y-Comunicacion/04-Encuestas-de-Satisfaccion-y-Reputacion/README.md) | — |  |
| Historial de atención | 🟡 Parcial | [IV.00](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/00-Perfil-Integral-del-Cliente-CRM-360/README.md) | 2 | notas en la ficha del cliente |
| Gestión de quejas | ⬜ Falta | [III.02](capas/III-Atencion-y-Comunicacion/02-Helpdesk-Tickets-y-SLA/README.md) | — |  |

### 15. Comunicación y mensajería

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| WhatsApp Business | 🟡 Parcial | [III.00](capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) | 4 | abre WhatsApp con plantilla |
| Correo transaccional | 🟡 Parcial | [III.00](capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) | 4 | solo en el panel de NEXUS |
| SMS | ⬜ Falta | [II.05](capas/II-Visibilidad-Captacion-y-Presencia-Digital/05-Email-y-Whatsapp-Marketing/README.md) | 4 |  |
| Notificaciones push | ⬜ Falta | [II.05](capas/II-Visibilidad-Captacion-y-Presencia-Digital/05-Email-y-Whatsapp-Marketing/README.md) | 4 |  |
| Notificaciones internas | ✅ Hecho | [IX.05](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/05-Deteccion-de-Anomalias-y-Alertas-Tempranas/README.md) | hecho | avisos en la barra |
| Plantillas de mensajes | ✅ Hecho | [III.01](capas/III-Atencion-y-Comunicacion/01-Agentes-Conversacionales-e-Inteligencia-Artificial/README.md) | hecho | plantillas del módulo WhatsApp |
| Campañas de mensajería | ⬜ Falta | [II.05](capas/II-Visibilidad-Captacion-y-Presencia-Digital/05-Email-y-Whatsapp-Marketing/README.md) | 4 |  |
| Bandeja multicanal | 🟡 Parcial | [III.00](capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) | 4 | solo en el panel de NEXUS |
| Registro de conversaciones | 🟡 Parcial | [III.00](capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) | 4 | solo en el panel de NEXUS |
| Recordatorios automáticos | ⬜ Falta | [VI.01](capas/VI-Operacion-Productividad-y-Logistica/01-Agenda-y-Sincronizacion-de-Calendarios/README.md) | 4 |  |
| Central telefónica y VoIP | ⬜ Falta | [III.03](capas/III-Atencion-y-Comunicacion/03-Telefonia-Voip-e-Integracion-de-Llamadas/README.md) | — |  |
| Grabación autorizada de llamadas | ⬜ Falta | [III.03](capas/III-Atencion-y-Comunicacion/03-Telefonia-Voip-e-Integracion-de-Llamadas/README.md) | — |  |
| Envío de documentos | 🟡 Parcial | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 | compartir recibo como imagen o enlace |
| Preferencias y consentimiento de comunicación | ⬜ Falta | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — |  |

### 16. Agenda, reservas y membresías

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Calendario de citas | ✅ Hecho | [VI.01](capas/VI-Operacion-Productividad-y-Logistica/01-Agenda-y-Sincronizacion-de-Calendarios/README.md) | hecho |  |
| Disponibilidad de recursos | 🟡 Parcial | [V.05](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md) | 5 | cupos por cita |
| Reservas de espacios | ⬜ Falta | [V.05](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md) | 5 |  |
| Gestión de turnos | 🟡 Parcial | [V.05](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md) | 5 | franjas de la taquilla |
| Recordatorios de citas | 🟡 Parcial | [VI.01](capas/VI-Operacion-Productividad-y-Logistica/01-Agenda-y-Sincronizacion-de-Calendarios/README.md) | 4 | manual por WhatsApp |
| Control de aforo | 🏷️ De un rubro | [V.05](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md) | 5 | aforo por franja en museos |
| Listas de espera | ⬜ Falta | [V.05](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md) | 5 |  |
| Membresías y suscripciones | ✅ Hecho | [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) | hecho |  |
| Planes y beneficios | ✅ Hecho | [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) | hecho | planes del catálogo |
| Renovaciones y vencimientos | ✅ Hecho | [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) | hecho | renovar y lista de vencimientos |
| Congelación de membresías | ✅ Hecho | [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) | hecho | congelar y reanudar con días devueltos |
| Check-in y check-out | 🏷️ De un rubro | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | control de acceso del gimnasio (entrada) |
| Acceso por QR o NFC | 🏷️ De un rubro | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | QR, NFC, documento o manual |
| Control de visitantes | 🏷️ De un rubro | [V.05](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md) | 5 | visitantes por franja en museos |
| Control de asistencia a actividades | 🟡 Parcial | [V.05](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md) | 5 | asistencia al gimnasio |

### 17. Documentos, archivos y conocimiento

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Almacenamiento de archivos | ✅ Hecho | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | hecho | adjuntos y fotos (Vercel Blob) |
| Gestión documental | 🟡 Parcial | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — | soportes de gastos, fotos y documentos de obra |
| Versiones de documentos | 🏷️ De un rubro | [IV.02](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/02-Cotizaciones-y-Propuestas-Comerciales/README.md) | 2 | cotizaciones de obra |
| Plantillas de documentos | ⬜ Falta | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — |  |
| Firma electrónica | ⬜ Falta | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — |  |
| Contratos y anexos | ⬜ Falta | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — |  |
| Permisos por archivo | 🟡 Parcial | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — | solo integrantes activos del negocio |
| Archivo y conservación | ⬜ Falta | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — |  |
| Búsqueda documental | ⬜ Falta | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — |  |
| OCR y extracción de datos | ✅ Hecho | [VII.00](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/00-Caja-Menor-y-Arqueos/README.md) | hecho | escaneo de comprobantes |
| Flujos de aprobación | ⬜ Falta | [I.00](capas/I-Fundacion-Nucleo-e-Infraestructura/00-Nucleo-Transversal-y-Modelo-de-Tercero-Unico/README.md) | 2 |  |
| Wiki empresarial | ⬜ Falta | [VI.02](capas/VI-Operacion-Productividad-y-Logistica/02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | — |  |
| Manual de procedimientos | ⬜ Falta | [VI.02](capas/VI-Operacion-Productividad-y-Logistica/02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | — |  |
| Políticas y reglamentos | ⬜ Falta | [VI.02](capas/VI-Operacion-Productividad-y-Logistica/02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | — |  |
| Retención y eliminación de documentos | ⬜ Falta | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — |  |

### 18. Logística y distribución

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Gestión de bodegas | ⬜ Falta | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 |  |
| Preparación de pedidos | ⬜ Falta | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 |  |
| Empaque y despacho | ⬜ Falta | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 |  |
| Guías de envío | 🔌 Integrar | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 | transportadoras |
| Seguimiento de entregas | 🔌 Integrar | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 |  |
| Rutas de distribución | ➖ Fuera de alcance | — | — |  |
| Gestión de transportistas | 🔌 Integrar | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 |  |
| Flota y vehículos | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Mantenimiento vehicular | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Prueba de entrega | ⬜ Falta | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 |  |
| Devoluciones logísticas | ⬜ Falta | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 |  |
| Costos de transporte | ⬜ Falta | [V.04](capas/V-Ventas-Digitales-Comercio-y-Pagos/04-Comercio-Electronico/README.md) | 5 |  |
| Trazabilidad de envíos | 🔌 Integrar | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 |  |
| Gestión de última milla | ➖ Fuera de alcance | — | — |  |

### 19. Producción y fabricación

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Planificación de producción | ⬜ Falta | [VI.07](capas/VI-Operacion-Productividad-y-Logistica/07-Produccion-y-Planeacion/README.md) | — |  |
| Órdenes de fabricación | ⬜ Falta | [VI.07](capas/VI-Operacion-Productividad-y-Logistica/07-Produccion-y-Planeacion/README.md) | — |  |
| Listas de materiales (BOM) | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | explosión de materiales de obra |
| Requerimientos de materiales | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | insumos del presupuesto |
| Planificación de capacidad | ⬜ Falta | [VI.07](capas/VI-Operacion-Productividad-y-Logistica/07-Produccion-y-Planeacion/README.md) | — |  |
| Programación de máquinas | ➖ Fuera de alcance | — | — |  |
| Control de planta | ➖ Fuera de alcance | — | — |  |
| Control de calidad | ⬜ Falta | [VI.07](capas/VI-Operacion-Productividad-y-Logistica/07-Produccion-y-Planeacion/README.md) | — |  |
| Trazabilidad por lote | ⬜ Falta | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 |  |
| Mantenimiento de equipos | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Desperdicios y mermas | ⬜ Falta | [VI.07](capas/VI-Operacion-Productividad-y-Logistica/07-Produccion-y-Planeacion/README.md) | — |  |
| Costos de fabricación | ⬜ Falta | [VI.07](capas/VI-Operacion-Productividad-y-Logistica/07-Produccion-y-Planeacion/README.md) | — |  |
| Gestión de recetas y fórmulas | ⬜ Falta | [VI.07](capas/VI-Operacion-Productividad-y-Logistica/07-Produccion-y-Planeacion/README.md) | — |  |
| Planificación de demanda | ⬜ Falta | [IX.05](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/05-Deteccion-de-Anomalias-y-Alertas-Tempranas/README.md) | — |  |

### 20. Analítica e inteligencia empresarial

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Dashboards | ✅ Hecho | [IX.00](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/00-Dashboards-y-Analitica-Operativa/README.md) | hecho | uno para todos los rubros |
| Indicadores KPI | ✅ Hecho | [IX.00](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/00-Dashboards-y-Analitica-Operativa/README.md) | hecho |  |
| Informes personalizados | ⬜ Falta | [IX.03](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/03-Reportes-Automaticos-y-Resumenes-Ejecutivos/README.md) | 6 |  |
| Análisis de ventas | 🟡 Parcial | [IX.00](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/00-Dashboards-y-Analitica-Operativa/README.md) | 6 | métricas de cobros |
| Análisis de clientes | 🟡 Parcial | [IX.02](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/02-Analitica-de-Clientes-y-Comportamiento-Comercial/README.md) | — | ficha 360° |
| Análisis financiero | 🟡 Parcial | [VII.05](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) | 6 | métricas de Finanzas |
| Análisis de inventario | 🟡 Parcial | [VI.04](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) | 3 | avisos de stock bajo |
| Pronósticos y tendencias | ⬜ Falta | [IX.05](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/05-Deteccion-de-Anomalias-y-Alertas-Tempranas/README.md) | — |  |
| Comparación entre sucursales | ⬜ Falta | [IX.00](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/00-Dashboards-y-Analitica-Operativa/README.md) | 6 |  |
| Exportación de datos | 🟡 Parcial | [IX.00](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/00-Dashboards-y-Analitica-Operativa/README.md) | 6 | CSV de materiales de obra |
| Constructor de reportes | ⬜ Falta | [IX.03](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/03-Reportes-Automaticos-y-Resumenes-Ejecutivos/README.md) | 6 |  |
| Alertas por umbrales | 🟡 Parcial | [IX.05](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/05-Deteccion-de-Anomalias-y-Alertas-Tempranas/README.md) | — | stock mínimo y vencimientos |
| Almacén de datos | ➖ Fuera de alcance | — | — |  |
| Integración de fuentes | ⬜ Falta | [IX.01](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/01-Modelo-Semantico-y-Catalogo-de-Metricas/README.md) | — |  |
| Modelos de rentabilidad | ⬜ Falta | [IX.02](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/02-Analitica-de-Clientes-y-Comportamiento-Comercial/README.md) | — |  |

### 21. Automatización e inteligencia artificial

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Constructor visual de flujos | 🔌 Integrar | [VI.08](capas/VI-Operacion-Productividad-y-Logistica/08-Automatizaciones-y-Flujos-de-Trabajo/README.md) | 4 | n8n (objetivo) |
| Disparadores y eventos | ⬜ Falta | [I.05](capas/I-Fundacion-Nucleo-e-Infraestructura/05-Motor-de-Eventos-y-Webhooks/README.md) | 4 | objetivo: outbox de eventos |
| Automatización entre módulos | 🟡 Parcial | [VI.08](capas/VI-Operacion-Productividad-y-Logistica/08-Automatizaciones-y-Flujos-de-Trabajo/README.md) | 4 | en el código: venta descuenta stock, cobro entra a caja |
| Integración por API | ⬜ Falta | [X.02](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md) | 4 | objetivo: /api/v1 |
| Webhooks | 🟡 Parcial | [I.05](capas/I-Fundacion-Nucleo-e-Infraestructura/05-Motor-de-Eventos-y-Webhooks/README.md) | 4 | de entrada (WhatsApp y correo del panel) |
| Sincronización de datos | ⬜ Falta | [X.02](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md) | 4 |  |
| Bots internos | ⬜ Falta | [IX.04](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/04-Copiloto-de-Inteligencia-Artificial/README.md) | 4 |  |
| Asistentes de IA | ⬜ Falta | [IX.04](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/04-Copiloto-de-Inteligencia-Artificial/README.md) | 4 | objetivo |
| Clasificación automática | ⬜ Falta | [IX.04](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/04-Copiloto-de-Inteligencia-Artificial/README.md) | 4 |  |
| Extracción de datos de documentos | ✅ Hecho | [VII.00](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/00-Caja-Menor-y-Arqueos/README.md) | hecho | OCR de comprobantes |
| Resúmenes e informes con IA | ⬜ Falta | [IX.03](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/03-Reportes-Automaticos-y-Resumenes-Ejecutivos/README.md) | 6 |  |
| Predicción de demanda | ⬜ Falta | [IX.05](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/05-Deteccion-de-Anomalias-y-Alertas-Tempranas/README.md) | — |  |
| Detección de anomalías | ⬜ Falta | [IX.05](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/05-Deteccion-de-Anomalias-y-Alertas-Tempranas/README.md) | — |  |
| Automatización de tareas repetitivas | ⬜ Falta | [VI.08](capas/VI-Operacion-Productividad-y-Logistica/08-Automatizaciones-y-Flujos-de-Trabajo/README.md) | 4 |  |
| Aprobación humana de acciones sensibles | ⬜ Falta | [IX.04](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/04-Copiloto-de-Inteligencia-Artificial/README.md) | 4 | objetivo |
| Registro de ejecuciones y errores | ⬜ Falta | [VI.08](capas/VI-Operacion-Productividad-y-Logistica/08-Automatizaciones-y-Flujos-de-Trabajo/README.md) | 4 |  |

### 22. Seguridad y control de acceso

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Autenticación | ✅ Hecho | [I.02](capas/I-Fundacion-Nucleo-e-Infraestructura/02-Autenticacion-Usuarios-e-Identidad-Unificada/README.md) | hecho | Clerk, correo verificado |
| Autenticación multifactor | 🔌 Integrar | [I.02](capas/I-Fundacion-Nucleo-e-Infraestructura/02-Autenticacion-Usuarios-e-Identidad-Unificada/README.md) | — | disponible en Clerk, sin activar |
| Inicio de sesión único | 🔌 Integrar | [I.02](capas/I-Fundacion-Nucleo-e-Infraestructura/02-Autenticacion-Usuarios-e-Identidad-Unificada/README.md) | — | disponible en Clerk |
| Gestión de sesiones | 🔌 Integrar | [I.02](capas/I-Fundacion-Nucleo-e-Infraestructura/02-Autenticacion-Usuarios-e-Identidad-Unificada/README.md) | — | Clerk |
| Permisos por rol | ✅ Hecho | [I.03](capas/I-Fundacion-Nucleo-e-Infraestructura/03-Permisos-Granulares-y-Control-de-Acceso-RBAC-ABAC/README.md) | hecho |  |
| Permisos por recurso | 🟡 Parcial | [I.03](capas/I-Fundacion-Nucleo-e-Infraestructura/03-Permisos-Granulares-y-Control-de-Acceso-RBAC-ABAC/README.md) | — | por acción y por módulo |
| Aislamiento entre organizaciones | ✅ Hecho | [I.04](capas/I-Fundacion-Nucleo-e-Infraestructura/04-Multi-Tenancy-y-Aislamiento-de-Datos/README.md) | hecho | contexto en el servidor, FK a Tenant y RLS |
| Bitácora de auditoría | ✅ Hecho | [I.06](capas/I-Fundacion-Nucleo-e-Infraestructura/06-Auditoria-Trazabilidad-y-Bitacora/README.md) | hecho |  |
| Alertas de seguridad | ⬜ Falta | [I.06](capas/I-Fundacion-Nucleo-e-Infraestructura/06-Auditoria-Trazabilidad-y-Bitacora/README.md) | — |  |
| Control de dispositivos | ⬜ Falta | [I.02](capas/I-Fundacion-Nucleo-e-Infraestructura/02-Autenticacion-Usuarios-e-Identidad-Unificada/README.md) | — |  |
| Gestión de secretos | 🟡 Parcial | [X.02](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md) | 4 | secretos fuera del repo y escaneo en GitHub |
| Copias de seguridad | 🔌 Integrar | [I.07](capas/I-Fundacion-Nucleo-e-Infraestructura/07-Respaldo-Versionado-y-Recuperacion/README.md) | — | las de Supabase según el plan |
| Recuperación ante desastres | ⬜ Falta | [I.07](capas/I-Fundacion-Nucleo-e-Infraestructura/07-Respaldo-Versionado-y-Recuperacion/README.md) | — |  |
| Políticas de acceso | ✅ Hecho | [I.03](capas/I-Fundacion-Nucleo-e-Infraestructura/03-Permisos-Granulares-y-Control-de-Acceso-RBAC-ABAC/README.md) | hecho | módulos exigidos en el servidor + roles |
| Gestión de incidentes | ⬜ Falta | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — |  |
| Protección de datos | 🟡 Parcial | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — | aislamiento y políticas publicadas |
| Registro de consentimientos | ⬜ Falta | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — |  |

### 23. TI e infraestructura

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Inventario de equipos informáticos | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Gestión de activos tecnológicos | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Mesa de ayuda TI | ➖ Fuera de alcance | — | — |  |
| Gestión de incidencias técnicas | ➖ Fuera de alcance | — | — |  |
| Monitoreo de sistemas | ➖ Fuera de alcance | — | — |  |
| Gestión de redes | ➖ Fuera de alcance | — | — |  |
| Gestión de dominios y certificados | ⬜ Falta | [X.01](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/01-White-Label-Dominios-e-Identidad-Visual/README.md) | — |  |
| Gestión de cuentas de software | ➖ Fuera de alcance | — | — |  |
| Copias de seguridad | 🔌 Integrar | [I.07](capas/I-Fundacion-Nucleo-e-Infraestructura/07-Respaldo-Versionado-y-Recuperacion/README.md) | — |  |
| Monitoreo de disponibilidad | ➖ Fuera de alcance | — | — |  |
| Gestión de licencias | ➖ Fuera de alcance | — | — |  |
| Despliegues y cambios | ➖ Fuera de alcance | — | — |  |
| Gestión de proveedores TI | ➖ Fuera de alcance | — | — |  |
| Continuidad del negocio | ⬜ Falta | [I.07](capas/I-Fundacion-Nucleo-e-Infraestructura/07-Respaldo-Versionado-y-Recuperacion/README.md) | — |  |

### 24. Legal, riesgos y cumplimiento

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Contratos empresariales | ⬜ Falta | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — |  |
| Obligaciones y vencimientos legales | ⬜ Falta | [VI.03](capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | — |  |
| Protección de datos personales | 🟡 Parcial | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — | políticas publicadas en la landing |
| Consentimientos y autorizaciones | ⬜ Falta | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — |  |
| Gestión de riesgos | ➖ Fuera de alcance | — | — |  |
| Matriz de controles | ➖ Fuera de alcance | — | — |  |
| Cumplimiento normativo | ⬜ Falta | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — |  |
| Auditorías internas | ➖ Fuera de alcance | — | — |  |
| Gestión de reclamaciones legales | ➖ Fuera de alcance | — | — |  |
| Políticas corporativas | ⬜ Falta | [VI.02](capas/VI-Operacion-Productividad-y-Logistica/02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | — |  |
| Registro de incidentes | ⬜ Falta | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — |  |
| Evaluación de terceros | ⬜ Falta | [I.01](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md) | 2 | N6 verificación de riesgo |
| Seguros empresariales | ➖ Fuera de alcance | — | — |  |
| Evidencias y documentación de cumplimiento | ⬜ Falta | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — |  |

### 25. Activos, instalaciones y mantenimiento

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Inventario de activos físicos | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Asignación de activos | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Mantenimiento preventivo | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Mantenimiento correctivo | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Órdenes de mantenimiento | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Inspecciones | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Gestión de instalaciones | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Reservas de salas | ⬜ Falta | [V.05](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md) | 5 |  |
| Control de llaves y accesos | 🏷️ De un rubro | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | acceso por QR/NFC del gimnasio |
| Servicios públicos y consumos | ➖ Fuera de alcance | — | — |  |
| Control de garantías | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |
| Historial de reparaciones | ⬜ Falta | [VI.06](capas/VI-Operacion-Productividad-y-Logistica/06-Activos-Mantenimiento-e-Inspecciones/README.md) | — |  |

### 26. Comercio electrónico y canales digitales

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Tienda en línea | ⬜ Falta | [V.04](capas/V-Ventas-Digitales-Comercio-y-Pagos/04-Comercio-Electronico/README.md) | 5 |  |
| Gestión de catálogo web | ⬜ Falta | [V.04](capas/V-Ventas-Digitales-Comercio-y-Pagos/04-Comercio-Electronico/README.md) | 5 |  |
| Sincronización de stock | ⬜ Falta | [V.07](capas/V-Ventas-Digitales-Comercio-y-Pagos/07-Marketplace-y-Distribucion-Multicanal/README.md) | — |  |
| Gestión de pedidos digitales | ⬜ Falta | [V.04](capas/V-Ventas-Digitales-Comercio-y-Pagos/04-Comercio-Electronico/README.md) | 5 |  |
| Integración con marketplaces | 🔌 Integrar | [V.07](capas/V-Ventas-Digitales-Comercio-y-Pagos/07-Marketplace-y-Distribucion-Multicanal/README.md) | — |  |
| Tarifas y métodos de envío | ⬜ Falta | [V.04](capas/V-Ventas-Digitales-Comercio-y-Pagos/04-Comercio-Electronico/README.md) | 5 |  |
| Gestión de carritos abandonados | ⬜ Falta | [V.04](capas/V-Ventas-Digitales-Comercio-y-Pagos/04-Comercio-Electronico/README.md) | 5 |  |
| Seguimiento de conversiones | ⬜ Falta | [II.02](capas/II-Visibilidad-Captacion-y-Presencia-Digital/02-Publicidad-Digital-y-Atribucion-Multicanal/README.md) | — |  |
| Portal de clientes | 🟡 Parcial | [X.01](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/01-White-Label-Dominios-e-Identidad-Visual/README.md) | — | recibo público y carné |
| Área privada de suscriptores | ⬜ Falta | [X.01](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/01-White-Label-Dominios-e-Identidad-Visual/README.md) | — |  |
| Descargas digitales | ➖ Fuera de alcance | — | — |  |
| Gestión de devoluciones en línea | ⬜ Falta | [V.04](capas/V-Ventas-Digitales-Comercio-y-Pagos/04-Comercio-Electronico/README.md) | 5 |  |

### 27. Investigación, producto e innovación

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Gestión de ideas | ➖ Fuera de alcance | — | — |  |
| Investigación de mercado | ➖ Fuera de alcance | — | — |  |
| Encuestas de usuarios | ⬜ Falta | [III.04](capas/III-Atencion-y-Comunicacion/04-Encuestas-de-Satisfaccion-y-Reputacion/README.md) | — |  |
| Gestión de requisitos | ➖ Fuera de alcance | — | — |  |
| Roadmap de producto | ➖ Fuera de alcance | — | — |  |
| Prototipos | ➖ Fuera de alcance | — | — |  |
| Pruebas con usuarios | ➖ Fuera de alcance | — | — |  |
| Gestión de versiones | ➖ Fuera de alcance | — | — |  |
| Seguimiento de errores | ➖ Fuera de alcance | — | — |  |
| Experimentos y pruebas A/B | ⬜ Falta | [II.05](capas/II-Visibilidad-Captacion-y-Presencia-Digital/05-Email-y-Whatsapp-Marketing/README.md) | 4 |  |
| Gestión del ciclo de vida del producto | ➖ Fuera de alcance | — | — |  |
| Gestión de propiedad intelectual | ➖ Fuera de alcance | — | — |  |

### 28. Funciones especializadas por sector

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Gimnasios: membresías, rutinas y acceso | 🏷️ De un rubro | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | membresías y acceso hechos |
| Construcción: APU, obras, presupuestos y bitácoras | 🏷️ De un rubro | [XI.00](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md) | — | N1 completo |
| Turismo: reservas, itinerarios y viajeros | 🟡 Parcial | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | solo tablas (salidas y reservas de tour), sin pantallas |
| Restaurantes: mesas, comandas y recetas | ⬜ Falta | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | el rubro existe sin pantallas propias |
| Hoteles: habitaciones, reservas y ocupación | ⬜ Falta | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | el rubro existe sin pantallas propias |
| Clínicas: citas y expedientes regulados | ⬜ Falta | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | el rubro existe sin pantallas propias |
| Educación: matrículas, cursos y calificaciones | ⬜ Falta | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | el rubro existe sin pantallas propias |
| Museos: entradas, aforo y recorridos | 🏷️ De un rubro | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | taquilla con franjas, aforo y grupos |
| Comercio: cajas, promociones y sucursales | 🟡 Parcial | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | caja y venta |
| Agencias: clientes, campañas y entregables | ➖ Fuera de alcance | — | — |  |
| Inmobiliarias: propiedades, visitas y contratos | ⬜ Falta | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | el rubro existe sin pantallas propias |
| Talleres: órdenes de servicio y repuestos | ⬜ Falta | [XI](capas/XI-Especializacion-por-Vertical/README.md) | — | el rubro existe sin pantallas propias |

### 29. Integraciones y ecosistema

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Conectores bancarios | ⬜ Falta | [VII.07](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/07-Tesoreria-Bancos-y-Liquidez/README.md) | — |  |
| Pasarelas de pago | ⬜ Falta | [V.00](capas/V-Ventas-Digitales-Comercio-y-Pagos/00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md) | 3 | objetivo: Nequi / Wompi |
| Servicios tributarios y facturación electrónica | 🔌 Integrar | [VII.04](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/04-Facturacion-Electronica-y-RADIAN/README.md) | 3 | objetivo: proveedor tecnológico |
| Correo y calendario | 🟡 Parcial | [III.00](capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) | 4 | correo en el panel de NEXUS |
| Mensajería empresarial | 🟡 Parcial | [III.00](capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) | 4 | WhatsApp Cloud en el panel de NEXUS |
| Plataformas publicitarias | ⬜ Falta | [II.02](capas/II-Visibilidad-Captacion-y-Presencia-Digital/02-Publicidad-Digital-y-Atribucion-Multicanal/README.md) | — |  |
| Redes sociales | ⬜ Falta | [II.06](capas/II-Visibilidad-Captacion-y-Presencia-Digital/06-Redes-Sociales-y-Contenido/README.md) | 5 |  |
| Comercio electrónico | ⬜ Falta | [V.07](capas/V-Ventas-Digitales-Comercio-y-Pagos/07-Marketplace-y-Distribucion-Multicanal/README.md) | — |  |
| Servicios logísticos | 🔌 Integrar | [V.06](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md) | 3 |  |
| API pública | ⬜ Falta | [X.02](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md) | 4 | objetivo |
| Webhooks de entrada y salida | 🟡 Parcial | [I.05](capas/I-Fundacion-Nucleo-e-Infraestructura/05-Motor-de-Eventos-y-Webhooks/README.md) | 4 | solo de entrada |
| Marketplace de extensiones | ⬜ Falta | [X.02](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md) | 4 |  |
| Importación y exportación | 🟡 Parcial | [I.01](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md) | 2 | importador del libro APU |
| Sincronización con terceros | ⬜ Falta | [X.02](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md) | 4 |  |

### 30. Gestión del propio software SaaS

| Capacidad | Estado | Subcapa | Fase | Nota |
| --- | --- | --- | --- | --- |
| Planes y suscripciones | ✅ Hecho | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | hecho | catálogo en /admin/planes |
| Facturación del servicio | ✅ Hecho | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | hecho | cobro manual con comprobante |
| Límites de uso | 🟡 Parcial | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | 2 | usuarios por plan |
| Gestión de organizaciones | ✅ Hecho | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | hecho | negocios en el panel |
| Altas y bajas de cuentas | ✅ Hecho | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | hecho | alta con invitación al dueño |
| Pruebas gratuitas | ✅ Hecho | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | hecho | códigos de acceso con días |
| Gestión de licencias | 🟡 Parcial | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | 2 | códigos de activación (plan y días) |
| Consumo de servicios | ⬜ Falta | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | 2 | objetivo: cupos de uso |
| Centro de soporte | ✅ Hecho | [X.04](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/04-Centro-de-Ayuda-y-Onboarding/README.md) | hecho | soporte y bandeja en el panel |
| Estado de servicios | ⬜ Falta | [I.07](capas/I-Fundacion-Nucleo-e-Infraestructura/07-Respaldo-Versionado-y-Recuperacion/README.md) | — |  |
| Registro de errores | ⬜ Falta | [X.03](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | — | pendiente: errores con contexto (Sentry) |
| Configuración por organización | ✅ Hecho | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | hecho | ajustes, módulos y rubro por negocio |
| Personalización de marca | ⬜ Falta | [X.01](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/01-White-Label-Dominios-e-Identidad-Visual/README.md) | — |  |
| Gestión interna de clientes SaaS | ✅ Hecho | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | hecho | Operations Center: CRM, salud, satisfacción |
| Control de versiones y funcionalidades | 🟡 Parcial | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | 2 | módulos por negocio y banderas |
