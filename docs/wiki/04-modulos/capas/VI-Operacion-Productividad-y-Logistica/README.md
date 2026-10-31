---
id: VI
titulo: "OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
type: capa
subcapas: 9
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, capa]
---

# VI. OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA

> Capa **VI** con **9 subcapas**. Cada subcapa tiene su escalera de madurez N0–N6; los diagramas se derivan de estos README (nodo = nivel, enlaces = integraciones).

## Núcleo compartido (base de la capa)

* **Motor de eventos**: cada cosa que pasa en la plataforma (nuevo lead, pago recibido, reserva creada, tarea vencida) se emite como evento. Es la base de las automatizaciones.
* **Tarea universal**: una misma estructura (título, responsable, fecha, estado, prioridad, adjuntos, vínculo al cliente, obra, reserva o activo) sirve para proyectos, SOP, inspecciones y mantenimiento.
* **Recursos**: personas, vehículos, habitaciones, equipos y salas, con su calendario y disponibilidad.
* **Archivos y adjuntos** con almacenamiento por negocio, permisos y versiones.
* **Terceros** compartidos: clientes, proveedores, contratistas y empleados en una sola tabla.
* **Notificaciones** por WhatsApp, correo y dentro de la app, con preferencias por usuario.
* **Roles, equipos y permisos** por módulo y por registro.
* **Bitácora de auditoría** y comentarios con menciones (@) en cualquier registro.
* **Plantillas por vertical** para arrancar rápido (obra, hotel, tour, gimnasio).

## Subcapas

| id | Subcapa | Escalera |
| --- | --- | --- |
| VI.00 | [Proyectos, tareas y seguimiento de tiempos](00-Proyectos-Tareas-y-Seguimiento-de-Tiempos/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VI.01 | [Agenda y sincronización de calendarios](01-Agenda-y-Sincronizacion-de-Calendarios/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VI.02 | [Procedimientos operativos y listas de verificación](02-Procedimientos-Operativos-y-Listas-de-Verificacion/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VI.03 | [Gestión documental y firma electrónica](03-Gestion-Documental-y-Firma-Electronica/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VI.04 | [Inventarios, bodegas y logística](04-Inventarios-Bodegas-y-Logistica/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VI.05 | [Compras y gestión de proveedores](05-Compras-y-Gestion-de-Proveedores/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VI.06 | [Activos, mantenimiento e inspecciones](06-Activos-Mantenimiento-e-Inspecciones/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VI.07 | [Producción y planeación](07-Produccion-y-Planeacion/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VI.08 | [Automatizaciones y flujos de trabajo](08-Automatizaciones-y-Flujos-de-Trabajo/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |

## Integraciones de esta capa

| Área | Integraciones típicas |
| --- | --- |
| Calendario y video | Google Calendar, Outlook, Meet, Zoom, Teams, Calendly |
| Mensajería | WhatsApp Cloud API, correo (Resend, SendGrid), notificaciones push |
| Almacenamiento | Google Drive, OneDrive, SharePoint, S3 / almacenamiento propio |
| Firma y documentos | Certicámara, Olimpia, Lleida.net, firma propia con evidencia, OCR |
| Automatización | Webhooks, Zapier, Make, n8n, API propia |
| IA | Claude, OpenAI, visión por computador, voz a texto |
| Flota y mapas | Google Maps, GPS/telemática (Wialon, Traccar y similares), Waze |
| Proyectos externos | Jira, Asana, Trello, Notion |
| Cumplimiento | Listas restrictivas, consulta de planillas de seguridad social |
| Interno | CRM, obra y presupuestos, inventario, finanzas, caja menor, RR. HH., bandeja omnicanal |

## Cosas críticas que se suelen olvidar

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

## Qué lanzaría primero

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

---

_Fuente: `../../fuentes/DesordenadoCapas.md` (capa `Operacion`) + `../../fuentes/EstructuraCapasImplementacion.md`._