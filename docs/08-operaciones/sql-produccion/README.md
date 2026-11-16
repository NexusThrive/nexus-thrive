# SQL de producción

## Responsabilidad y ejecución

Este directorio conserva los SQL de producción sin cambiar sus sentencias ni sus nombres. **El orden alfabético o por fecha de este índice no es un orden de ejecución.** Las migraciones del esquema se gestionan en migrations/; su fuente y comprobaciones están en [Prisma](../../02-arquitectura/modelo-de-datos/prisma-estructura.md).

`scripts/migrate-prod.sh` aplica migraciones y después solo los tres scripts de datos listados en `scripts/prod-data.txt`, en el orden explícito de ese manifiesto. Este cambio no ejecuta ninguno. No aplicar todos los SQL de esta carpeta sobre una base existente.

## Datos posteriores a las migraciones

1. [2026-10-24-tercero-unico-relleno.sql](2026-10-24-tercero-unico-relleno.sql).
2. [2026-10-24-inventario-relleno.sql](2026-10-24-inventario-relleno.sql).
3. [2026-10-25-funciones-hijas.sql](2026-10-25-funciones-hijas.sql).

## Inventario cronológico para revisión

Los demás archivos son entregables SQL conservados para revisión y trazabilidad, no una cola implícita de ejecución. La fecha no confirma que hayan sido aplicados en un entorno.

