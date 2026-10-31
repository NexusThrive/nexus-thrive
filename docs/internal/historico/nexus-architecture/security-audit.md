# 06 · Seguridad y aislamiento multiempresa

[← Índice](README.md) · Auditoría estática más pruebas locales no destructivas. **No
se atacó ningún sistema desplegado.** Ningún secreto se muestra en este documento.

## 1. Veredicto

NEXUS **aplica aislamiento por negocio en el código de las Server Actions** de forma
bastante consistente: cada acción revisada resuelve sesión → negocio → membresía
activa en el servidor (`requireTenantContext`, `lib/tenant-context.ts:37`) y filtra
por `tenantId` (`createTenantDb` y `lib/business/*-db.ts`). Los IDs que llegan del
navegador se comprueban contra el negocio antes de usarse (cliente, producto,
membresía, caja). Las pruebas de integración (`lib/tenant-db.integration.test.ts`,
`lib/ops/access.integration.test.ts`…) pasan.

Pero **no es todavía una plataforma multi-tenant segura**:

- hay dos caminos confirmados para obtener acceso que no corresponde (SEC-01, SEC-02);
- la lectura de 17 páginas depende solo del layout (SEC-03, por validar);
- no existe defensa en la base de datos (sin RLS efectiva, FK sin `tenantId`);
- los permisos por rol y por módulo son incompletos.

Que las tablas tengan `tenantId` no basta: el aislamiento depende de que **cada**
consulta lo recuerde.

## 2. Cómo funciona hoy

| Control | Implementación | Evidencia |
|---|---|---|
| Identidad | Clerk `auth()` en servidor | `@clerk/nextjs/server` |
| Organización actual | **Slug de la URL** → `Tenant` activo | `lib/tenant-context.ts:44` |
| Pertenencia | `User` por (`clerkUserId`, `tenantId`) y `active` | `lib/tenant-context.ts:51` |
| Roles del negocio | `OWNER`, `ADMIN`, `RECEPTION`, `ADVISOR` (+ `STAFF` heredado, `SUPERADMIN` soporte) | `lib/business/roles.ts` |
| Permisos del negocio | Funciones `canManage`, `canHandleCash`, `canManageTeam` (V1) y `createAuth`/`canGovernBudget` (construcción) | `lib/business/roles.ts`, `lib/authorization.ts`, `lib/projects.ts` |
| Equipo NEXUS | `StaffMember` + `StaffRole.permissions` (25 permisos), comprobado en cada página y acción del panel | `lib/ops/access.ts`, `lib/ops/permissions.ts` |
| Suplantación | Clerk actor tokens de 10 min, permiso `accounts.impersonate`, auditada | `app/admin/actions.ts:315` |
| Auditoría | `AuditLog` para acciones del panel; **nada** para acciones dentro del negocio | `app/admin/actions.ts:86` |
| Webhooks | HMAC con `timingSafeEqual` (WhatsApp); secreto compartido (correo) | `lib/ops/inbox-providers.ts:54` |
| Enlaces públicos | Recibo firmado con HMAC; encuesta y beneficios por token | `lib/business/finance-db.ts:93` |
| Secretos en el cliente | `BLOB_READ_WRITE_TOKEN` solo servidor; no se encontraron claves privilegiadas con prefijo `NEXT_PUBLIC_` | `.env.example`, `app/api/blob-upload/route.ts` |
| Límite de intentos | En memoria, por instancia | `lib/rate-limit.ts` |
| RLS | Ninguna política; ver SEC-07 | — |

## 3. Hallazgos

Gravedad: **Crítica · Alta · Media · Baja**. Prioridad según [technical-debt.md](technical-debt.md).

<a id="sec-01"></a>
### SEC-01 · Toma de fichas del equipo NEXUS por comodines en el correo — Crítica · P0 · VERIFICADO

