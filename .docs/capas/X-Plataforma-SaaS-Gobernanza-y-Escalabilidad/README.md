---
id: X
titulo: "PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD"
type: capa
subcapas: 5
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, capa]
---

# X. PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD

> Capa **X** con **5 subcapas**. Cada subcapa tiene su escalera de madurez N0–N6; los diagramas se derivan de estos README (nodo = nivel, enlaces = integraciones).

## Núcleo compartido (base de la capa)

* **Modelo multi-tenant estricto**: cada negocio tiene su identificador y **toda consulta, archivo, caché, cola y tarea se filtra por él**. Idealmente con una segunda barrera (por ejemplo, políticas a nivel de fila en la base de datos) para que un error de código no exponga datos entre clientes.
* **Identidad unificada**: un usuario puede pertenecer a varios negocios con roles distintos, y el SuperAdmin de la plataforma es una identidad separada y mucho más protegida.
* **Catálogo de permisos y módulos**: qué módulos tiene activos cada negocio, qué puede hacer cada rol y qué límites tiene cada plan, en un solo lugar que consultan todas las capas.
* **Gestión de secretos y cifrado**: llaves de pasarelas, tokens de WhatsApp y redes, y datos sensibles cifrados, con rotación y sin aparecer en logs.
* **Registro de eventos y auditoría** (la bitácora de la capa 6), con eventos propios de seguridad.
* **Configuración por negocio** (marca, dominios, idioma, zona horaria, impuestos, políticas) y **banderas de funciones** (feature flags) para activar cosas por cliente o por plan.
* **Medición de uso** (mensajes, almacenamiento, llamadas a IA, usuarios, facturas emitidas) que alimenta límites y cobros.
* **Entornos separados**: desarrollo, pruebas y producción, con datos de prueba que nunca son datos reales.

## Subcapas

| id | Subcapa | Escalera |
| --- | --- | --- |
| X.00 | [Planes, suscripciones y control de consumo](00-Planes-Suscripciones-y-Control-de-Consumo/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| X.01 | [White-label, dominios e identidad visual](01-White-Label-Dominios-e-Identidad-Visual/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| X.02 | [API, webhooks y marketplace de módulos](02-API-Webhooks-y-Marketplace-de-Modulos/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| X.03 | [Cumplimiento legal, privacidad y seguridad](03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| X.04 | [Centro de ayuda y onboarding](04-Centro-de-Ayuda-y-Onboarding/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |

## Integraciones de esta capa

| Área | Integraciones típicas |
| --- | --- |
| Identidad y acceso | Google, Microsoft, Okta, Auth0, Clerk, Supabase Auth, passkeys / WebAuthn |
| Infraestructura y respaldo | AWS, Google Cloud, Cloudflare (DNS, SSL, WAF, protección DDoS), S3 con bloqueo de objetos, Backblaze |
| Seguridad y monitoreo | Sentry, Datadog, Grafana, Cloudflare Turnstile, escáneres de vulnerabilidades, gestores de secretos (Vault, Doppler) |
| Dominios y correo | Cloudflare, GoDaddy y Namecheap (guía DNS), Resend, SendGrid, Amazon SES |
| Cobros de la plataforma | Wompi, PayU, Mercado Pago, Stripe (clientes internacionales), facturación DIAN vía proveedor |
| Desarrolladores | OpenAPI, Postman, Zapier, Make, n8n, OAuth 2.0 |
| Soporte y ayuda | Centro de ayuda propio, Intercom o Crisp, WhatsApp, Loom y videos propios |
| Apps móviles | PWA, Expo / React Native, App Store Connect y Google Play |
| Cumplimiento | Consulta del RNBD de la SIC, herramientas de gestión de consentimientos, firma electrónica con evidencia |
| Interno | Todas las capas: la medición de uso, los permisos y la bitácora atraviesan toda la plataforma |

## Cosas críticas que se suelen olvidar

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

## Qué lanzaría primero

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

---

_Fuente: `DesordenadoCapas.md` (capa `Seguridad`) + `EstructuraCapasImplementacion.md`._