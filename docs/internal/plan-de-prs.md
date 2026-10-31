# Plan de PR de la rama `chore/HU-esquema-prisma-modular-01`

Estado a 2026-10-31. La rama de trabajo tiene **101 commits y más de 1 200 archivos** sobre `main` (`97eb497`, sin avances: 0 detrás). Un solo PR sería irrevisable, así que se parte en una **pila de 8 PR** (los 7 tramos del plan inicial más el arreglo de fechas, ahora separado). Cada PR cuelga del anterior. **Ninguna rama se ha subido y no hay PR abiertos.**

> Las ramas de la pila son `stack/NN-…`. Se reconstruyeron con `git cherry-pick` a partir de la rama de trabajo (que no se tocó). Las ramas `pr/01…07` de la primera versión del plan quedan **obsoletas**: no las uses.

## Pila

| PR | Rama | Base | Commits | Archivos | Qué contiene |
|---|---|---|---|---|---|
| 1 | `stack/01-prisma-capas-e1` | `main` | 14 | 143 | Contrato Prisma dividido por dominio (sin cambiar tablas), reglas de capas (E0), guardián de SQL de producción, primeros movimientos (E1), integración por patrón, `pnpm verify` honesto |
| 2 | `stack/02-fechas-bogota` | PR 1 | 2 | 8 | **Cambio funcional independiente**: la fecha de un documento es el día de Bogotá, no el día UTC. Con su prueba, el SQL de diagnóstico de solo lectura y el hallazgo documentado |
| 3 | `stack/03-reubicaciones-e2-e9` | PR 2 | 26 | 331 | E2 (permisos y equipo a Core, gimnasio y museo a `industry`), E3 (operaciones por dominio, eventos), E5 (puertos entre dominios), E7 (puertos de integraciones), E9 y V (rubros por receta) |
| 4 | `stack/04-v10-m0-m2` | PR 3 | 6 | 127 | V10 M0–M2: verificador por áreas, raíz de composición en `lib/runtime`, sectores en Core |
| 5 | `stack/05-v10-m3-m4` | PR 4 | 26 | 298 | V10 M3 (business por módulos) y M4 (platform por módulos, fin de `lib/ops`) |
| 6 | `stack/06-v10-m5-cierre` | PR 5 | 17 | 771 | V10 M5 (finance a `domains/finance`) y cierre por etapas (I, B, N, X, C, F, Z): `lib/` queda en nueve áreas. **Sin cambios visuales** |
| 7 | `stack/07-favicon-y-tests` | PR 6 | 3 | 173 | Favicon solo SVG (incluye ahora el cambio de `app/icon.svg`) y las 150 pruebas de `lib/` a `tests/` |
| 8 | `stack/08-wiki` | PR 7 | 8 | 330 | Documentación unificada (`docs/wiki`, `docs/decisions`, `docs/internal`), sincronización simulada con la Wiki de GitHub y los informes de entrega |

### Dónde quedó el cambio de fechas

En el **PR 2**, justo después del PR 1 y antes de cualquier reorganización. Son 2 commits y 8 archivos: 3 de código (`documents-db.ts`, `invoices-db.ts`, `plain-date.ts`), 3 pruebas y 2 documentos (hallazgo y SQL de diagnóstico). Lo revisas sin leer ningún movimiento de `lib/`. Ver [informe del cambio de fechas](informe-cambio-fechas-pr2.md). **No está completamente validado**: se desconoce cuántos documentos reales afecta.

## Verificación de cada PR en su propio estado

