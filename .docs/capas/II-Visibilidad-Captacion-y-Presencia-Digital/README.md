---
id: II
titulo: "VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL"
type: capa
subcapas: 7
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, capa]
---

# II. VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL

> Capa **II** con **7 subcapas**. Cada subcapa tiene su escalera de madurez N0–N6; los diagramas se derivan de estos README (nodo = nivel, enlaces = integraciones).

## Núcleo compartido (base de la capa)

* **Contacto unificado con origen**: fuente, medio, campaña y primer contacto guardados en la ficha del CRM.
* **UTM y atribución**: cada enlace, formulario, QR y anuncio lleva sus parámetros y se registran.
* **Segmentos y listas** compartidos (por vertical, interés, última compra, origen).
* **Consentimiento y opt-in** por canal (correo, WhatsApp, SMS), con fecha y prueba de aceptación.
* **Biblioteca de medios** (imágenes, videos, logos) y **marca del negocio** (colores, tipografía, tono).
* **Eventos de seguimiento (tracking)**: visita, formulario enviado, clic en WhatsApp, reserva, pago.
* **Dominios y subdominios** por negocio, con SSL automático.
* **Cola de envíos y límites** por plan para no saturar ni quemar la reputación de envío.

## Subcapas

| id | Subcapa | Escalera |
| --- | --- | --- |
| II.00 | [Sitios web, landing pages y CMS](00-Sitios-Web-Landing-Pages-y-Cms/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| II.01 | [SEO técnico y posicionamiento local](01-SEO-Tecnico-y-Posicionamiento-Local/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| II.02 | [Publicidad digital y atribución multicanal](02-Publicidad-Digital-y-Atribucion-Multicanal/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| II.03 | [Formularios, enlaces cortos y códigos QR](03-Formularios-Enlaces-Cortos-y-Codigos-Qr/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| II.04 | [Fidelización, puntos, cupones y referidos](04-Fidelizacion-Puntos-Cupones-y-Referidos/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| II.05 | [Email y WhatsApp marketing](05-Email-y-Whatsapp-Marketing/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| II.06 | [Redes sociales y contenido](06-Redes-Sociales-y-Contenido/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |

## Integraciones de esta capa

| Área | Integraciones típicas |
| --- | --- |
| Web y analítica | Google Analytics 4, Tag Manager, Search Console, Meta Pixel, Cloudflare |
| Correo | Resend, SendGrid, Amazon SES, Mailgun (con SPF/DKIM/DMARC) |
| WhatsApp | WhatsApp Cloud API, 360dialog, Twilio |
| Redes | Meta Graph API (Instagram y Facebook), TikTok, LinkedIn, YouTube |
| Anuncios | Meta Marketing API y Conversions API, Google Ads API, TikTok Ads |
| Google | Business Profile API, Maps, Reviews |
| Diseño | Canva, bancos de imágenes (Unsplash, Pexels) |
| Pagos | Wompi, PayU, Mercado Pago, Nequi (membresías y cobros recurrentes) |
| IA | Claude, OpenAI, generación de imágenes |
| Interno | CRM, reservas, cotizaciones, caja, bandeja omnicanal, bot |

## Cosas críticas que se suelen olvidar

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

## Qué lanzaría primero

1. **Núcleo con origen y UTM** \+ **formularios, QR y enlaces cortos** (poco esfuerzo, alimentan el CRM desde el inicio).
2. **Sitio y landings con formulario al CRM y botón de WhatsApp** (ya lo tienes: refuerza bloques, dominio propio y píxeles).
3. **SEO básico + Google Business** (schema por vertical, reseñas y datos del negocio): alto valor para negocios locales.
4. **Email y WhatsApp con secuencias simples** (bienvenida, seguimiento de cotización y recordatorios).
5. **Fidelización básica**: cupones, referidos y membresías con cobro recurrente.
6. **Redes sociales**: calendario y programación, después métricas.
7. **Blog/CMS** con plantillas por vertical.
8. **Gestor de anuncios con atribución**: es el más complejo (permisos, APIs, conversiones) y conviene hacerlo cuando ya tengas datos de origen limpios.

---

_Fuente: `../../fuentes/DesordenadoCapas.md` (capa `Marketing`) + `../../fuentes/EstructuraCapasImplementacion.md`._