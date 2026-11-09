# ADR-0010 · WhatsApp Business propio de cada negocio

- **Estado:** Aceptada · 2026-11-07 · responsable: santy401. Concreta el requisito de la [guía de producto](../../product/nexus-platform/README.md) §11.
- **Se apoya en:** ADR 0007 (soluciones sobre plataforma) y el contacto único (HU-contacto-unico-01).

## Contexto

La bandeja de WhatsApp con la API de Meta (`app/api/webhooks/whatsapp`, `lib/platform/inbox`) es **la de Nexus**: usa credenciales
globales del entorno y atiende el soporte de la plataforma. Los negocios solo tienen enlaces `wa.me` que abren la conversación
en el teléfono. Un negocio no puede enviar ni recibir por su propio número dentro de Nexus.

## Decisión

1. **Cada negocio conecta su propio número.** La conexión es una `ExternalConnection` (`kind: MESSAGING`, `provider: whatsapp_cloud`)
   con credenciales cifradas por negocio: identificador del número, token de acceso, secreto de la app y token de verificación.
2. **Modelos separados del soporte de Nexus.** Las conversaciones y mensajes del negocio viven en `BusinessConversation` y
   `BusinessMessage`, con `tenantId` obligatorio. No se mezclan con `InboxConversation` (la bandeja de Nexus, de `lib/platform`).
   Dos negocios con el mismo contacto ven conversaciones separadas.
3. **Un webhook por conexión** (`/api/webhooks/channels/whatsapp/<connectionId>`): la firma se verifica con el secreto de esa
   conexión y el `phone_number_id` del cuerpo debe ser el de la conexión. Un mensaje de otro número se rechaza.
4. **El contacto es el contacto único.** Un mensaje entrante encuentra o crea la ficha por teléfono canónico y aparece en su línea
   de tiempo.
5. **Reglas de Meta.** Texto libre solo dentro de las 24 h desde el último mensaje del contacto; fuera de la ventana el mensaje
   queda **listo para enviar con un toque** (`wa.me`) y nunca se marca como enviado lo que no salió. Plantillas, consentimiento y
   bajas: HU-whatsapp-negocio-02.
6. **El respaldo `wa.me` se mantiene.** Los requisitos de Meta (verificación del negocio, aprobación) están fuera de nuestro control.

## Alternativas

- **Reutilizar `InboxConversation`:** su unicidad es global por contacto; mezclaría las conversaciones de dos negocios.
- **Un solo webhook de Nexus para todos:** obliga a rutear por número antes de verificar la firma y a compartir un secreto.
- **Solo `wa.me`:** no permite recibir ni automatizar.

## Consecuencias

- Una conexión más por negocio que la use; sin ella todo sigue funcionando por `wa.me`.
- Lo que no se pudo probar contra Meta real (sin credenciales) queda documentado en la guía y se verifica con un número de pruebas.
