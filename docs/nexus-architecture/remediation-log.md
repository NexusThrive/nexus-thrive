# Registro de correcciones

[← Índice](README.md) · Qué hallazgos de la auditoría ya se corrigieron, con su
prueba de regresión. La auditoría (commit `1551e9a`) cita rutas anteriores a la
reorganización de `lib/`: `lib/tenant-db.ts` → `lib/tenant/db.ts`,
`lib/admin-db.ts` → `lib/admin/db.ts`, etc.

## Etapa 0 · Contención de seguridad

| Hallazgo | Estado | Corrección | Prueba |
|---|---|---|---|
| [SEC-01](security-audit.md#sec-01) | Corregido | Correo comparado de forma exacta (`exactIlikePattern`: escapa `\`, `%`, `_`) en `findStaffByEmail` y `redeemStaffInvite`. "Usar esta cuenta" solo reasigna una ficha vinculada si la cuenta anterior ya no tiene ese correo en Clerk (falla cerrado) y queda en `AuditLog` (`STAFF_INVITE`, evento `takeover`) | `lib/ops/access.integration.test.ts` (`_`, `%`, `\`) |
| [SEC-10](security-audit.md#sec-10) | Corregido en código | Solo el correo **principal y verificado** vincula fichas e invitaciones (`verifiedEmailOf` en `lib/auth/session-email.ts`); nunca `emailAddresses[0]` | `lib/auth/session-email.test.ts` |
| [SEC-02](security-audit.md#sec-02) | Corregido | Sin dueño automático: `resolveTenantMembership` (`lib/tenant/membership.ts`) solo deja entrar con membresía activa o invitación al correo verificado. El panel exige el correo del dueño y crea, en la misma transacción, una `TenantInvite` OWNER | `lib/tenant/membership.integration.test.ts` |
| [SEC-04](security-audit.md#sec-04) | **Confirmado: credenciales en el historial** | `.env.produccion` es una plantilla sin secretos. Pero transcripts de sesión (`conversations/*.md`, hoy en `.gitignore`) se versionaron entre `5bd306d` y `3bf4ef4` y siguen en el historial de ramas públicas: contienen una clave secreta de Clerk (instancia de desarrollo) y cadenas de conexión de Postgres con contraseña hacia Supabase | Credenciales rotadas e historial reescrito el 2026-10-22 (ver abajo) |

### SEC-04 · Qué hacer

1. **Rotar ya** (lo hace quien administra las cuentas):
   - Supabase → Project Settings → Database → *Reset database password*. Cambia
     `DATABASE_URL` en Vercel y en los `.env` locales.
   - Clerk (instancia de desarrollo) → API Keys → rotar la *Secret key*.
2. Revisar en Supabase los registros de conexión desde fechas anteriores a la
   rotación.
3. ~~Reescribir el historial~~ **Hecho el 2026-10-22**: `git filter-repo`
   retiró `conversations/` de todo el historial y reemplazó por `***REMOVED***`
   la contraseña que `scripts/psql-supabase.sh` traía por defecto (commit
   `8977ef9` original). *Force push* de las 15 ramas y el tag `v1.0`; un
   escaneo de los 2.933 blobs no encontró credenciales. El script ahora exige
   `SUPABASE_DB_PASSWORD`. Respaldo previo en un *bundle* local fuera del repo.
   Queda fuera del alcance de un push: los `refs/pull/*` de los 22 PR cerrados
   siguen apuntando a los commits viejos en GitHub; purgarlos lo hace el
   soporte de GitHub. Las credenciales ya están rotadas.

## Etapa 1 · Aislamiento y permisos

| Hallazgo | Estado | Corrección | Prueba |
|---|---|---|---|
| [SEC-03](security-audit.md#sec-03) | Corregido | `requirePageContext(slug)` (memoizada con `cache()`) en las 15 páginas que leían datos confiando en el layout; devuelve 404 indistinguible. Dos páginas sin datos quedan exentas con su motivo | `lib/tenant/page-authorization.test.ts` recorre cada `page.tsx` de `app/[tenant]` |
| [SEC-05](security-audit.md#sec-05) | Corregido | Matriz única `permiso → roles` en `lib/business/permissions.ts`; `canManage`, `canHandleCash`, `canGovernBudget` y `createAuth` derivan de ella. Un solo tipo de rol (`TenantRole` y `NexusRole` son alias de `BusinessRole`). Vender/renovar membresías exige `money.handle`; archivar/restaurar/borrar clientes, `customers.delete`; reanudar el onboarding, dueño activo (`business.setup`) | `lib/business/permissions.test.ts` (tabla rol × permiso escrita a mano) |
| [SEC-08](security-audit.md#sec-08) | Corregido | `/api/files/{id}` y `/api/apu-images/{id}` exigen miembro activo (`isActiveMember`). Las fotos APU dejan de abrirse con el `SUPERADMIN` heredado y usan el permiso `accounts.view` del equipo, igual que los archivos | `lib/tenant/membership.integration.test.ts` |
| [SEC-09](security-audit.md#sec-09) | Corregido | `lib/presence/url-guard.ts`: solo http/https en puertos por defecto, sin credenciales, y hosts que resuelven a IP públicas; redirecciones seguidas a mano y comprobadas una por una. Límite: DNS rebinding entre la comprobación y la conexión | `lib/presence/url-guard.test.ts` (`127.0.0.1`, `169.254.169.254`, IPv6, redirección interna) |
| [SEC-11](security-audit.md#sec-11) | Corregido | `logTenantAction` escribe en `AuditLog` (acciones `BIZ_*`) al anular pagos, gastos, facturas y entradas; archivar, restaurar y borrar clientes; invitar, cancelar invitación, cambiar rol, retirar o reactivar personas; activar módulos y borrar el negocio. No rompe la acción si falla | `lib/tenant/audit.integration.test.ts` |

La interfaz ya no ofrece lo que el rol no puede hacer: sin `customers.delete`
no hay archivar, restaurar ni eliminar en la tabla de clientes; sin
`money.handle` no hay "Nueva membresía" ni "Renovar". El servidor lo sigue
exigiendo igual.

## Etapa 2 · Integridad del dinero

| Hallazgo | Estado | Corrección | Prueba |
|---|---|---|---|
| [DATA-01](technical-debt.md#data-01) | Corregido | Servicio único `lib/business/money-service.ts`: pago, recibo consecutivo, caja del turno, estado del documento y stock en **una** transacción, reintentada completa si dos cobros chocan por el número de recibo. Lo que se cobra una vez (factura, reserva de taquilla, anulación) se reclama con un `UPDATE … WHERE status = …` condicional. La venta directa vuelve a validar el stock dentro de la transacción. Lo usan Finanzas (cobro manual y con comprobante), inventario, facturación, taquilla, membresías (venta y renovación junto con la membresía) y la inscripción desde la ficha del cliente, que además exige `money.handle` para cobrar | `lib/business/money-service.integration.test.ts`: 3 clics en «Pagar» → 1 cobro (con el código anterior salían 3); recibos simultáneos sin repetir; fallo a mitad → 0 filas; última unidad vendida una vez; anulación doble → un solo ajuste de caja |
| [DATA-02](technical-debt.md#data-02) | Corregido en código | El historial de cobros de una membresía sale de `Payment` (con su estado: refleja anulaciones). El Json `Membership.payments` ya no se escribe ni se lee; la columna se retira con la migración de DATA-03 | `money-service.integration.test.ts` (historial desde `Payment`, anulación visible, Json sin escribir) |
| [DATA-03](technical-debt.md#data-03), [DATA-04](technical-debt.md#data-04), [SEC-07](security-audit.md#sec-07) | Pendiente | Requieren comparar con el esquema real de producción (`pg_dump --schema-only`) antes de migrar | — |

## Etapa 3 · Modularidad (parte sin cambios de esquema)

| Hallazgo | Estado | Corrección | Prueba |
|---|---|---|---|
| [ARCH-02](technical-debt.md#arch-02) | Corregido (enlaces) | "Salidas" (`/departures`) salía en el menú de turismo sin tener página: se retira hasta que exista su pantalla | `lib/navigation/tenant-nav.test.ts` recorre el menú de cada rubro con todos los módulos y exige `page.tsx` por `href` |
| [SEC-06](security-audit.md#sec-06) | Corregido | `modulesForRoute` (derivada del menú, una sola fuente) dice qué módulos habilitan cada ruta; `/finance` la abren Finanzas y Pagos. `requireTenantContext(slug, ruta)` y `requirePageContext(slug, ruta)` rechazan si el negocio no tiene activo un módulo que la habilite: 92 comprobaciones en 41 archivos, incluido el marcador de Pedidos. Congelar, reanudar y cancelar membresías se exigen por `/memberships` aunque vivan en la carpeta del CRM. Desde los Ajustes solo se activa un módulo incluido en el plan (`contractedModules`; `null` no limita, el panel de NEXUS sí puede) | `page-authorization.test.ts` (cada página y acción de un módulo declara su ruta), `tenant-nav.test.ts`, `compat.test.ts`, `membership.integration.test.ts` (`isRouteEnabled` contra la base) |
| [ARCH-01](technical-debt.md#arch-01), registro de capacidades ([ADR-0003](decisions/0003-registro-de-capacidades.md)) | Pendiente | Separar `construction` de `quotes` y pasar `ModuleName` a texto validado cambia el esquema: va con DATA-03 | — |
| [ARCH-03](technical-debt.md#arch-03) | Corregido en parte | Un solo wizard: `/{tenant}/onboarding` redirige al adaptativo y se retiran el clásico y `tenantDb.onboarding`. Los adaptadores locales del contexto se llaman `actionContext` y delegan en el compartido. **Pendiente de decisión:** `/pricing` (apagada en el piloto) usa otro modelo de precios (`lib/pricing`) que `lib/plans` | `page-authorization.test.ts` prohíbe redefinir el contexto |
| [ARCH-04](technical-debt.md#arch-04) | Regla activa | ESLint prohíbe importar `@/prisma/db` en `app/`; los 42 archivos que ya lo hacían quedan en `eslint/legacy-db-access.mjs` como deuda | `lib/tenant/data-access.test.ts` (la lista solo se achica) |

### Configuración de Clerk a confirmar (SEC-10)

El código ya exige correo verificado. Conviene además que la instancia de
producción tenga activada la verificación de correo al registrarse (Clerk →
User & authentication → Email → *Verify at sign-up*), y documentarlo en
`docs/clerk-produccion.md`.
