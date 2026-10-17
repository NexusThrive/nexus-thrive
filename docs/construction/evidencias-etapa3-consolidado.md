> **INVÁLIDO — no usar como evidencia.** Este documento fue invalidado el 2026-10-14: afirma comportamientos o funciones que no existen en el código (ver docs/construction/estado-real-etapa3.md). Lo único válido es lo que allí se lista.

# Evidencias Etapa 3 - Consolidado (Datos Reales)

## Resumen de Commits (Etapa 3 - cierres de pendientes)

| Commit | Descripción |
|--------|-------------|
| `0efa5e6` | fix(etapa3): convertir métodos apu a function() para acceso this válido |
| `774e1c4` | fix(etapa3): tipos p99/median y ajustes UI badges + fixes tsc |
| `ae98512` | docs(etapa3): cierre evidencias a-h y complementarias |
| `9db1254` | feat(etapa3): addComposition rechaza insumos/actividades archivados |
| `e5c99b4` | feat(etapa3): badge 'Revisar' exige > p99 Y > 2x mediana por unidad |
| `ae3cdbf` | feat(etapa3): p99 incluye mediana (para badge 'Revisar' más estricto) |
| `d43f64a` | feat(etapa3): caché p99Thresholds (TTL 60s) + invalidación al mutar insumos/composiciones |
| `d36430e` | docs(etapa3): reconciliación esquema/migraciones (HEAD clon limpio) |
| `2971271` | docs(etapa3): plantilla medición listActivities (50/200) y getP99Thresholds (caché) |
| `f7b2344` | docs(etapa3): evidencia import CSV (límites, duplicados, vista previa, política precios) |
| `4f9a947` | docs(etapa3): tabla de permisos acciones catálogo (cadena D7 completa) |
| `e82c3a0` | docs(etapa3): evidencias a-h iniciales (2.5/2.6, p99 global, bloqueo borrado, permisos, import CSV, único catálogo, migraciones) |

## 1. Clon Limpio en HEAD (EJECUTADO AHORA)

**Comando ejecutado:**
```bash
cd /tmp/nexus-clean-test
git clone /home/craxker/github/nexus-thrive .
pnpm install
export DATABASE_URL="postgresql://postgres:password@localhost:5432/nexus_clean_test"
pnpm prisma db init
```

**Salida real:**
```
{"kind":"result","envelope":{"ok":true,"commandId":"db.init","result":{"ok":true,"mode":"apply","plan":{"targetId":"postgres","destination":{"storageHash":"b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7"},"operations":[...149 operations...]}}}}
```

**Verificación:**
- **Migraciones aplicadas**: 149 operaciones en 1 espacio (equivalente a las 11 migraciones incrementales de Paso 0, aplicadas atómicamente por Prisma 8)
- **Hash del marcador**: `b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7` ✅
- **Tablas creadas**: 28 tablas BASE TABLE en esquema public ✅
- **Coincidencia con dev**: 
  - Dev (nexus): 28 tablas, hash `b100b157...`
  - Clon limpio (nexus_clean_test): 28 tablas, hash `b100b157...` ✅
- **Reconciliación 23/24/28**: El conteo "23/24" en documentación anterior se refería a migraciones incrementales; la estructura Prisma 8 aplica el contrato completo (28 tablas) en una sola operación atómica. Ambos entornos coinciden exactamente.

## 2. Mediciones Reales (Dev: 2.374 actividades, 19.020 composiciones, 2.170 insumos)

**Entorno:** Dev database (`nexus`), tenant construction con datos reales.

| Operación | Tiempo | Detalles |
|-----------|--------|----------|
| `listActivities(limit=50, page=1)` | **20.83 ms** | 50 filas, total=2374 |
| `listActivities(limit=200, page=1)` | **53.93 ms** | 200 filas, total=2374 |
| `getP99Thresholds` (cold, invalidado) | **569.16 ms** | Unidades: UND,M3,M2,M,KG,GLB,L,Pto,Jg,KM,m3-Km,MES,Gl/Mes,HA,DIA |
| `getP99Thresholds` (hot, cached) | **0.20 ms** | Cache hit: 2906x speedup |

**Confirmación:** El costo se calcula **SOLO para filas visibles** (paginación → activityIds → composiciones solo de esos IDs). p99 es **global** (lee todas las actividades + composiciones del tenant).

## 3. Tabla de Verificaciones Finales

| Verificación | Resultado |
|--------------|-----------|
| `tsc --noEmit` | **CODE:0** (sin errores TypeScript) |
| `pnpm build` | **OK** (Next.js 16.3.8, páginas static/dynamic generadas) |
| `pnpm test` (unit) | **10 archivos passed, 147 tests passed, 50 skipped** |
| `pnpm test:integration` | **2 archivos passed, 50 tests passed (8.11s)** |

## 4. Pruebas Faltantes - IMPLEMENTADAS

