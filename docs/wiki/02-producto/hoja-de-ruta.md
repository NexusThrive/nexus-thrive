# Hoja de ruta

Estado: **vigente a 2026-10-31**, tras el cierre de V10 (la estructura de `lib/` está terminada). Lista lo que queda abierto; lo ya hecho está en el [historial](../../internal/historico/README.md) y en [`CHANGELOG.md`](../../../CHANGELOG.md). La lista viva de tareas operativas es [`docs/PENDIENTES.md`](../../PENDIENTES.md) (pendiente de revisión, ver [revisión](../../internal/revision-documentos-pendientes.md)).

> Fuente de los puntos 1–13: sección «Decisiones pendientes» del [cierre de V10](../../internal/historico/v10-y-etapas/V10-cierre-resultados.md). El punto 9 de esa lista (migrar las pruebas a `tests/`) ya se hizo.

## Arquitectura de `lib/`

| # | Tema | Qué se necesita | Estado |
|---|---|---|---|
| 1 | Deuda `inventory ⇄ sales` | Análisis propio: mover una dependencia, invertirla con un puerto o fusionar módulos. Hoy es la única excepción de dependencia, fijada por una prueba con las 4 dependencias exactas | Abierta |
| 2 | Dividir `lib/core/tenancy/db.ts` | Sigue grande (clientes, pagos, reservas, gastos, finanzas) | Abierta |
| 3 | Suscriptores de eventos | Su composición vive en la ruta del cron (`app/api/cron/webhooks/route.ts`); debe pasar a `lib/runtime` | Abierta |
| 4 | Verificador de capas en `app/` y `components/` | Hoy `check:layers` solo escanea `lib/` | Abierta |
| 5 | Herramientas de apoyo | Incorporar a `scripts/` el codemod de movimientos, el comparador de exportaciones y la captura del contrato público (15 operaciones + OpenAPI) como prueba de regresión | Decisión pendiente |
| 6 | M7: sectores | `sector.ts` de `gym`, `museum` y `construction`, `SectorView`, acceso de socios por módulo activo (D-V10-9) y permisos `members.*` | Requiere comprobación de solo lectura previa |
| 7 | M6c: auditoría unificada | Unificar los tres escritores de auditoría, solo si sus contratos coinciden | Condicionada |

## Datos

| # | Tema | Qué se necesita |
|---|---|---|
| 8 | Prisma P3–P6 | Relaciones Business → Industry, modelos sin `tenantId`, cambios de datos, RLS real |
| 9 | Comentarios de `prisma/schema/**` con rutas anteriores a V10 | Exige tocar el contrato; pasada independiente |
| 10 | Asientos históricos fechados en UTC | Ejecutar el SQL de diagnóstico (`docs/diagnostico/`) contra una **copia** y decidir si se corrigen |
| 10b | Recibo del punto de venta en UTC | `receiptOf` (`lib/business/pos/pos-db.ts`) imprime fecha y hora en UTC; definir el formato horario esperado (Bogotá) y probarlo antes de tocarlo. **Pendiente**, va en la lista de implementación de producto |

## Seguridad

| # | Tema | Qué se necesita |
|---|---|---|
| 11 | Aislamiento por negocio | La prueba actual (`tenant-scope`) solo ve consultas literales y excluye ocho carpetas del panel; auditar esas carpetas y las guardas de `app/admin` |

## Documentación

| # | Tema | Qué se necesita |
|---|---|---|
| 12 | Revisar los 13 documentos pendientes | Decidir uno por uno (ver [revisión](../../internal/revision-documentos-pendientes.md)) |
| 13 | Reescribir `user-journey` y la tabla de permisos de construcción contra el código | Hoy son históricos o no válidos |
| 14 | Sincronizar la Wiki de GitHub tras cada cambio de `docs/wiki/` | **Publicada el 1 nov 2026.** Falta volver a sincronizar cuando cambie la documentación ([mantener la wiki](../09-desarrollo/mantener-la-wiki.md)) |

## Entrega

| # | Tema | Qué se necesita |
|---|---|---|
| 15 | Pila de PR de V10 | **Hecho:** 8 PR (#128–#135) fusionados en `main` el 1 nov 2026 ([lanzamiento](../../internal/lanzamiento/README.md)) |
| 16 | Integración de `integracion/local-revision` (P-13) | Revisión propia |