- **Evidencia.** `findStaffByEmail` hace `s.email.ilike(clean)` con el correo de la
  sesión sin escapar `_` ni `%` (`lib/ops/access.ts:76`). Lo usan:
  `takeoverStaffAccountAction` ("Usar esta cuenta", `app/auth/callback/actions.ts:19`),
  que **sobrescribe `clerkUserId` aunque la ficha ya esté vinculada**;
  `linkStaffToSession` (fichas sin vincular, `lib/ops/access.ts:94`), que se ejecuta
  en cada `getStaffContext`; y `redeemStaffInvite` (`lib/ops/team.ts:232`).
- **Prueba.** En Postgres, `'ana.perez@outlook.com' ILIKE 'ana_perez@outlook.com'`
  es verdadero. Una prueba local (fuera del repo) creó una ficha `ana.perez…` y
  llamó a la función real con `ana_perez…`: devolvió la ficha de la víctima.
- **Escenario.** Alguien registra en Clerk un correo verificado que solo difiere en
  `_` por `.`/`-`/otra letra (proveedores como Outlook admiten `_`), o con `%` en la
  parte local en un dominio que controla. En `/auth/callback` ve "Usar esta cuenta",
  la pulsa y queda dentro del Operations Center con el rol de la víctima, incluida
  la suplantación de dueños de negocios si el rol la tiene.
- **Mitigación.** Igualdad exacta sobre el correo normalizado
  (`lower(trim(email)) = …`) e índice único sobre esa expresión; exigir correo
  **verificado** (`verification.status === "verified"`) y no caer en
  `emailAddresses[0]`; no reasignar una ficha ya vinculada sin aprobación de otro
  integrante; auditar vinculaciones; revisar `AuditLog` (`STAFF_INVITE`, evento
  `linked`) por vínculos inesperados.
- **Criterio de aceptación.** Prueba de integración: un correo con `_` o `%` no
  resuelve ninguna ficha ajena; "Usar esta cuenta" falla si la ficha tiene otra
  cuenta vinculada.

<a id="sec-02"></a>
### SEC-02 · Un negocio sin miembros se lo queda el primero que entra — Alta · P0 · IMPLEMENTADO

- **Evidencia.** `app/[tenant]/layout.tsx:71-93`: si no hay ningún `User` en el
  negocio, el usuario autenticado actual se crea como `OWNER`.
  `createTenantAction` → `adminDb.createTenant` (`lib/admin-db.ts:759`) crea el
  negocio y sus módulos **sin usuario**. El slug es legible y predecible (nombre del
  negocio).
- **Escenario.** El equipo crea "gimnasio-central" desde el panel. Antes de que el
  dueño real entre, cualquier persona con cuenta en NEXUS abre
  `/gimnasio-central` y queda como dueña; el dueño real verá "Sin acceso".
- **Mitigación.** Eliminar el bootstrap automático; al crear desde el panel,
  exigir el correo del dueño y crear una `TenantInvite` con rol `OWNER` (o un
  enlace de un solo uso como `StaffInvite`).
- **Validar en producción.** `SELECT t.slug FROM "Tenant" t WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u."tenantId" = t.id);`

<a id="sec-03"></a>
### SEC-03 · Autorización solo en el layout para 17 páginas — Alta/Crítica · P0 · HIPÓTESIS FUERTE

- **Evidencia.** Solo 8 de 25 páginas bajo `app/[tenant]` llaman a
  `requireTenantContext`. Las otras 17 (p. ej. `crm/page.tsx`, `crm/[id]/page.tsx`,
  `memberships/page.tsx`, `settings/page.tsx`, `projects/[projectId]/page.tsx`,
  `quotes/[id]/print/page.tsx`, `whatsapp/page.tsx`, `catalog/page.tsx`) cargan el
  negocio por `slug` y leen sus datos confiando en `app/[tenant]/layout.tsx`.
- **Por qué importa.** En el App Router los layouts no se vuelven a ejecutar en
  la navegación del cliente y el servidor decide qué segmentos renderizar a partir
  del estado de router que envía el cliente; además, layout y página se
  renderizan en paralelo. La recomendación de Next es autorizar cerca de los datos.
  Si una petición RSC puede omitir el segmento `[tenant]`, la página devuelve datos
  de **otro negocio** (lista de clientes, ficha 360°, ajustes, equipo).