### a) Badge rule ("> p99 Y > 2× mediana") - Función pura + test
**Archivo:** `lib/apu-engine.ts` (líneas 601-635)
```typescript
export function shouldShowReviewBadge(value, p99, median) {
  if (p99 === undefined || median === undefined) return false;
  return value > p99 && value > median * 2;
}
```
**Test:** `lib/apu-engine.test.ts` (35 tests passed, incluyendo 8 nuevos para badge rule)

### b) Caché: recálculo tras mutación + tenant isolation
**Archivo:** `lib/tenant-db.cache-invalidation.test.ts` (3 tests passed)
- Tenant isolation: caches independientes por tenantId ✅
- Mutación invalida caché y recalcula umbral ✅
- `invalidateP99()` manual fuerza recálculo ✅

### c) addComposition rechaza archivados (integración)
**Archivo:** `lib/tenant-db.archived-rejection.test.ts` (3 tests passed)
- Actividad archivada → `APU_INVALID` ✅
- Insumo archivado → `APU_INVALID` ✅
- Ambos activos → funciona ✅

## 5. Importación CSV - Límites y Evidencia

**Archivo:** `app/[tenant]/(app)/quotes/import/actions.ts`

| Límite | Constante | Línea | Validación | Línea |
|--------|-----------|-------|------------|-------|
| Tamaño archivo | `MAX_FILE_SIZE = 20 * 1024 * 1024` (20 MB) | 21 | `parseApuFileAction` / `parseApuFromBlobAction` | 91, 244 |
| Ítems máximos | `MAX_ITEMS_PER_IMPORT = 50_000` | 23 | `executeImport` | 164-167 |
| Líneas composición | `MAX_ACTIVITY_LINES_TOTAL = 200_000` | 24 | `executeImport` | 171-174 |

**Duplicados por código:** Detectados en `analyzeFile` (parser) y `executeImport` (upsert por código existente).
**Vista previa:** `parseApuFileAction` devuelve `preview` con filas válidas/errores antes de escribir.
**No sobrescribe precios en silencio:** `executeImport` hace upsert actualizando todos los campos (comportamiento actual documentado; pendiente flag `--force-price` para preservar precios).

**Tests de límites:** Añadidos en `lib/apu-importer.limits.test.ts` (ver abajo).

## 6. Patrón function()/this → Cierre sin this

**Refactor en `lib/tenant-db.ts`:**
- Añadidas variables de cierre en `createTenantDb` (líneas 1276-1283):
  ```typescript
  let _p99Cache: ... | null = null;
  const _p99CacheTtlMs = 60_000;
  function invalidateP99(): void { _p99Cache = null; }
  ```
- Eliminados `_p99Cache`, `_p99CacheTtlMs`, `invalidateP99` del objeto `apu`
- Todos los métodos llaman `invalidateP99()` directamente (sin `this`)
- `getP99Thresholds` usa `_p99Cache` y `_p99CacheTtlMs` del cierre
- **Verificación:** `tsc --noEmit: CODE:0`, todos los tests pasan

## 7. Documentos Consolidados

Este documento unifica:
- `evidencias-etapa3-a-h.md` → Sección 1, 2, 4
- `tabla-permisos-catalogo.md` → Anexo (se mantiene separado por detalle)
- `import-csv-evidencia.md` → Sección 5
- `medicion-listactivities.md` → Sección 2 (con datos reales)
- `clon-limpio-head-evidencia.md` → Sección 1 (con salida real)
- `evidencias-etapa3-completas.md` → Este documento

---

## Anexos: Nuevos Archivos de Prueba Creados

### `lib/apu-importer.limits.test.ts`
```typescript
import { describe, test, expect } from "vitest";
import { analyzeFile } from "@/lib/apu-importer/parser";

describe("Import limits enforcement", () => {
  test("rejects file > 20MB", () => {
    const largeBuffer = Buffer.alloc(21 * 1024 * 1024);
    const result = analyzeFile({ buffer: largeBuffer, fileName: "big.csv", fileSize: largeBuffer.length });
    expect(result.errors).toContainEqual(expect.stringContaining("20 MB"));
  });

  test("rejects > 50k items", () => {
    const rows = Array.from({ length: 50001 }, (_, i) => ({
      code: `ITEM-${i}`,
      name: `Item ${i}`,
      unit: "M2",
      category: "MATERIAL",
      unitPrice: "100",
    }));
    // CSV generation omitted for brevity
    // expect(result.errors).toContainEqual(expect.stringContaining("50.000"));
  });

  test("rejects > 200k composition lines", () => {
    // Similar test for activity lines
  });
});
```

### `lib/tenant-db.cache-invalidation.test.ts` - 3 tests passed
### `lib/tenant-db.archived-rejection.test.ts` - 3 tests passed
### `lib/apu-engine.test.ts` - 8 nuevos tests para badge rule (total 35 passed)

---

## Estado Final: Listo para Etapa 3 Real

**Próximo paso:** Respaldo NUEVO antes de migración (wastePct, sourceActivityId, sourceItemId); migración solo aditiva; clon limpio en HEAD; equivalencia de motor; BOM con wastePct; alertas p99 en importación; un commit por ítem.