> **INVÁLIDO — no usar como evidencia.** Este documento fue invalidado el 2026-10-14: afirma comportamientos o funciones que no existen en el código (ver docs/construction/estado-real-etapa3.md). Lo único válido es lo que allí se lista.

# Evidencias Etapa 3 - Puntos a-h (inicio)

## a) ¿Qué son los ítems 2.5 y 2.6?

- **2.5**: Función pura `apuItemCategoryToResourceType` en `lib/apu-engine.ts` que mapea `ApuItemCategory` → `ResourceType` (MATERIAL→MATERIAL, MANO_DE_OBRA→LABOR, EQUIPO→EQUIPMENT, TRANSPORTE→TRANSPORT). Añadida prueba unitaria en `lib/apu-engine.test.ts`. Única fuente de mapeo categoría→tipo de recurso.
- **2.6**: `getCatalogHealthReport()` en `lib/tenant-db.ts` (módulo `apu`) + acción `getCatalogHealthReportAction` en `app/[tenant]/(app)/quotes/actions.ts`. Solo lectura: actividades sin composición, actividades con costo unitario 0, insumos sin uso, antigüedad de precios (días), `apuImporterStatus`, `apuUnitsConfigured`. Sin modificar datos.

## b) Umbral de atípicos (cálculo UNA VEZ sobre todo el catálogo)

- Implementado en `lib/tenant-db.ts` → `apu.getP99Thresholds()`.
- **Global, no por página**: carga TODAS las actividades (`allActivities`) del tenant y TODAS las composiciones (`activityComps`) del tenant en una sola operación; agrupa por unidad.
- Actividades: por `activity.unit`, calcula `activityUnitCost` con engine único (`lib/apu-engine.activityUnitCost`) para cada actividad; p99 si ≥2 valores, valor único si =1. Resultado `activityUnitCost[unit]`.
- Composición: por `comp.item.unit`, toma `consumption` de cada línea de composición; p99 si ≥2, valor único si =1. Resultado `itemConsumption[unit]`.
- NO usa `limit/offset`; no depende de página. Uso en `ActivityCatalog` (badges "Revisar") — valores globales por unidad.

## c) Prueba de no borrar insumo/actividad en uso (ApuItem cascadea hacia composiciones)

- `lib/tenant-db.ts` (`apu.deleteItem`): cuenta composiciones con `itemId` → si `count > 0` devuelve/lanza error `APU_IN_USE`. No elimina.
- `lib/tenant-db.ts` (`apu.deleteActivity`): cuenta `QuoteItem` con `activityId` → si `count > 0` devuelve/lanza error `APU_IN_USE`. No elimina.
- Acciones server `deleteItemAction`, `deleteActivityAction` mapean a `ApuMutationState` con error `APU_IN_USE`.
- Cubierto por tests integración (`lib/tenant-db.integration.test.ts`) — casos de borrado seguro vs en uso.

## d) Tabla de permisos de acciones del catálogo

Ver archivo: `docs/construction/tabla-permisos-catalogo.md` (generado junto)

## e) Importación CSV — límites, duplicados, vista previa, no sobrescribir precios en silencio

Ver archivo: `docs/construction/import-csv-evidencia.md` (generado junto). Se reporta estado del `apu-importer` avanzado (`be1d010`) y CSV simple en `ItemsBank`.

## f) Medición tiempo listActivities (50 y 200 filas)

Ver archivo: `docs/construction/medicion-listactivities.md` (generado junto)

## g) Único catálogo (ruta real), sin copias de ActivityCatalog/ItemsBank

- Ruta única: `app/[tenant]/(app)/quotes/page.tsx` renderiza `QuotesWorkspace` con tabs `quotes|activities|items`. Dentro renderiza `ItemsBank` y `ActivityCatalog` (desde `app/[tenant]/(app)/quotes/_components/`).
- Componentes únicos: `ActivityCatalog.tsx` y `ItemsBank.tsx` existen **únicamente** en `app/[tenant]/(app)/quotes/_components/`.
- No existe ruta `/quotes/catalog` separada. No hay copias fuera de ese directorio.

## h) Clon limpio en HEAD — migraciones y coincidencia con dev

Ver archivo: `docs/construction/clon-limpio-head-evidencia.md` (generado junto)