- **Estado.** No se pudo ejecutar sin claves de Clerk. **Prueba local propuesta**:
  dos negocios A y B, sesión de un miembro de A, petición a `/{B}/crm` con
  cabeceras `RSC: 1` y un `Next-Router-State-Tree` que declare el segmento
  `[tenant]` ya cargado; verificar si la respuesta contiene clientes de B.
- **Mitigación (independiente del resultado).** Un `requirePageContext(slug)`
  memoizado con `cache()` de React que cada página y cada loader invoque; las
  funciones de lectura reciben el contexto, no el slug.

<a id="sec-04"></a>
### SEC-04 · `.env.produccion` versionado — INDETERMINADO · P0 si contiene valores

- **Evidencia.** `.gitignore` excluye `.env*` pero hace una excepción explícita para
  `!.env.produccion`. El archivo dice ser una plantilla "con valores sugeridos". La
  herramienta de la auditoría no permitió inspeccionar si las asignaciones tienen
  valores (política de no materializar credenciales).
- **Acción.** Revisarlo a mano y en el historial (`git log -p -- .env.produccion`).
  Si contiene `sk_live_`, la URL de la base, `WHATSAPP_APP_SECRET` u otros, rotarlos y
  convertirlo en plantilla vacía.

<a id="sec-05"></a>
### SEC-05 · Permisos por rol incompletos e inconsistentes — Media · P1 · IMPLEMENTADO

| Acción | Control actual | Esperado según `lib/business/roles.ts` |
|---|---|---|
| `createMembershipAction`, `renewMembershipAction` (cobran) | solo membresía | `canHandleCash` (el Asesor es "sin dinero") |
| `deleteCustomersAction`, `archiveCustomerAction` | solo membresía | `canManage` para borrar |
| Construcción | `createAuth` usado en **un** archivo; el resto con `canGovernBudget`; `STAFF` heredado sí, `RECEPTION` no; `ADMIN` gobierna presupuesto pero no crea obras | Una sola matriz |
| Tipos de rol | `TenantRole`, `NexusRole`, `BusinessRole` (tres definiciones) | Uno |
| Onboarding resume | comprueba que exista `User`, no que esté activo ni su rol (`app/onboarding/actions.ts:212`) | OWNER activo |

<a id="sec-06"></a>
### SEC-06 · Módulos y plan no se aplican en el servidor — Media · P1 · IMPLEMENTADO

- Las páginas y acciones no comprueban `TenantModule`; un módulo desactivado solo
  desaparece del menú (`app/[tenant]/(app)/layout.tsx:51`).
- `toggleModuleAction` deja al dueño activar cualquier módulo compatible con el
  rubro sin mirar `contractedModules` ni el plan (`lib/plans/compat.ts:10`).
- Impacto: hoy comercial (piloto sin cobro); cuando haya cobro, es acceso a
  funciones no pagadas.

<a id="sec-07"></a>
### SEC-07 · Sin defensa en la base de datos — Media · P2 · VERIFICADO (migraciones)

- La app usa un único rol con todos los privilegios (`prisma/db.ts`); RLS no aplica.
- Las migraciones de Prisma crean 71 tablas con **0** tablas con RLS y **0**
  políticas (verificado en Postgres local). El SQL manual de producción activa RLS
  en 36 tablas **sin políticas**: bloquea la API REST de Supabase (bien), pero no
  protege nada del acceso de la app.
