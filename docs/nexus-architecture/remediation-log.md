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
| [SEC-04](security-audit.md#sec-04) | **Confirmado: credenciales en el historial** | `.env.produccion` es una plantilla sin secretos. Pero transcripts de sesión (`conversations/*.md`, hoy en `.gitignore`) se versionaron entre `5bd306d` y `3bf4ef4` y siguen en el historial de ramas públicas: contienen una clave secreta de Clerk (instancia de desarrollo) y cadenas de conexión de Postgres con contraseña hacia Supabase | Pendiente: rotar y decidir si se reescribe el historial (ver abajo) |
| [SEC-03](security-audit.md#sec-03) | Pendiente (Etapa 1) | `requirePageContext` en cada página | — |

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

### Configuración de Clerk a confirmar (SEC-10)

El código ya exige correo verificado. Conviene además que la instancia de
producción tenga activada la verificación de correo al registrarse (Clerk →
User & authentication → Email → *Verify at sign-up*), y documentarlo en
`docs/clerk-produccion.md`.
