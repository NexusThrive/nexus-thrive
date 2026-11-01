---
id: III
titulo: "ATENCIÓN Y COMUNICACIÓN"
type: capa
subcapas: 5
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, capa]
---

# III. ATENCIÓN Y COMUNICACIÓN

> Capa **III** con **5 subcapas**. Cada subcapa tiene su escalera de madurez N0–N6; los diagramas se derivan de estos README (nodo = nivel, enlaces = integraciones).

## Núcleo compartido (base de la capa)

* **Contacto unificado**: un cliente = una ficha, sin importar si escribió por WhatsApp, Instagram o correo.
* **Conversación / hilo** con mensajes, adjuntos, estado (abierta, pendiente, resuelta) y responsable.
* **Canales conectados por negocio** (multi-tenant): cada negocio conecta su propio WhatsApp, redes y correo.
* **Eventos al CRM y a la bitácora**: cada interacción queda en el historial del cliente.
* **Roles, equipos y horarios de atención.**
* **Cola de mensajes y webhooks** (para no perder mensajes entrantes).

## Subcapas

| id | Subcapa | Escalera |
| --- | --- | --- |
| III.00 | [Bandeja de entrada omnicanal](00-Bandeja-de-Entrada-Omnicanal/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| III.01 | [Agentes conversacionales e inteligencia artificial](01-Agentes-Conversacionales-e-Inteligencia-Artificial/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| III.02 | [Helpdesk, tickets y SLA](02-Helpdesk-Tickets-y-SLA/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| III.03 | [Telefonía VoIP e integración de llamadas](03-Telefonia-Voip-e-Integracion-de-Llamadas/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| III.04 | [Encuestas de satisfacción y reputación](04-Encuestas-de-Satisfaccion-y-Reputacion/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |

## Integraciones de esta capa

| Área | Integraciones típicas |
| --- | --- |
| Mensajería | WhatsApp Cloud API (Meta), 360dialog, Twilio, Instagram y Messenger (Meta), Telegram |
| Correo | Gmail, Outlook, IMAP/SMTP, SendGrid, Resend |
| Voz | Twilio, Telnyx, Zadarma, SIP trunk, proveedores locales colombianos |
| Video y agenda | Google Calendar, Meet, Zoom, Microsoft Teams, Calendly |
| IA | Claude, OpenAI, speech-to-text y text-to-speech |
| Reseñas | Google Business Profile API, Facebook, TripAdvisor |
| Interno | CRM, reservas, cotizaciones, pagos, caja, facturación |

## Cosas críticas que se suelen olvidar

* **WhatsApp no es gratis ni libre**: tiene ventana de 24 horas, plantillas aprobadas por Meta, límites de envío y costo por conversación. Define quién lo asume (tú o el negocio).
* **Aprobación de Meta y verificación del negocio**: el onboarding de cada cliente tarda; conviene un flujo guiado (Embedded Signup).
* **Consentimiento y habeas data**: guardar el opt-in, permitir la baja y avisar de la grabación de llamadas.
* **Costos de IA**: ponle límites de uso por plan para que un bot muy activo no te quiebre el margen.
* **Fiabilidad**: cola de mensajes, reintentos y registro de webhooks. Perder un mensaje de un cliente es peor que no tener bot.
* **Seguridad de los tokens** de cada canal (cifrados, por negocio).

## Qué lanzaría primero

1. **Núcleo + bandeja de WhatsApp y chat web** (Nivel 1 completo).
2. **Plantillas, asignación y vista del cliente en el CRM** (Nivel 2 de bandeja).
3. **Chatbot con IA y base de conocimiento** que cree leads y reservas (lo que más vende hoy).
4. **Recordatorios de agenda y encuesta post-servicio con reseña en Google** (poco esfuerzo y mucho valor percibido).
5. **Tickets con SLA** y después Instagram, Facebook y correo.
6. **Telefonía y call center** al final: es lo más costoso y el que menos piden los negocios pequeños.

---

_Fuente: `../../fuentes/DesordenadoCapas.md` (capa `Atencion`) + `../../fuentes/EstructuraCapasImplementacion.md`._