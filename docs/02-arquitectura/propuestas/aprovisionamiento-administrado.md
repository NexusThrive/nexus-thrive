# Auditoría del aprovisionamiento administrado

## Alcance y evidencia

Primera entrega del MVP solicitado el 2026-11-16: auditoría funcional del alta, identidad, membresías y compatibilidad; no es un pentest ni certifica seguridad exhaustiva. Fuente: código en `593623e4`, inspección de rutas, contrato y migraciones; consulta de solo lectura a la base configurada. No se modificaron código de aplicación, configuración de Clerk ni datos. La [decisión propuesta](../../05-decisiones/ADR-0011-arquitectura-aprovisionamiento-administrado.md) y el [plan de historias](../../07-ingenieria/propuestas/aprovisionamiento-administrado.md) separan lo observado de lo pendiente.

## Alta administrativa reutilizable

| Superficie | Comportamiento observado | Cambio necesario |
| --- | --- | --- |
| `app/admin/_components/tenant-form.tsx` | `ResponsiveSheet`, `useActionState`, bloqueo durante envío, errores accesibles y disponibilidad de slug con debounce de 350 ms. Pide perfil, razón social, NIT, equipo, dirección, vertical y módulos además del nombre, slug y correo. No deriva el slug del nombre. | Conservar patrones y reducir a nombre comercial, slug sugerido editable y correo; explicar «En preparación; sin acceso del propietario». |
| `app/admin/actions.ts#createTenantAction` | `requireStaff("accounts.create")`, validación definitiva, consulta de slug, límite por correo y captura de colisión única. | Mantener controles; llamar un servicio común de alta administrada con clave de reintento. |
| `app/admin/validators.ts` | Normaliza correo y valida formato y longitud; valida slug y datos técnicos. | Reutilizar correo/slug; fijar Commerce internamente y rechazar parámetros técnicos inesperados. |
| `lib/platform/admin/db.ts#createTenant` | Transacción: tenant, módulos, invitación OWNER a 14 días y puerto `tenantProvisioningPort.onCreated`. Nace `active=true`, `onboardingCompleted=false`, sin `User`. | Conservar transacción y puerto; guardar correo sin emitir invitación utilizable; auditoría atómica. |
| `app/admin/usuarios/actions.ts#createUserOrganizationAction` | Segunda alta con permiso `accounts.create`, slug generado y mismo repositorio; recibe vertical. Normaliza correo pero no aplica la validación completa del modal. | Unificar con el mismo servicio; evitar una vía que conserve el contrato anterior. |
| Suspender/reactivar | `suspendTenantAction` exige motivo y `accounts.suspend`; guarda `active=false`, fecha y motivo. `activateTenantAction` solo pone `active=true`. | Separar primera activación de reactivación; la acción actual no comprueba preparación ni entrega invitaciones. |

La auditoría administrativa se escribe **después** de la transacción, captura fallos y continúa. Hoy no garantiza que cada alta exitosa tenga un registro auditable persistido. La unicidad de slug evita tenants con el mismo slug, pero no ofrece reintento que devuelva el resultado original ni protege contra duplicados con slugs diferentes para la misma solicitud.

Commerce ya está identificado por `lib/core/capabilities/solutions.ts`: `retail` pertenece a `commerce`. No hace falta crear una solución, cambiar otros rubros ni desarrollar la tienda. El puerto existente siembra configuración contable dentro de la transacción (`lib/runtime/ports.ts`); conservarlo evita alterar inicializaciones existentes.

## Creación pública y entradas de autoservicio

«Pública» aquí incluye una cuenta autenticada sin autorización administrativa. La acción actual requiere sesión; no exige pertenencia al equipo NexusThrive.

1. `app/onboarding/actions.ts#completeAdaptiveOnboardingAction`, sin `tenantId`, llama a `createTenantWithOwner`: crea tenant completo, OWNER efectivo y módulos. También inicia prueba de autoservicio o canjea beneficios. El modo de creación toma el correo de Clerk sin usar `verifiedEmailOf`.
2. El modo de reanudación de esa acción valida membresía activa y `business.setup`, pero permite completar preparación, plan y módulos desde el wizard. Cerrar solo el modo de creación no retira este flujo.
3. `app/onboarding/page.tsx` y `lib/experience/onboarding/prefill.ts` sirven creación/reanudación; `?nuevo=1` permite otra organización. `components/organisms/business-switcher.tsx` enlaza esa variante.
4. `app/[tenant]/onboarding/page.tsx`, el layout `(app)` y el callback remiten al wizard. `app/c/[code]/actions.ts` dirige a onboarding o registro. Los códigos `BenefitCode` son beneficios comerciales; no son autorizaciones OWNER.
5. Registro visible: `app/page.tsx`, `components/templates/auth-layout.tsx`, `components/molecules/auth-mode-switch.tsx`, `components/organisms/pricing/public-pricing.tsx`, `SignIn.signUpUrl` y `/sign-up`. La invitación de personal también enlaza registro; hay que conservar su aceptación autorizada.
6. `.env.example` mantiene `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding`; revisar asimismo las variables desplegadas. `proxy.ts` permite expresamente `/onboarding` y `/sign-up` y delega autorización al servidor; no es una barrera de alta.

