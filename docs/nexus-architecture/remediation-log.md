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
| [SEC-04](security-audit.md#sec-04) | **Confirmado: credenciales en el historial** | `.env.produccion` es una plantilla sin secretos. Pero transcripts de sesión (`conversations/*.md`, hoy en `.gitignore`) se versionaron entre `5bd306d` y `3bf4ef4` y siguen en el historial de ramas públicas: contienen una clave secreta de Clerk (instancia de desarrollo) y cadenas de conexión de Postgres con contraseña hacia Supabase | Credenciales rotadas el 2026-10-22. Pendiente: decidir si se reescribe el historial (ver abajo) |

### SEC-04 · Qué hacer

1. **Rotar ya** (lo hace quien administra las cuentas):
   - Supabase → Project Settings → Database → *Reset database password*. Cambia
     `DATABASE_URL` en Vercel y en los `.env` locales.
   - Clerk (instancia de desarrollo) → API Keys → rotar la *Secret key*.
2. Revisar en Supabase los registros de conexión desde fechas anteriores a la
   rotación.
3. Decidir si se reescribe el historial (`git filter-repo --path conversations
   --invert-paths` y *force push* de todas las ramas). Rotar es lo que protege;
   reescribir solo evita que el valor viejo siga a la vista.

## Etapa 1 · Aislamiento y permisos

| Hallazgo | Estado | Corrección | Prueba |
|---|---|---|---|
| [SEC-03](security-audit.md#sec-03) | Corregido | `requirePageContext(slug)` (memoizada con `cache()`) en las 15 páginas que leían datos confiando en el layout; devuelve 404 indistinguible. Dos páginas sin datos quedan exentas con su motivo | `lib/tenant/page-authorization.test.ts` recorre cada `page.tsx` de `app/[tenant]` |
| [SEC-05](security-audit.md#sec-05) | Corregido | Matriz única `permiso → roles` en `lib/business/permissions.ts`; `canManage`, `canHandleCash`, `canGovernBudget` y `createAuth` derivan de ella. Un solo tipo de rol (`TenantRole` y `NexusRole` son alias de `BusinessRole`). Vender/renovar membresías exige `money.handle`; archivar/restaurar/borrar clientes, `customers.delete`; reanudar el onboarding, dueño activo (`business.setup`) | `lib/business/permissions.test.ts` (tabla rol × permiso escrita a mano) |
| [SEC-08](security-audit.md#sec-08) | Corregido | `/api/files/{id}` y `/api/apu-images/{id}` exigen miembro activo (`isActiveMember`). Las fotos APU dejan de abrirse con el `SUPERADMIN` heredado y usan el permiso `accounts.view` del equipo, igual que los archivos | `lib/tenant/membership.integration.test.ts` |
| [SEC-09](security-audit.md#sec-09) | Corregido | `lib/presence/url-guard.ts`: solo http/https en puertos por defecto, sin credenciales, y hosts que resuelven a IP públicas; redirecciones seguidas a mano y comprobadas una por una. Límite: DNS rebinding entre la comprobación y la conexión | `lib/presence/url-guard.test.ts` (`127.0.0.1`, `169.254.169.254`, IPv6, redirección interna) |
| [SEC-11](security-audit.md#sec-11) | Corregido | `logTenantAction` escribe en `AuditLog` (acciones `BIZ_*`) al anular pagos, gastos, facturas y entradas; archivar, restaurar y borrar clientes; invitar, cancelar invitación, cambiar rol, retirar o reactivar personas; activar módulos y borrar el negocio. No rompe la acción si falla | `lib/tenant/audit.integration.test.ts` |

Pendiente de Etapa 1, menor: ocultar en la interfaz los botones que el rol ya
no puede usar (hoy el servidor los rechaza con un mensaje claro).

## Etapa 2 · Integridad del dinero

| Hallazgo | Estado | Corrección | Prueba |
|---|---|---|---|
| [DATA-01](technical-debt.md#data-01) | Corregido | Servicio único `lib/business/money-service.ts`: pago, recibo consecutivo, caja del turno, estado del documento y stock en **una** transacción, reintentada completa si dos cobros chocan por el número de recibo. Lo que se cobra una vez (factura, reserva de taquilla, anulación) se reclama con un `UPDATE … WHERE status = …` condicional. La venta directa vuelve a validar el stock dentro de la transacción. Lo usan Finanzas (cobro manual y con comprobante), inventario, facturación, taquilla, membresías (venta y renovación junto con la membresía) y la inscripción desde la ficha del cliente, que además exige `money.handle` para cobrar | `lib/business/money-service.integration.test.ts`: 3 clics en «Pagar» → 1 cobro (con el código anterior salían 3); recibos simultáneos sin repetir; fallo a mitad → 0 filas; última unidad vendida una vez; anulación doble → un solo ajuste de caja |
| [DATA-02](technical-debt.md#data-02) | Pendiente | Cobros de membresía también en el JSON `Membership.payments` | — |
| [DATA-03](technical-debt.md#data-03), [DATA-04](technical-debt.md#data-04), [SEC-07](security-audit.md#sec-07) | Pendiente | Requieren comparar con el esquema real de producción (`pg_dump --schema-only`) antes de migrar | — |

### Configuración de Clerk a confirmar (SEC-10)

El código ya exige correo verificado. Conviene además que la instancia de
producción tenga activada la verificación de correo al registrarse (Clerk →
User & authentication → Email → *Verify at sign-up*), y documentarlo en
`docs/clerk-produccion.md`.
