---
id: IV
titulo: "GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES"
type: capa
subcapas: 5
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, capa]
---

# IV. GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES

> Capa **IV** con **5 subcapas**. Cada subcapa tiene su escalera de madurez N0–N6; los diagramas se derivan de estos README (nodo = nivel, enlaces = integraciones).

## Núcleo compartido (base de la capa)

* **Contacto único (tercero) con roles**: la misma persona puede ser lead, cliente, proveedor o empleado sin duplicarse. Lo comparte toda la plataforma.
* **Línea de tiempo de eventos**: cada mensaje, llamada, cotización, pago, reserva, ticket y cambio de etapa se guarda como evento con fecha, canal y responsable.
* **Origen y atribución**: fuente, medio, campaña, UTM y primer contacto guardados desde el día uno. Esto no se puede reconstruir después.
* **Campos personalizados por negocio y por vertical**, sin tocar el código (tipo de tour, membresía, tipo de obra).
* **Etiquetas, estados y listas** compartidos con marketing y comunicación.
* **Motor de tareas y de automatizaciones** de la capa de Operación.
* **Permisos por registro y por equipo** de la capa de seguridad, y **bitácora global**.
* **Consentimiento y preferencias de contacto** por canal, guardados en la ficha.
* **Aislamiento multi-negocio** estricto.

## Subcapas

| id | Subcapa | Escalera |
| --- | --- | --- |
| IV.00 | [Perfil integral del cliente (CRM 360)](00-Perfil-Integral-del-Cliente-CRM-360/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| IV.01 | [Embudos comerciales y oportunidades](01-Embudos-Comerciales-y-Oportunidades/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| IV.02 | [Cotizaciones y propuestas comerciales](02-Cotizaciones-y-Propuestas-Comerciales/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| IV.03 | [Calificación y asignación de prospectos](03-Calificacion-y-Asignacion-de-Prospectos/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| IV.04 | [Metas, comisiones e incentivos comerciales](04-Metas-Comisiones-e-Incentivos-Comerciales/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |

## Integraciones de esta capa

| Área | Integraciones típicas |
| --- | --- |
| Mensajería | WhatsApp Cloud API, Instagram y Messenger (Meta), correo (Gmail, Outlook, IMAP) |
| Captación | Formularios y landing propios, Meta Lead Ads, Google Ads, QR y enlaces cortos |
| Agenda y video | Google Calendar, Outlook, Meet, Zoom, Calendly |
| Telefonía | Twilio, Telnyx, Zadarma, SIP trunk y proveedores colombianos (VoIP con grabación) |
| Ventas y pagos | Wompi, PayU, Mercado Pago, Nequi, facturación electrónica DIAN vía proveedor tecnológico |
| Contabilidad | Siigo, Alegra, World Office |
| Firma | Firma electrónica propia con evidencia, Certicámara, Olimpia |
| IA | Claude, OpenAI, transcripción de voz a texto |
| Automatización | Webhooks, Zapier, Make, n8n, API propia |
| Datos | Réplica de lectura o almacén analítico, Looker Studio, Metabase |
| Interno | Bandeja omnicanal, marketing, reservas, obra y presupuestos, caja menor, ERP, helpdesk, personas, capa de datos |

## Cosas críticas que se suelen olvidar

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

## Qué lanzaría primero

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

---

_Fuente: `../../fuentes/DesordenadoCapas.md` (capa `CRM`) + `../../fuentes/EstructuraCapasImplementacion.md`._