- [2026-10-17-ops-center-a.sql](2026-10-17-ops-center-a.sql).
- [2026-10-17-ops-center-b.sql](2026-10-17-ops-center-b.sql).
- [2026-10-17-ops-center-c.sql](2026-10-17-ops-center-c.sql).
- [2026-10-17-ops-center-completo.sql](2026-10-17-ops-center-completo.sql).
- [2026-10-17-ops-center-d.sql](2026-10-17-ops-center-d.sql).
- [2026-10-17-ops-center-e.sql](2026-10-17-ops-center-e.sql).
- [2026-10-19-beneficios.sql](2026-10-19-beneficios.sql).
- [2026-10-19-v1-negocio-completo.sql](2026-10-19-v1-negocio-completo.sql).
- [2026-10-20-admin-santiago.sql](2026-10-20-admin-santiago.sql).
- [2026-10-20-asistencia-intentos.sql](2026-10-20-asistencia-intentos.sql).
- [2026-10-21-alta-en-panel.sql](2026-10-21-alta-en-panel.sql).
- [2026-10-21-invitaciones-equipo.sql](2026-10-21-invitaciones-equipo.sql).
- [2026-10-21-reinicio-de-datos.sql](2026-10-21-reinicio-de-datos.sql).
- [2026-10-23-codigos-a-medida.sql](2026-10-23-codigos-a-medida.sql).
- [2026-10-23-documento-comercial.sql](2026-10-23-documento-comercial.sql).
- [2026-10-23-registro-de-capacidades.sql](2026-10-23-registro-de-capacidades.sql).
- [2026-10-23-restricciones-negocio-y-rls.sql](2026-10-23-restricciones-negocio-y-rls.sql).
- [2026-10-24-api-llaves.sql](2026-10-24-api-llaves.sql).
- [2026-10-24-cartera.sql](2026-10-24-cartera.sql).
- [2026-10-24-catalogo-maestro.sql](2026-10-24-catalogo-maestro.sql).
- [2026-10-24-compras-y-proveedores.sql](2026-10-24-compras-y-proveedores.sql).
- [2026-10-24-conexiones-externas.sql](2026-10-24-conexiones-externas.sql).
- [2026-10-24-contabilidad-asientos.sql](2026-10-24-contabilidad-asientos.sql).
- [2026-10-24-contabilidad-plan-y-periodos.sql](2026-10-24-contabilidad-plan-y-periodos.sql).
- [2026-10-24-existencias-llave-unica.sql](2026-10-24-existencias-llave-unica.sql).
- [2026-10-24-facturacion-electronica.sql](2026-10-24-facturacion-electronica.sql).
- [2026-10-24-google-business.sql](2026-10-24-google-business.sql).
- [2026-10-24-impuestos-y-numeracion.sql](2026-10-24-impuestos-y-numeracion.sql).
- [2026-10-24-inventario-bodegas-kardex.sql](2026-10-24-inventario-bodegas-kardex.sql).
- [2026-10-24-inventario-relleno.sql](2026-10-24-inventario-relleno.sql).
- [2026-10-24-limite-de-negocios.sql](2026-10-24-limite-de-negocios.sql).
- [2026-10-24-mini-sitio.sql](2026-10-24-mini-sitio.sql).
- [2026-10-24-pagos-cobros-en-linea.sql](2026-10-24-pagos-cobros-en-linea.sql).
- [2026-10-24-perfil-general.sql](2026-10-24-perfil-general.sql).
- [2026-10-24-pos-terminales.sql](2026-10-24-pos-terminales.sql).
- [2026-10-24-presencia-v2.sql](2026-10-24-presencia-v2.sql).
- [2026-10-24-reputacion-y-atribucion.sql](2026-10-24-reputacion-y-atribucion.sql).
- [2026-10-24-tercero-unico-relleno.sql](2026-10-24-tercero-unico-relleno.sql).
- [2026-10-24-tercero-unico.sql](2026-10-24-tercero-unico.sql).
- [2026-10-24-tienda-en-linea.sql](2026-10-24-tienda-en-linea.sql).
- [2026-10-24-traslados-conteos-reposicion.sql](2026-10-24-traslados-conteos-reposicion.sql).
- [2026-10-24-uso-y-origen.sql](2026-10-24-uso-y-origen.sql).
- [2026-10-24-webhooks-outbox.sql](2026-10-24-webhooks-outbox.sql).
- [2026-10-25-funciones-hijas.sql](2026-10-25-funciones-hijas.sql).
- [2026-11-04-registro-publico-gimnasio.sql](2026-11-04-registro-publico-gimnasio.sql).
- [2026-11-06-obligaciones.sql](2026-11-06-obligaciones.sql).
- [2026-11-07-aplicacion-de-pagos.sql](2026-11-07-aplicacion-de-pagos.sql).
- [2026-11-07-conciliacion-bancaria.sql](2026-11-07-conciliacion-bancaria.sql).
- [2026-11-07-contacto-unico.sql](2026-11-07-contacto-unico.sql).
- [2026-11-07-cotizaciones-comerciales.sql](2026-11-07-cotizaciones-comerciales.sql).
- [2026-11-07-crm-pipeline.sql](2026-11-07-crm-pipeline.sql).
- [2026-11-07-cumplimiento-de-pedidos.sql](2026-11-07-cumplimiento-de-pedidos.sql).
- [2026-11-07-entregables.sql](2026-11-07-entregables.sql).
- [2026-11-07-entregas.sql](2026-11-07-entregas.sql).
- [2026-11-07-formularios-de-captura.sql](2026-11-07-formularios-de-captura.sql).
- [2026-11-07-intentos-de-pago.sql](2026-11-07-intentos-de-pago.sql).
- [2026-11-07-liquidaciones.sql](2026-11-07-liquidaciones.sql).
- [2026-11-07-oportunidades.sql](2026-11-07-oportunidades.sql).
- [2026-11-07-ordenes-de-produccion.sql](2026-11-07-ordenes-de-produccion.sql).
- [2026-11-07-plantillas-y-avisos.sql](2026-11-07-plantillas-y-avisos.sql).
- [2026-11-07-tareas-de-proyecto.sql](2026-11-07-tareas-de-proyecto.sql).
- [2026-11-07-tareas.sql](2026-11-07-tareas.sql).
- [2026-11-07-tercero-region-y-responsabilidad.sql](2026-11-07-tercero-region-y-responsabilidad.sql).
- [2026-11-07-tesoreria.sql](2026-11-07-tesoreria.sql).
- [2026-11-07-verificacion-de-transferencias.sql](2026-11-07-verificacion-de-transferencias.sql).
- [2026-11-07-whatsapp-por-negocio.sql](2026-11-07-whatsapp-por-negocio.sql).
- [2026-11-08-catalogo-categorias-atributos-y-canales.sql](2026-11-08-catalogo-categorias-atributos-y-canales.sql).
- [2026-11-08-contacto-en-terceros.sql](2026-11-08-contacto-en-terceros.sql).
- [2026-11-08-grupos-de-clientes-y-busquedas-guardadas.sql](2026-11-08-grupos-de-clientes-y-busquedas-guardadas.sql).
- [2026-11-08-listas-de-precio-por-cantidad-y-cliente.sql](2026-11-08-listas-de-precio-por-cantidad-y-cliente.sql).
- [2026-11-08-medios-de-pago-del-negocio.sql](2026-11-08-medios-de-pago-del-negocio.sql).
- [2026-11-08-pedidos-por-canal.sql](2026-11-08-pedidos-por-canal.sql).

## Referencias

[Automatización y respaldo](../prod-sql-automatizacion.md). El [registro histórico del orden anterior](../../09-historico/orden-sql-2026-10.md) conserva el contexto de recuperación de octubre; no sustituye al manifiesto actual.
