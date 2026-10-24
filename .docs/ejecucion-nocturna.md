# Seguimiento de la ejecución autónoma (24 de octubre de 2026)

Estado real de los PR de esta sesión. Cada uno es una rama apilada sobre la anterior; ninguno está fusionado ni desplegado. **No se publicó V2.**

| PR | Objetivo | Estado | Verificaciones | Pendientes |
|---|---|---|---|---|
| #75 | Un solo sistema: funciones, rubro como sugerencia | listo para revisión | tsc, vitest, e2e | Etapas C–E de la auditoría |
| #76 | Perfil «general» y modelo comercial | listo para revisión | tsc, vitest, e2e | — |
| #77 | PR-11b traslados, conteos, reposición | listo para revisión | vitest 1275, e2e 18 (escritorio+móvil) | probar con app real |
| #78 | PR-12 importar/exportar clientes y catálogo | listo para revisión | 33 pruebas nuevas, e2e 8 | `.xlsx` real de usuarios |
| #79 | PR-13 impuestos con vigencia y numeración | listo para revisión | 17 pruebas nuevas (6 con Postgres), e2e 10 | Beneficiario, Tipo de comprobante, VII.04 N2; elegir retenciones en pantallas de venta |
| (este) | Configuración: perfil en lectura con edición bajo demanda | listo para revisión | e2e 10 | Aplicar el patrón a Módulos, Equipo, Plan |

## Migraciones (en orden, ver `docs/prod-sql/00-ORDEN.md`)
Filas 23 (perfil general), 24 (traslados/conteos), 25 (impuestos y numeración). Todas aditivas. SQL **antes** que el código. No se corrió nada contra producción; la base de desarrollo `nexus` del usuario recibió 23 y 24 (con respaldo).

## Decisiones
- Importación: por fila, idempotente (SKU/nombre; documento/correo), lo vacío no borra, existencias no se importan.
- Numeración: opt-in por tipo de documento; con resolución se bloquea al agotarse/vencer; sin resolución consecutivo interno.
- Retenciones: se guardan en el documento (no cambian `total`).

## Riesgos conocidos
- `tsc` necesita `NODE_OPTIONS=--max-old-space-size=8192` (el contrato supera 4 GB).
- Nada probado con Clerk + base real ni en dispositivos físicos.
- PR-14 en adelante (cartera, POS, pagos, facturación electrónica, contabilidad, tienda…) **no iniciados**.

## Próximo paso exacto
PR-14 «Cartera: cuentas por cobrar y por pagar» (rama `cobro/cartera`, base `plataforma/configuracion-lectura-y-edicion`).