Cada rama se verificó en un árbol de trabajo aislado con una base PostgreSQL desechable: `pnpm verify` completo (lint, tipos, `check:layers`, unitarias sin base, integración, `next build`), guardián de SQL de producción, `prisma migration status` y contrato público (15 operaciones + OpenAPI). Resultados en [el informe de la pila](informe-pila-de-prs.md#2-verificación-completa-de-cada-pr).

## Cómo fusionarlos

- **Orden:** 1 → 8. Cada PR apunta a la rama del anterior; al fusionar uno, se cambia la base del siguiente a `main`.
- **Método: «Create a merge commit». No «Squash».** Con squash el PR siguiente pierde su base y arrastra commits duplicados. «Rebase and merge» reescribe los hashes y obliga a rebasar los PR siguientes.
- **Revisión:** los PR 4–6 son movimientos (`git mv`) con cambios de import mecánicos; conviene verlos con `git diff -M` / «ocultar renombrados». Los informes de cada etapa están en [`historico/v10-y-etapas/`](historico/v10-y-etapas/).
- **Datos:** ningún PR toca migraciones, el contrato Prisma compilado ni datos reales. El PR 2 no corrige fechas históricas.
- **CI:** no se modificó ningún workflow. `scripts/check-prod-sql.sh` pasa en todas las ramas.
- **Horario:** hasta el PR 1 incluido, la prueba `accounting/reports.integration` falla entre las 19:00 y las 24:00 de Bogotá (es el defecto que corrige el PR 2). El CI del PR 1 puede ponerse rojo en esa franja sin que haya un error nuevo.

## Riesgos a mirar

| PR | Riesgo | Cómo se acotó |
|---|---|---|
| 2 | Cambio de comportamiento en fechas; el recibo del punto de venta sigue mostrando UTC | PR propio y pequeño; el recibo está revisado y documentado, **sin corregir** (necesita decisión) |
| 5 | `inventory ⇄ sales` es una dependencia circular real, aceptada como excepción temporal | Fijada por una prueba de arquitectura con las 4 dependencias exactas |
| 7 | Se elimina `app/favicon.ico`; el icono depende de `app/icon.svg`, ahora sin fondo negro | Va junto al resto del favicon; los PNG antiguos de `public/icons/` se conservan |
| 8 | 1 370 enlaces internos reescritos y 9 archivos de código con comentarios actualizados | 0 enlaces rotos; los cambios de código son solo de comentarios |

## Cuerpos de los PR

Cada cuerpo termina con la línea de atribución de Claude Code.

### PR 1 · Prisma por dominio y reglas de capas (E0–E1)

**Qué:** divide el contrato de datos en `prisma/schema/<dominio>/`, añade las reglas de dependencia entre capas (`scripts/check-layers.mjs`, `docs/architecture/layers.json`), hace que la integración corra por patrón y que `pnpm verify` no oculte fallos.
**Sin cambios de comportamiento:** el contrato compilado es idéntico; no hay migraciones nuevas.
**Probar:** `pnpm verify` con `TEST_DATABASE_URL` en una base desechable con `pg_trgm`.

### PR 2 · Fechas de documentos: día de Bogotá (cambio funcional)

**Qué:** el asiento contable, el documento fiscal en cola, la vista del documento y la lista de recibos usan `bogotaDay(instante)` en lugar de cortar el instante UTC.
**Por qué:** entre las 19:00 y las 24:00 de Bogotá el día UTC ya es el siguiente; un documento quedaba fechado un día después (y a veces un mes o año después).
**No incluye:** corrección de fechas históricas; recibo POS.
**Validación:** 13 casos unitarios y 9 de integración con instantes fijos; con el código anterior fallan 6 de 9. **No validado:** número de documentos reales afectados (el SQL de diagnóstico no se ha ejecutado).

### PR 3 · Dependencias en orden (E2–E9)

**Qué:** mueve permisos, roles y equipo a Core; gimnasio y museo a `industry`; operaciones por dominio; puertos entre dominios e integraciones; vocabulario por rubro desde la receta. Sin cambios de comportamiento.

### PR 4 · V10 M0–M2

**Qué:** el verificador entiende áreas por ruta y ciclos; una sola raíz de composición en `lib/runtime`; sectores en `lib/core/sectors` con registro explícito.

### PR 5 · V10 M3–M4

**Qué:** `business/*` y `platform/*` como módulos; desaparece `lib/ops`. **Deuda aceptada:** `inventory ⇄ sales`, fijada por prueba.

### PR 6 · V10 M5 y cierre

**Qué:** finance pasa a `lib/domains/finance`; integraciones, business, construcción, experiencia, core y foundation quedan en su área; `lib/` raíz = nueve áreas + `utils.ts` y `cn.ts`. **Sin cambios visuales.**

### PR 7 · Favicon y pruebas a `tests/`

**Qué:** el icono usa solo `app/icon.svg` (sin rectángulo de fondo) y se retira `favicon.ico`; las pruebas dejan `lib/` (`tests/unit|integration|architecture|fixtures`) y una prueba de arquitectura impide que vuelvan. **Cobertura intacta:** 932 pruebas definidas antes y después.

### PR 8 · Wiki unificada

**Qué:** `docs/wiki` (11 secciones), `docs/decisions` (ADR unificados), `docs/internal` (historial, auditorías e informes); página de estructura de Prisma; sincronización con la Wiki de GitHub **solo en simulación**; se eliminan 9 documentos del motor Python retirado. Marca y diseño no se tocan.