La búsqueda de `Tenant.create` y `createTenant` en `app/` y `lib/` encontró las dos altas administrativas y la escritura del onboarding. No se encontró un endpoint REST público adicional que cree tenants. Tests, migraciones y SQL operativos contienen otras creaciones que no son entradas públicas y deben conservarse.

## Identidad, invitaciones y aislamiento

| Componente | Garantía actual | Brecha respecto al objetivo |
| --- | --- | --- |
| `getStaffContext` / `requireStaff` | Personal activo con rol y permisos; vinculación por correo principal verificado y bootstrap del SUPERADMIN heredado. `app/admin/layout.tsx` rechaza cuentas ajenas; las acciones revalidan permisos. | No equiparar `User.role=OWNER` con personal de Nexus. Mantener prueba negativa de `/admin`. |
| `verifiedEmailOf` | Principal verificado, normalizado; comparación exacta y escape de comodines en búsquedas de personal. | Conservar en toda aceptación, sin confiar en correo enviado por el cliente ni en metadata pública. |
| `TenantInvite` / `team-db.ts` | Invitación por correo y rol, vencimiento, revocación, aceptación y creación/reactivación de `User`. | No hay envío de correo asociado al alta OWNER ni identificador de invitación Clerk. |
| `acceptInvitesFor` | Filtra correo exacto, pendiente, no revocada y vigente. Lo llaman callback y resolución de membresía. | No comprueba `Tenant.active` ni preparación; lectura, `User` y aceptación no son una transacción. Carrera con revocación/aceptación y posible cambio de rol de miembro existente. |
| `createInvite` / `revokeInvite` | Revoca pendientes anteriores y crea una nueva; existe revocación por tenant/id. | Reemplazo sin transacción ni unicidad de invitación pendiente; no resuelve entrega ni la primera activación. |
| `requireTenantContext` | Sesión, tenant activo, miembro activo y módulo habilitado, con repositorio ligado al tenant. | No comprueba preparación; el redirect del layout no protege acciones directas ni renderizado paralelo. |
| `homeTenantFor` | Prioriza completos y activos entre las membresías. | Puede devolver un tenant inactivo y no devuelve `active`; el callback puede dirigir a suspendidos o al wizard. |
| `isActiveMember` / archivos | Comprueba pertenencia y `User.active`; permite excepción explícita de personal. | No comprueba actividad del tenant; suspensión debe bloquear también adjuntos del propietario. |
| API con llave | `lib/core/api/handler.ts` rechaza tenant inexistente/inactivo. | Aplicar preparación/activación administrada en la misma frontera sin tocar las operaciones comerciales. |

`app/invitacion/[token]` corresponde a **personal de Nexus**, con `StaffInvite`, no a `TenantInvite`. No reutilizar su token para dar OWNER ni privilegios administrativos. `redeemStaffInvite` vincula por posesión del token a la sesión, sin exigir el correo verificado del destinatario: este comportamiento existente no sirve como aceptación de propietarios. Restringir registro obliga a comprobar también cómo entra personal nuevo, sin ampliar en esta historia sus privilegios.

Existe proveedor de correo reutilizable en `lib/platform/inbox/inbox-providers.ts` (Resend, `RESEND_API_KEY`, `INBOX_EMAIL_FROM`): devuelve `sent`, `manual` o `failed`. No se constató su configuración ni se enviaron correos. «Manual» no debe mostrarse como entrega exitosa. Las invitaciones locales de tenant no son invitaciones de aplicación de Clerk.

## Dependencias de onboardingCompleted

Inventario completo de referencias ejecutables localizadas en `app/`, `lib/` y contrato al momento de la auditoría; una fila agrupa todas las referencias de un mismo archivo:

| Archivos | Uso / tratamiento |
| --- | --- |
| `prisma/schema/core/tenant.prisma` | Booleano con valor inicial false; mantener durante transición como preparación, sin borrar ni completar masivamente. |
| `app/onboarding/actions.ts` | Única escritura explícita encontrada: perfil completo e idempotencia de reanudación. Retirar acción de autoservicio antes de sustituir la preparación administrativa. |
| `app/auth/callback/page.tsx` | Destino postlogin: sustituir por resolución de acceso, suspensión y preparación. |
| `app/[tenant]/(app)/layout.tsx`, `app/[tenant]/onboarding/page.tsx` | Redirección al wizard: retirar y usar estado de acceso del servidor. |
| `lib/core/tenancy/membership.ts` | Selección de home y selector de negocios: adoptar regla común preservando membresías heredadas. |
| `lib/experience/onboarding/prefill.ts` | Creación/reanudación/done: dejar de servir el wizard público. |
| `lib/platform/admin/db.ts` | Tipos, progreso, filtros, KPIs, listado y detalle: distinguir preparación, activación e invitación. |
| `app/admin/_components/tenant-table.tsx`, `tenant-drawer.tsx`, `app/admin/negocios/[id]/page.tsx`, `app/admin/export/route.ts` | Etiquetas, progreso, avisos y CSV: mantener coherencia con estados administrativos. |
| `lib/platform/accounts/onboarding-board.ts`, `onboarding-checklist.ts`, `accounts.ts` | Tablero, salud y prioridades: conservarlos como seguimiento de preparación, sin confundir checklist comercial con autorización. |
| `app/[tenant]/(app)/settings/page.tsx` | Dato informativo: adaptar etiqueta sin cambiar navegación del negocio. |

`app/[tenant]/layout.tsx` también describe la regla en comentarios. `tests/unit/platform/accounts/onboarding-checklist.test.ts` y fixtures de integración usan el campo. Las migraciones/snapshots y el histórico no se reescriben. Otros imports bajo `onboarding/` contienen tipos, presets, iconos, trials y primeros pasos compartidos con Ajustes, Funciones, precios y panel administrativo: **no eliminar ese directorio de forma masiva**.

## Modelo, restricciones y migraciones

Prisma 8: `@prisma/orm-postgres` rc.14, CLI rc.20, contrato multifichero, `prisma/contract.json` y `contract.d.ts`; configuración en `prisma.config.ts`. No usar comandos ni APIs de Prisma 7. La diferencia CLI/runtime existe en la base y no se cambia en esta tarea.

- `Tenant.slug` y `customDomain` son únicos; `TenantModule` tiene unicidad tenant/módulo; `User` tiene unicidad `(clerkUserId, tenantId)`.
- `Tenant.active`, `onboardingCompleted`, `suspendedAt` y `suspendedReason` ofrecen base para acceso, preparación e historial. `accountStage` es seguimiento comercial, no autorización.
- No existe correo canónico del propietario antes de invitar, modo de aprovisionamiento, fecha de primera activación ni clave de reintento del alta. Guardar el correo solo en una invitación preactivada incumpliría el objetivo.
- `TenantInvite` tiene `acceptedAt`, `revokedAt`, `expiresAt`; su estado local se deriva de esos campos. No tiene unicidad de pendiente por tenant/correo, identificación de entrega ni estado de proveedor. `User` es la membresía efectiva, no un borrador de propietario.
- Migraciones relevantes: `20261021T0256_invitaciones_equipo` (SQL heredado), `20261023T0552_restricciones_negocio_y_rls` (FK y RLS), `20261024T0509_perfil_general`. Hay historial mixto: no asumir que todas las entradas antiguas son paquetes modernos equivalentes.
- `migrations/app/refs/db.json` apunta a `691a1768…`; es una referencia versionada, **no prueba del estado aplicado** en la base. La migración futura debe verificar marker, esquema, cadena y snapshot de origen; nunca generar contra `@empty` por conveniencia.
- Se conserva el SQL de producción y se añade el correspondiente al cambio de contrato, según `scripts/check-prod-sql.sh`. No se ejecutó DDL ni se firmó o migró una base.

## Negocios existentes y compatibilidad

Consulta con `BEGIN READ ONLY`, timeout y `ROLLBACK`, el **2026-11-16T17:53:42Z**, contra `DATABASE_URL` cargada por `.env`. No se identificó independientemente ese entorno como desarrollo, staging o producción. [Inventario agregado y huella de la captura](aprovisionamiento-inventario-2026-11-16.json), sin identificadores de negocios, correos ni credenciales. El detalle por id/slug permanece local en `/tmp/nexus-managed-inventory.json`; no se publica en este repositorio público. Ese archivo temporal no es almacenamiento durable entre máquinas: antes del despliegue se repite el inventario en el entorno correspondiente y se conserva en el canal operativo privado del equipo.

