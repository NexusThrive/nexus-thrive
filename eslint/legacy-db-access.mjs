/**
 * ARCH-04 (docs/nexus-architecture/technical-debt.md): las pantallas y acciones
 * de `app/` no consultan la base directo; lo hacen por los repositorios de
 * `lib/` (que reciben el contexto del negocio y no se olvidan del `tenantId`).
 *
 * Estos archivos ya lo hacían cuando entró la regla: son deuda por pagar. La
 * lista solo se achica — `lib/tenant/data-access.test.ts` falla si un archivo
 * de aquí ya no importa la base (sácalo) o si dejó de existir.
 */
export const LEGACY_DB_ACCESS = [
  "app/admin/bandeja/actions.ts",
  "app/admin/crm/actions.ts",
  "app/admin/facturacion/actions.ts",
  "app/admin/negocios/actions.ts",
  "app/admin/presence/actions.ts",
  "app/api/apu-images/[imageId]/route.ts",
  "app/api/files/[id]/route.ts",
  "app/auth/callback/actions.ts",
  "app/auth/callback/page.tsx",
  "app/c/[code]/actions.ts",
  "app/c/[code]/page.tsx",
  "app/onboarding/actions.ts",
  "app/onboarding/prefill.ts",
  "app/r/[token]/page.tsx",
  "app/[tenant]/(app)/_actions/notifications.ts",
  "app/[tenant]/(app)/_actions/preferences.ts",
  "app/[tenant]/(app)/billing/actions.ts",
  "app/[tenant]/(app)/billing/[id]/page.tsx",
  "app/[tenant]/(app)/billing/page.tsx",
  "app/[tenant]/(app)/bookings/agenda-actions.ts",
  "app/[tenant]/(app)/bookings/page.tsx",
  "app/[tenant]/(app)/catalog/actions.ts",
  "app/[tenant]/(app)/crm/[id]/carnet/page.tsx",
  "app/[tenant]/(app)/crm/[id]/page.tsx",
  "app/[tenant]/(app)/crm/profile-actions.ts",
  "app/[tenant]/(app)/finance/actions.ts",
  "app/[tenant]/(app)/finance/money-actions.ts",
  "app/[tenant]/(app)/finance/page.tsx",
  "app/[tenant]/(app)/inventory/actions.ts",
  "app/[tenant]/(app)/inventory/page.tsx",
  "app/[tenant]/(app)/layout.tsx",
  "app/[tenant]/(app)/page.tsx",
  "app/[tenant]/(app)/projects/[projectId]/budget/actions.ts",
  "app/[tenant]/(app)/quotes/actions.ts",
  "app/[tenant]/(app)/quotes/[id]/page.tsx",
  "app/[tenant]/(app)/quotes/page.tsx",
  "app/[tenant]/(app)/settings/actions.ts",
  "app/[tenant]/(app)/settings/page.tsx",
  "app/[tenant]/(app)/settings/team-actions.ts",
  "app/[tenant]/(app)/tickets/page.tsx",
  "app/[tenant]/layout.tsx",
  "app/[tenant]/quotes/[id]/print/page.tsx",
];
