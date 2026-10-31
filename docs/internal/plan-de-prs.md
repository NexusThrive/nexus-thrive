# Plan de PR de la rama `chore/HU-esquema-prisma-modular-01`

Estado a 2026-10-31: la rama tiene **99 commits y 1 236 archivos** sobre `main` (`97eb497`, sin avances desde entonces: 0 detrás, 99 delante). Un solo PR sería irrevisable, así que se parte en **7 PR apilados**, cada uno sobre el anterior, siguiendo el orden en que se hizo el trabajo. Ninguna ruta de código cambia de dueño entre PR: cada tramo compila y pasa `pnpm verify` en su extremo.

## Pila

| PR | Rama | Base | Commits | Cambios | Qué contiene |
|---|---|---|---|---|---|
| 1 | `pr/01-prisma-capas-e1` | `main` | `3aaec78`…`b709905` (14) | 143 archivos | Contrato Prisma dividido por dominio (sin cambiar tablas), reglas de capas (E0), verificador de SQL de producción, primeros movimientos E1, integración por patrón, `pnpm verify` honesto |
| 2 | `pr/02-dependencias-e2-e9` | PR 1 | `ad97033`…`f0b49cc` (29) | 335 archivos | E2 (permisos y equipo a Core, gimnasio y museo a industry), E3 (operaciones por dominio, eventos), E5 (puertos entre dominios), E7 (puertos de integraciones), E9/V (rubros por receta) y el arreglo de fechas UTC → Bogotá |
| 3 | `pr/03-v10-m0-m2` | PR 2 | `0600214`…`3d43dcd` (6) | 127 archivos | V10 M0–M2: verificador por áreas, raíz de composición única en `lib/runtime`, sectores en Core |
| 4 | `pr/04-v10-m3-m4` | PR 3 | `8f640dc`…`aa8e36a` (26) | 298 archivos | V10 M3 (business por módulos) y M4 (platform por módulos, fin de `lib/ops`) |
| 5 | `pr/05-v10-m5-cierre` | PR 4 | `ceca542`…`b6a3039` (17) | 772 archivos | V10 M5 (finance a `domains/finance`) y cierre por etapas (I, B, N, X, C, F, Z): `lib/` queda en nueve áreas |
| 6 | `pr/06-favicon-y-tests` | PR 5 | `53445b8`, `1e0297e` (2) | 172 archivos | Favicon solo SVG y las 150 pruebas de `lib/` a `tests/` (misma cobertura: 932 pruebas en 124 archivos antes y después) |
| 7 | `pr/07-wiki` | PR 6 | `32b90e7`…último (7) | 316 archivos | Documentación unificada en `docs/wiki`, decisiones en `docs/decisions`, historial en `docs/internal` |

## Cómo fusionarlos

- **Orden:** 1 → 7. Cada PR apunta a la rama del anterior; al fusionar uno, se cambia la base del siguiente a `main`.
- **Método de fusión: «Create a merge commit» o «Rebase»; no «Squash».** Con squash el PR siguiente pierde su base y arrastra commits duplicados.
- **Revisión:** los PR 3–5 son movimientos (`git mv`) con cambios de import mecánicos; conviene revisarlos con `git diff -M` / «ocultar renombrados». Los informes de cada etapa están en [`docs/internal/historico/v10-y-etapas/`](historico/v10-y-etapas/).
- **Datos:** ningún PR toca migraciones ni datos reales. El contrato Prisma solo se reorganiza en archivos (mismo `markerHash`); el único cambio de comportamiento está en el PR 2 (ver abajo).
- **CI:** no se modificó ningún workflow. `scripts/check-prod-sql.sh` pasa (el contrato no cambia tablas).

## Riesgos a mirar en la revisión

| PR | Riesgo | Cómo se acotó |
|---|---|---|
| 2 | `fix(documentos)`: la fecha de un documento pasa a ser el día de negocio en Bogotá, no el día UTC. Los asientos históricos ya fechados en UTC **no se corrigen** | SQL de diagnóstico de solo lectura en `docs/diagnostico/` y prueba de integración; decisión de corregir datos pendiente |
| 4 | `inventory ⇄ sales` es una dependencia circular real, aceptada como excepción temporal | Fijada por una prueba de arquitectura con las 4 dependencias exactas |
| 5 | El commit de la etapa Z arrastró un cambio de `app/icon.svg` (sin rectángulo negro de fondo) hecho por la persona dueña del repositorio | Documentado; no se reescribió historial |
| 6 | Se elimina `app/favicon.ico` y el icono depende de `app/icon.svg`; los PNG antiguos de `public/icons/` se conservan | Revisar que no haya flujos que los necesiten |
| 7 | Rutas de documentos cambiadas: 1 323 enlaces internos resueltos, 0 rotos; 103 rutas de código citadas en la wiki ya no existen (muchas históricas) | [Informe](rutas-citadas-inexistentes.md); fase 5 |

## Cuerpos de los PR

Cada cuerpo termina con la línea de atribución de Claude Code.

### PR 1 · Prisma por dominio y reglas de capas (E0–E1)

**Qué:** divide el contrato de datos en `prisma/schema/<dominio>/`, añade las reglas de dependencia entre capas (`scripts/check-layers.mjs`, `docs/architecture/layers.json`), hace que la integración corra por patrón y que `pnpm verify` no oculte fallos.
**Por qué:** el contrato monolítico y las dependencias cruzadas impedían razonar sobre el sistema.
**Cómo probar:** `pnpm verify` (con `TEST_DATABASE_URL` apuntando a una base desechable con `pg_trgm`).
**Sin cambios de comportamiento:** el contrato compilado es idéntico; no hay migraciones nuevas.

### PR 2 · Dependencias en orden (E2–E9)

**Qué:** mueve permisos, roles y equipo a Core; gimnasio y museo a `industry`; operaciones por dominio; puertos entre dominios e integraciones; vocabulario por rubro desde la receta.
**Cambio de comportamiento:** `fix(documentos)` — la fecha de un documento es el día de negocio en Bogotá.
**Verificación:** `pnpm verify`; informes E1–E9 en el historial.

### PR 3 · V10 M0–M2

**Qué:** el verificador entiende áreas por ruta y ciclos; una sola raíz de composición en `lib/runtime`; sectores en `lib/core/sectors` con registro explícito.

### PR 4 · V10 M3–M4

**Qué:** `business/*` y `platform/*` como módulos; desaparece `lib/ops`.
**Deuda aceptada:** `inventory ⇄ sales`, fijada por prueba.

### PR 5 · V10 M5 y cierre

**Qué:** finance pasa a `lib/domains/finance`; integraciones, business, construcción, experiencia, core y foundation quedan en su área; `lib/` raíz = nueve áreas + `utils.ts` y `cn.ts`.
**Verificación:** `check:layers` 290 archivos, 0 violaciones; 3 ciclos de solo tipos (tope 3).

### PR 6 · Favicon y pruebas a `tests/`

**Qué:** el icono usa solo `app/icon.svg`; las pruebas dejan `lib/` (`tests/unit|integration|architecture|fixtures`) y una prueba de arquitectura impide que vuelvan.
**Cobertura intacta:** 932 pruebas en 124 archivos antes y después; integración 66 archivos / 413 pruebas.

### PR 7 · Wiki unificada

**Qué:** `docs/wiki` (11 secciones), `docs/decisions` (ADR unificados), `docs/internal` (historial y auditorías); página de estructura de Prisma; se eliminan 9 documentos del motor Python retirado. Marca y diseño no se tocan.
**Pendiente (fases 5–6):** validación de la wiki y sincronización con la Wiki de GitHub (no incluida).
