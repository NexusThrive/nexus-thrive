# Tabla de permisos — acciones del catálogo APU

Basado en: `lib/authorization.ts` (`canEditApuCatalog`, `canManageApuCatalogDestructive`), `lib/tenant-context.ts` (`requireTenantContext`), `app/[tenant]/(app)/quotes/actions.ts` (cadena D7: sesión → tenant → rol → pertenencia → validación → transacción → resultado tipado → revalidatePath).

| Acción | Sesión | Tenant | Rol (via lib/authorization) | Pertenencia (member) | Validación | Resultado tipado | Revalida | Notas |
|---|---|---|---|---|---|---|---|---|
| createItem | auth() requerida | requireTenantContext valida tenantSlug | canEditApuCatalog: OWNER/SUPERADMIN/STAFF | member existe (tenantContext) | validators.createItemSchema (zod) | ApuMutationState {ok,error,fieldErrors} | revalidatePath(`/${tenant}/quotes`, "page") | Crear insumo en banco |
| updateItem | auth() requerida | requireTenantContext | canEditApuCatalog | valida pertenencia | validators.updateItemSchema | ApuMutationState | revalidatePath(quotes) | Editar insumo |
| archiveItem | auth() requerida | requireTenantContext | canManageApuCatalogDestructive: OWNER/SUPERADMIN | valida pertenencia | id requerido | ApuMutationState (map APU_*) | revalidatePath(quotes) | Archivar (no borra) |
| restoreItem | auth() requerida | requireTenantContext | canManageApuCatalogDestructive: OWNER/SUPERADMIN | valida pertenencia | id requerido | ApuMutationState | revalidatePath(quotes) | Restaurar |
| deleteItem | auth() requerida | requireTenantContext | canManageApuCatalogDestructive: OWNER/SUPERADMIN | valida pertenencia | id requerido | ApuMutationState (APU_IN_USE si tiene composiciones) | revalidatePath(quotes) | Borrado seguro |
| createActivity | auth() requerida | requireTenantContext | canEditApuCatalog | valida pertenencia | validators.createActivitySchema | ApuMutationState | revalidatePath(quotes) | Crear actividad |
| updateActivity | auth() requerida | requireTenantContext | canEditApuCatalog | valida pertenencia | validators.updateActivitySchema | ApuMutationState | revalidatePath(quotes) | Editar actividad |
| archiveActivity | auth() requerida | requireTenantContext | canManageApuCatalogDestructive: OWNER/SUPERADMIN | valida pertenencia | id requerido | ApuMutationState (APU_IN_USE si usada en QuoteItem) | revalidatePath(quotes) | Archivar |
| restoreActivity | auth() requerida | requireTenantContext | canManageApuCatalogDestructive: OWNER/SUPERADMIN | valida pertenencia | id requerido | ApuMutationState | revalidatePath(quotes) | Restaurar |
| deleteActivity | auth() requerida | requireTenantContext | canManageApuCatalogDestructive: OWNER/SUPERADMIN | valida pertenencia | id requerido | ApuMutationState (APU_IN_USE si usada en QuoteItem) | revalidatePath(quotes) | Borrado seguro |
| addComposition | auth() requerida | requireTenantContext | canEditApuCatalog | valida pertenencia | activityId,itemId,consumption,wastePercent? | ApuMutationState (valida composición) | revalidatePath(quotes) | Añade línea BOM |
| removeComposition | auth() requerida | requireTenantContext | canEditApuCatalog | valida pertenencia | id requerido | ApuMutationState | revalidatePath(quotes) | Elimina línea BOM |
| getP99ThresholdsAction | auth() requerida | requireTenantContext | lectura (cualquier miembro válido) | valida pertenencia | sin mutación | datos tipados | — | Solo lectura |
| getCatalogHealthReportAction | auth() requerida | requireTenantContext | lectura | valida pertenencia | sin mutación | datos tipados | — | Solo lectura |

**Notas**:
- `requireTenantContext` extrae `userId, tenantId, role, tenantDb` tras validar sesión + pertenencia al tenant.
- D7 aplicado: sesión → tenant → rol → pertenencia → validación → transacción → resultado tipado → revalidatePath.
