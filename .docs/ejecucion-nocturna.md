# Seguimiento de la ejecución autónoma (24 de octubre de 2026)

Estado real de los PR de esta sesión (#75 a #105). Cada uno es una rama apilada sobre la anterior; ninguno está fusionado ni desplegado. **No se publicó V2.**

| PR | Objetivo | Estado | Verificaciones | Pendientes |
|---|---|---|---|---|
| #75 | Un solo sistema: funciones, rubro como sugerencia | listo para revisión | tsc, vitest, e2e | Etapas C–E de la auditoría |
| #76 | Perfil «general» y modelo comercial | listo para revisión | tsc, vitest, e2e | — |
| #77 | PR-11b traslados, conteos, reposición | listo para revisión | vitest 1275, e2e 18 (escritorio+móvil) | probar con app real |
| #78 | PR-12 importar/exportar clientes y catálogo | listo para revisión | 33 pruebas nuevas, e2e 8 | `.xlsx` real de usuarios |
| #79 | PR-13 impuestos con vigencia y numeración | listo para revisión | 17 pruebas nuevas (6 con Postgres), e2e 10 | Beneficiario, Tipo de comprobante, VII.04 N2; elegir retenciones en pantallas de venta |
| #80 | Configuración: perfil en lectura con edición bajo demanda | listo para revisión | e2e 10 | Aplicar el patrón a Módulos, Equipo, Plan |
| #82 | PR-14 cartera (cuentas por cobrar/pagar) | listo para revisión | pruebas con Postgres, e2e | pagos a proveedor no mueven caja |
| #83 | Fix hidratación de `UserButton` (pila UI) | listo para revisión | e2e | probar en Safari |
| #84 | Etapa C: varias organizaciones por usuario | listo para revisión | pruebas con Postgres, e2e | sin límite de organizaciones por cuenta; sin probar con Clerk real |
| #85 | Etapa D: sin candado de rubro, buscador con funciones apagadas | listo para revisión | vitest, e2e | — |
| #86 | Etapa E: consumo y límites en Plan | listo para revisión | vitest, e2e | límites informativos, sin cobro automático |
| #87 | Quitar la pestaña Módulos de Configuración | listo para revisión | e2e | — |
| #88 | PR-15 POS I: terminales, turnos, venta multilínea | listo para revisión | Postgres, e2e | — |
| #89 | PR-16 POS II, notas crédito/débito, visor a pantalla completa | listo para revisión | Postgres, e2e + axe | sin PDF/XML ni envío DIAN |
| #90 | Sidebar con scroll y grupos Ingresos/Gastos | listo para revisión | e2e | — |
| #91 | Panel de control: consumo en la ficha del negocio | listo para revisión | vitest | resto del Operations Center sin actualizar |
| #92 | PR-17 cobros en línea y conciliación | listo para revisión | Postgres, e2e | pasarelas reales no probadas |
| #93 | PR-18 factura electrónica (puerto + proveedor de prueba) | listo para revisión | Postgres | VII.04: factura real, PDF/XML, estado DIAN |
| #94 | PR-19 Wompi | listo para revisión | pruebas de firma y contrato | **no probado contra Wompi real** |
| #95 | PR-20 proveedor HTTP genérico DIAN | listo para revisión | pruebas con servidor simulado | **no probado contra un proveedor real** |
| #96 | PR-21 contabilidad I (PUC, reglas, centros, períodos) | listo para revisión | Postgres, e2e + axe | plantilla PUC y reglas de ejemplo: confirmar con un contador |
| #97 | PR-22 asientos y libro inalterable | listo para revisión | Postgres | inalterable = evidente ante alteración (hash), sin bloqueo en base de datos |
| #98 | PR-23 estados financieros y CSV para el contador | listo para revisión | Postgres, e2e | terceros y centros de costo en cada asiento |
| #99 | PR-24 presencia v2: pilares, tendencia, evento, `presence.get` | listo para revisión | Postgres, e2e | — |
| #100 | PR-25 mini-sitio `/s/<slug>` | listo para revisión | Postgres, e2e | plantillas por vertical, imágenes, subdominio (sin probar con DNS) |
| #101 | PR-26 tienda en línea | listo para revisión | Postgres, e2e | catálogo con fotos, pedido por correo/WhatsApp, Nequi/checkout alojado |
| #102 | PR-27 SEO local y ficha de Google | listo para revisión | Postgres con Google simulado, e2e | **no probado contra Google real**; casilla «Ficha de Google Business» sin marcar |
| #103 | PR-28 reputación y atribución | listo para revisión | Postgres, e2e + axe | solo promedio de Google, atribución de primer toque |
| #104 | PR-29 madurez NEXUS (fase B) | listo para revisión | reglas, Postgres, e2e | metas por dimensión sin calibrar |
| #105 | PR-30 cambio de fase y reporte semanal | listo para revisión | reglas, Postgres | sin envío real por WhatsApp/correo (VI.08) |

## Migraciones (en orden, ver `docs/prod-sql/00-ORDEN.md`)
Filas 23 a 36: 23 perfil general, 24 traslados/conteos, 25 impuestos y numeración, 26 cartera, 27 POS terminales, 28 cobros en línea, 29 factura electrónica, 30 contabilidad (plan), 31 asientos, 32 presencia v2, 33 mini-sitio, 34 tienda, 35 Google Business, 36 reputación y atribución. Todas aditivas. SQL **antes** que el código. No se corrió nada contra producción; la base de desarrollo `nexus` del usuario recibió 23 y 24 (con respaldo).

## Decisiones
- Importación: por fila, idempotente (SKU/nombre; documento/correo), lo vacío no borra, existencias no se importan.
- Numeración: opt-in por tipo de documento; con resolución se bloquea al agotarse/vencer; sin resolución consecutivo interno.
- Retenciones: se guardan en el documento (no cambian `total`).

## Riesgos conocidos
- `tsc` necesita `NODE_OPTIONS=--max-old-space-size=8192` (el contrato supera 4 GB).
- Nada probado con Clerk + base real ni en dispositivos físicos.
- Contabilización automática (`accountingEnabled`) y factura electrónica (`einvoiceEnabled`) son opt-in.
- Wompi, DIAN, Google Places, Nequi y pasarelas reales **no se probaron**: solo contratos y algoritmos.
- Pantallas probadas con Storybook (acciones simuladas) y la lógica con Postgres local; nada con Clerk + base real ni en Safari.
- El `Alert` de éxito tiene bajo contraste de texto; se evitó en informes contables.

## Próximo paso exacto
Revisar los PR en orden (dos pilas: UI #58–#62 → #83 → #84 → #85 → #90; datos/negocio hasta #105), aplicar el SQL de `docs/prod-sql/00-ORDEN.md` en orden **antes** del código, y calibrar con un contador y negocios piloto lo marcado como «no probado».
