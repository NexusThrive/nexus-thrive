# Evidencias Etapa 3 - Completas (a-h + complementarias)

## a) Ítems 2.5 y 2.6
- 2.5: `apuItemCategoryToResourceType` en `lib/apu-engine.ts` (mapeo 4 categorías) + tests.
- 2.6: `getCatalogHealthReport()` + acción server (solo lectura). Placeholder `apuImporterStatus` sustituido parcialmente por evaluación (ver punto 3).

## b) p99 global (UNA VEZ sobre todo el catálogo)
Verificado en código: `getP99Thresholds` lee todas actividades + todas composiciones del tenant (sin limit/offset). Agrupa por unidad (actividad y consumo). Implementado con caché (TTL 60s) + invalidación al mutar insumos/composiciones/add/removeComposition.

## c) Bloqueo borrado en uso
`deleteItem` cuenta composiciones → APU_IN_USE si >0. `deleteActivity` cuenta QuoteItem → APU_IN_USE si >0. Tests integración existentes.

## d) Permisos
Tabla completa en `docs/construction/tabla-permisos-catalogo.md` (cadena D7: sesión→tenant→rol→pertenencia→validación→transacción→resultado tipado→revalidatePath). Guards: canEditApuCatalog (OWNER/SUPERADMIN/STAFF), canManageApuCatalogDestructive (OWNER/SUPERADMIN).

## e) Import CSV
Evidencia en `docs/construction/import-csv-evidencia.md`. Límites: MAX_FILE_SIZE 20MB, MAX_ITEMS_PER_IMPORT 50k, MAX_ACTIVITY_LINES_TOTAL 200k (apu-importer). Duplicados detectados por código (archivo y existentes). Vista previa antes de escribir (parser/validator + UI mapping). Política precios: upsert actualiza campos; revisión para "no sobrescribir precios en silencio" pendiente de definición estricta.

## f) Medición tiempos
Plantilla en `docs/construction/medicion-listactivities.md`. Implementación de caché p99 añadida. Mediciones reales a ejecutar en entorno con datos de prueba (punto 1 solicita reportar valores).

## g) Único catálogo
Solo en `app/[tenant]/(app)/quotes/page.tsx` (tabs activities/items). Componentes únicos en `_components/activity-catalog.tsx` e `items-bank.tsx`. Sin ruta `/quotes/catalog`. Sin copias.

## h) Migraciones/HEAD
Evidencia en `docs/construction/clon-limpio-head-evidencia.md`. Estructura: `migrations/app/` (16), `migrations/snapshots/` (21), `migration.sql` raíz. Migraciones aplicadas en clon limpio (Paso 0): 11 con markerHash `b100b157...`. Tablas public 28, CHECK constraints 20 — coinciden dev↔HEAD según Paso 0.