| Cohorte observada | Tenants | Acceso a preservar |
| --- | --- | --- |
| Activos y completos, con miembros | 16 | 17 membresías totales y 16 OWNER activos; conservar ids, roles y acceso. |
| Activos e incompletos, sin miembros | 63 | Conservar todos los datos; no invitar, activar ni borrar automáticamente. |
| Inactivos | 0 | La ausencia en esta captura no elimina la necesidad de probar suspensión. |
| Invitaciones pendientes vigentes | 0 | No implica ausencia de invitaciones históricas vencidas/aceptadas/revocadas. |

Los 16 negocios con membresías tienen verticales gym, construction y general; no convertirlos a Commerce. El detalle local permite identificarlos por id y slug sin publicar esa relación. Algunos otros slugs parecen fixtures, pero el nombre no acredita que se puedan limpiar. No se consultó ni modificó contenido de ventas, clientes o finanzas.

## Riesgos y mitigaciones

| Prioridad | Riesgo | Mitigación / evidencia requerida |
| --- | --- | --- |
| Alta | Invitación OWNER utilizable al crear y aceptación sin comprobar tenant | Guardar intención de propietario; emitir solo tras primera activación y revalidar dentro de la aceptación. |
| Alta | Bloqueo solo en layout permite acciones directas en preparación | Política central en contexto, aceptación, API y archivos; pruebas con peticiones directas. |
| Alta | Revocación, activación o doble aceptación concurrentes | Serialización por tenant e invitación, restricciones de unicidad y transacciones; pruebas PostgreSQL concurrentes. |
| Alta | Reintento de envío tras timeout duplica invitaciones remotas | Estado de entrega durable, lease y reconciliación con Clerk; no prometer exactly-once entre HTTP y PostgreSQL. |
| Alta | Marcar todo `active=false` o forzar Commerce rompe negocios existentes | Cambios aditivos, distinción explícita legacy/managed y comparación de accesos/datos antes/después. |
| Alta | Registro aún abierto en Clerk o Account Portal | Operación manual Invite-only más prueba en entorno desplegado; el repositorio no acredita configuración del dashboard. |
| Media | Usuario Clerk existente recibe error al invitar o identidad duplicada | Resolver existencia por correo verificado, reutilizar identidad y flujo de login; no crear usuarios Clerk a ciegas. |
| Media | Revocar invitación de aplicación compartida rompe acceso a otro tenant | Separar autorización local de alta de identidad; no revocar cuentas ni invitaciones ajenas. |
| Media | Beneficios, registro de personal y enlaces antiguos vuelven al wizard | Inventario de rutas y pruebas de destinos; beneficio no concede membresía. |
| Media | Auditoría best effort o envío manual presentado como éxito | Registro atómico y estado explícito de pendiente/fallo/entrega aceptada por proveedor. |
| Media | Cambiar defaults del repositorio rompe fixtures de otras áreas | Ajustar preparación explícita de fixtures; no cambiar comportamiento comercial para acomodar pruebas. |

## Clerk: intervención pendiente

Pasos propuestos para quien administra cada instancia, después de comprobar el flujo invitado en staging:

1. Abrir la instancia correcta en Clerk Dashboard → **Access mode** → **Invite-only** → **Save** (`restricted` en API). Conservar autenticación de cuentas existentes y revisar conexiones empresariales y otras vías de creación autorizadas.
2. Revisar dominio, Account Portal, registro por invitación y redirects; dirigir login/aceptación a `/auth/callback`, quitar cualquier fallback al wizard tanto en dashboard como en variables desplegadas.
3. Conservar una entrada de registro válida para invitaciones Clerk; eliminar navegación libre no significa bloquear las invitaciones válidas. Probar también las invitaciones de personal Nexus.
4. En staging comprobar: login existente, alta rechazada sin invitación, invitación vigente, expirada, revocada, cuenta ya existente y destinatario incorrecto. Registrar instancia, fecha y operador sin secretos.

Clerk documenta que su invitación de aplicación puede enviar correo y registrar identidad, pero **no crea la membresía del negocio**. La autorización seguirá en PostgreSQL. Consultado el 2026-11-16: [restricción de acceso](https://clerk.com/docs/guides/secure/restricting-access), [invitaciones](https://clerk.com/docs/guides/users/inviting) y [createInvitation](https://clerk.com/docs/reference/backend/invitations/create-invitation). No se modificó el dashboard, no se llamó al envío de invitaciones y no se comprobó entrega real.

## Verificación de esta entrega

Resultados y cierre se registran en el [plan e informe de ingeniería](../../07-ingenieria/propuestas/aprovisionamiento-administrado.md#evidencia-de-la-primera-entrega). Las pruebas nuevas del MVP están planificadas; no se presentan como ejecutadas. Engram `mem_session_summary` no está disponible entre las herramientas de esta sesión; estos documentos conservan hallazgos y siguientes pasos.