- FK simples sin `tenantId` y 22 tablas sin FK a `Tenant`
  ([domain-and-data-model.md](domain-and-data-model.md#4-integridad-referencial-y-aislamiento-a-nivel-de-base)).
- Recomendación: no introducir RLS completa todavía (coste alto con un ORM y un
  rol único); sí activar RLS sin políticas en **todas** las tablas para cerrar
  PostgREST, revisar que la clave `anon` no se use, y añadir FK compuestas
  `(tenantId, id)` en las relaciones de dinero.

<a id="sec-08"></a>
### SEC-08 · Integrantes retirados conservan acceso a archivos — Media · P2 · IMPLEMENTADO

`/api/files/{id}` y `/api/apu-images/{id}` comprueban que exista un `User` del
negocio, pero no `active` (`app/api/files/[id]/route.ts:16`,
`app/api/apu-images/[imageId]/route.ts:31`). Quien fue retirado puede seguir
descargando comprobantes y fotos si conoce los IDs.

<a id="sec-09"></a>
### SEC-09 · SSRF en el análisis de Presence — Media · P2 · IMPLEMENTADO

`analyzeWebsite` (`lib/presence/website.ts:24`) hace `fetch` a la URL que el negocio
escribe, sigue redirecciones y devuelve estado, título y meta descripción. Permite
sondear hosts internos o servicios de metadatos desde el servidor. Mitigar con
lista de esquemas/puertos, resolución DNS y bloqueo de rangos privados, sin
seguir redirecciones a otros hosts.

<a id="sec-10"></a>
### SEC-10 · Vinculación por correo sin comprobar verificación — Alta si Clerk no verifica · P1 · INDETERMINADO

`acceptInvitesFor`, `linkStaffToSession` y el onboarding usan
`primaryEmailAddress ?? emailAddresses[0]` sin mirar el estado de verificación. Si
el panel de Clerk permite cuentas con correo sin verificar o añadir correos
secundarios sin verificar, alguien podría aceptar invitaciones ajenas. Confirmar
la configuración de Clerk y exigir correo verificado en código.

<a id="sec-11"></a>
### SEC-11 · Sin auditoría dentro del negocio — Media · P2 · IMPLEMENTADO

Anular pagos, borrar clientes, cambiar roles, retirar personas, activar módulos o
**borrar el negocio entero** (`deleteOwnBusinessAction`) no dejan rastro en
`AuditLog` (solo el panel escribe ahí). Algunas tablas guardan `createdById` o
`voidReason`, pero no hay bitácora.

<a id="sec-12"></a>
### SEC-12 · Endurecimientos menores — Baja · P3

- Firma del recibo truncada y comparada con `===`; cae a `CLERK_SECRET_KEY` si no
  hay `RECEIPT_LINK_SECRET` (`lib/business/finance-db.ts:88`).
- `isAllowedBlobUrl` acepta cualquier `*.public.blob.vercel-storage.com`, no solo
  el almacén propio (`lib/apu-importer/upload-source.ts:23`).
- `/api/blob-upload` emite tokens a cualquier sesión, sin comprobar que sea
  miembro de un negocio.
- Límite de intentos en memoria: inútil entre instancias serverless.
- `GET /invitacion/{token}` consume la invitación al renderizar (efecto en GET).
- `Payment.providerRefId` único global: revela si una referencia existe en otro
  negocio.

## 4. Lo que está bien (conservar)

- Una sola función de contexto para acciones y uso casi universal.
- El servidor decide plan y módulos en el onboarding; canje de códigos atómico
  con prueba de concurrencia.
- Comprobación de pertenencia de IDs foráneos antes de escribir.
- Panel con permisos granulares por página y acción, y auditoría.
- Archivos servidos con `nosniff`, CSP `sandbox` y 404 indistinguible.
- Webhooks verificados en tiempo constante.

## 5. Pruebas locales recomendadas (no destructivas)

1. SEC-01: prueba de integración con correos que contienen `_` y `%`.
2. SEC-02: crear negocio vía `adminDb.createTenant` y simular el layout con otra
   sesión.
3. SEC-03: la petición RSC descrita arriba, en `next dev` con una instancia de
   Clerk de desarrollo.
4. Matriz rol × acción generada desde un registro de permisos (cuando exista).

Siguiente: [technical-debt.md](technical-debt.md).
