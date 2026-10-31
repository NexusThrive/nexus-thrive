# Verificación 3: Mediciones reales

## Entorno: Dev (nexus), 2374 actividades, 19020 composiciones, 2170 insumos

listActivities(limit=50, page=1): 36.10ms (50 rows, total=2374)
listActivities(limit=200, page=1): 88.90ms (200 rows, total=2374)

getP99Thresholds (cold, invalidado): 919.81ms (14 unidades: UND,M3,M2,M,KG,GLB,L,Pto,Jg,KM,,m3-Km,MES,Gl/Mes,HA,DIA)
getP99Thresholds (hot, caché TTL 60s): 0.19ms (cached)
Cache speedup: 4931.9x

## Observaciones

- Costo calculado SOLO para filas visibles (paginación → activityIds → composiciones solo de esos IDs)
- p99 calculado UNA VEZ sobre TODO el catálogo (lee todas actividades + composiciones, agrupa por unidad)
- Caché TTL 60s, NO invalida en mutaciones (lazy loading: primera carga computa, subsiguientes usan caché)
- invalidateP99() manual disponible
