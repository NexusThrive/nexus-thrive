/**
 * ARCH-04 (docs/nexus-architecture/technical-debt.md): las pantallas y acciones
 * de `app/` no consultan la base directo; lo hacen por los repositorios de
 * `lib/` (que reciben el contexto del negocio y no se olvidan del `tenantId`).
 *
 * La deuda quedó en cero (2026-10-23): ningún archivo de `app/` importa la
 * base. La lista se conserva vacía para que `lib/tenant/data-access.test.ts`
 * siga vigilando que no vuelva a crecer.
 */
export const LEGACY_DB_ACCESS = [];
