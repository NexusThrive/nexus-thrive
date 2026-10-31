# Medición de tiempo — listActivities (50 y 200 filas) + getP99Thresholds (con/sin caché)

## Metodología
Mediciones locales contra DB test. Se hará medición con datos sintéticos: crear tenant, N actividades con composiciones para alcanzar páginas de 50 y 200 filas. Tomar tiempos (ms) con warmup. Reportar valores reales.

Nota: implementación de caché para getP99Thresholds (punto 1) se añade como primer commit de código en Etapa 3 (no aquí). Este archivo registra plantilla y resultado una vez ejecutado.

## Plantilla de resultados

| Operación | Tiempo (ms) | Observaciones |
|---|---|---|
| listActivities — página 1, limit=50 | TBD | Costo por página: solo filas visibles; composiciones cargadas por activityIds |
| listActivities — página 1, limit=200 | TBD | Misma lógica, mayor lote |
| getP99Thresholds — sin caché (primera ejecución) | TBD | Calcula sobre todo el catálogo (global) |
| getP99Thresholds — con caché (hit) | TBD | Invalidation: mutar insumo o composición |

**Verificación**: p99 global (no por página) — confirmado en código (`apu.getP99Thresholds` lee todas actividades+composiciones).
