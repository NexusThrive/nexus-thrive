# Plan incremental: migrar las 151 pruebas a `tests/`

Estado: **solo plan**. No se movió ninguna de las 151 pruebas. Lo único hecho: crear `tests/architecture/`, y que Vitest
reconozca `lib/**/*.test.ts` **y** `tests/**/*.test.ts` (`vitest.config.mts`).

## Punto de partida (medido)

| Dato | Valor |
|---|---|
| Pruebas junto al código en `lib/` | 151 (97 unitarias, 54 `*.integration.test.ts`) en 42 carpetas |
| Con imports relativos (`./x`, `../x`) que habrá que reescribir | 133 |
| Con `vi.mock` de ruta relativa | 0 |
| Que leen archivos por ruta (hay que recalcular la raíz) | 10 |
| Rutas de prueba fijas en `test-integration.sh` | 24 (20 integración + 4 con otro nombre) |
| Pruebas `*.integration.test.ts` que **no** están en esa lista | **34** |
| Archivos (`.md`, `.sh`, `.yml`, `.json`) que citan rutas de pruebas de `lib/` (`DESIGN.md`, `pull_request_template.md`, `docs/guias/pruebas.md`, `docs/construction/*`, `docs/nexus-architecture/*`…) | 27 |

Carpetas con más pruebas: `tenant` 15, `ops` 12, `construction` 12 (+6 en `apu-importer`), `business` 10, `presence` 7, `accounting` 6, `pos`, `plans`, `finance`, `events`, `einvoice`, `api` 4 cada una.

Las 10 que leen por ruta: `events/n8n-templates`, `tenant/{deletion.integration,data-access,tenant-scope,page-authorization}`, `capabilities/registry`, `design/ui-rules`, `navigation/tenant-nav` y las dos `construction/apu-importer/master-pack*.file*`.

### Hallazgo que condiciona el plan (resuelto)

> **Actualización:** `test-integration.sh` ya corre por patrón todas las `*.integration.test.ts` (ver `auditoria-pruebas-integracion.md`). La ola 5 ya no necesita decidir qué activar: al moverlas a `tests/integration/` siguen entrando solas.


`test-integration.sh` lista 24 archivos a mano. Las otras **34** pruebas de integración (por ejemplo `accounting/*`, `api/api`, `catalog/catalog`, `admin/users`, `business/adjustment-notes`) se omiten en el paso «Unit tests» del CI (`TEST_DATABASE_URL=""`) y **no están** en el paso de integración, así que hoy podrían no ejecutarse nunca en CI. No se cambió nada. Al migrar a `tests/integration/**` hay que decidir si el script pasa a usar una carpeta/patrón (se activarían las 34, con posibles fallos que hoy están ocultos) o conserva la lista.

## Estructura destino

```
tests/
├── architecture/        ← ya existe: reglas de capas y guardián de SQL
├── unit/<carpeta de lib>/…            lib/a/b.test.ts              → tests/unit/a/b.test.ts
└── integration/<carpeta de lib>/…     lib/a/b.integration.test.ts  → tests/integration/a/b.integration.test.ts
```

- El nombre del archivo no cambia. Las 3 pruebas sueltas de `lib/` van a `tests/unit/` (raíz).
- Los imports relativos pasan a `@/lib/<carpeta>/<archivo>` (el alias `@` ya existe en Vitest y en `tsconfig`).
- Las pruebas que leen por ruta calculan la raíz con `join(import.meta.dirname, "../…")`; se ajustan una por una.

## Olas (cada una es un PR pequeño y reversible)

| Ola | Qué se mueve | Riesgo | Cambios de acompañamiento |
|---|---|---|---|
| 0 ✔ | `tests/architecture/` y `include` de Vitest | Bajo | Hecho |
| 1 | Unitarias de las carpetas pequeñas (1–3 pruebas por carpeta) que no leen archivos: 35 pruebas en 29 carpetas | Bajo | Script de migración con `git mv` + reescritura de imports |
| 2 | Unitarias de `tenant`, `ops`, `business`, `presence`, `accounting`, `finance`, `pos`, `plans`, `events`, `api`… | Medio | Ninguno |
| 3 | `construction/` (incluye `apu-importer/`, 18 pruebas) | Medio | Fixtures de datos junto a las pruebas: revisar rutas |
| 4 | Las 10 que leen por ruta | Medio | Ajuste manual de la raíz; revisar cada una |
| 5 | Integración: mover a `tests/integration/` | **Alto** | Decidir sobre las 34 no listadas; reescribir las 24 rutas de `test-integration.sh`; actualizar documentación |
| 6 | Cierre | Bajo | Quitar `lib/**/*.test.ts` del `include`; añadir una prueba de arquitectura que falle si aparece un `*.test.ts` dentro de `lib/`; actualizar `docs/guias/pruebas.md` y las demás referencias |

## Verificación de cada ola (criterios de aceptación)

1. **Mismos archivos y mismas pruebas:** `pnpm exec vitest list` antes y después da el mismo número de pruebas y los mismos nombres (solo cambia la ruta).
2. **Mismos resultados:** `pnpm test` con el mismo recuento de pasadas/omitidas/fallidas que antes de la ola.
3. `pnpm exec tsc --noEmit`, `pnpm lint` y `pnpm check:layers` en verde.
4. Ninguna referencia colgante: `grep` de la ruta antigua en `*.sh`, `*.yml`, `*.md`, `*.json`.
5. Historia de git conservada (`git mv`; Git detecta el renombrado si el cambio de contenido es pequeño).
6. Reversión: cada ola es un commit independiente; `git revert` la deshace.

## Riesgos

- **Pruebas de integración ocultas** (arriba): migrarlas puede revelar fallos que hoy nadie ve.
- **Imports relativos mal reescritos** en un archivo dentro de una carpeta con `index.ts`: el script debe resolver al archivo real y fallar si no lo encuentra.
- **Pruebas con efectos de orden:** algunas integración corren con `--no-file-parallelism` por tocar tablas compartidas; el orden de ejecución puede variar al cambiar las rutas.
- **Ruido en revisión:** 151 renombrados + reescrituras de imports. Por eso las olas son pequeñas y el script es determinista y revisable.

## Qué no se hace en este plan

No se separan ni se reescriben los comentarios de las pruebas, ni se cambia lo que prueba cada una. Es un cambio de ubicación.
