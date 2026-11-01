# Lanzamiento de la pila de 8 PR

**Estado: publicado e integrado en `main` el 1 nov 2026** (ver §9). Este documento es la trazabilidad de la primera gran integración arquitectónica de Nexus. Las secciones 1 a 8 describen el plan tal como se preparó; los comandos de la §5 son el procedimiento previsto, conservados como registro.

## 1. La pila

| PR | Rama | Base | Título |
|---|---|---|---|
| 01 | `chore/HU-v10-prisma-capas-01` | `main` | Prisma por dominio, reglas de capas y primeros movimientos (E0–E1) |
| 02 | `chore/HU-v10-fechas-bogota-02` | `chore/HU-v10-prisma-capas-01` | Fechas de documentos: día de Bogotá en lugar del día UTC (cambio funcional) |
| 03 | `chore/HU-v10-reubicaciones-03` | `chore/HU-v10-fechas-bogota-02` | Reubicaciones y puertos entre dominios (E2–E9) |
| 04 | `chore/HU-v10-m0-m2-04` | `chore/HU-v10-reubicaciones-03` | V10 M0–M2: verificador por áreas, raíz de composición y sectores |
| 05 | `chore/HU-v10-m3-m4-05` | `chore/HU-v10-m0-m2-04` | V10 M3–M4: business y platform por módulos |
| 06 | `chore/HU-v10-m5-cierre-06` | `chore/HU-v10-m3-m4-05` | V10 M5 y cierre: finance a domains y `lib/` en nueve áreas |
| 07 | `chore/HU-v10-favicon-tests-07` | `chore/HU-v10-m5-cierre-06` | Favicon solo SVG y pruebas fuera de `lib/` |
| 08 | `chore/HU-v10-wiki-08` | `chore/HU-v10-favicon-tests-07` | Wiki unificada, decisiones e informes de entrega |

Cadena lineal verificada: cada rama es descendiente de la anterior. `main` (`97eb497`) no ha avanzado, así que no hace falta rebase. Las ramas se llaman `chore/HU-v10-<tema>-NN` porque el hook de ramas del equipo solo admite `<tipo>/HU-<slug>-<nn>`. Existen copias locales `stack/NN-…` con los mismos commits (no se publican). Las ramas `pr/01…07` de la primera versión del plan estaban obsoletas y, junto con las copias `stack/*`, se eliminaron tras la integración (§9).

## 2. Dependencias

PR 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8, estricto: cada PR parte del anterior y no pueden reordenarse. Detalle en el [informe de la pila](../informe-pila-de-prs.md).

## 3. Riesgos principales

| PR | Riesgo | Mitigación |
|---|---|---|
| 2 | Único cambio de comportamiento (fechas); histórico sin corregir; número de documentos afectados desconocido | PR propio de 8 archivos; SQL de diagnóstico de solo lectura; decisión de contabilidad antes de fusionar |
| 2 | El recibo del punto de venta sigue en UTC | Tarea independiente |
| 5 | Dependencia circular `inventory ⇄ sales` | Fijada por una prueba de arquitectura |
| 7 | Icono sin fondo negro, poco visible en pestañas claras | Revisión visual en el PR |
| todos | La verificación fue local | El CI de GitHub (`.github/workflows/ci.yml`, corre en cualquier `pull_request`) es la primera confirmación independiente; si difiere de lo local, se revisa antes de fusionar |
| 3–6 | Revisión de refactor mecánico muy grande (hasta 771 archivos) | `git diff -M`, informes por etapa en `docs/internal/historico/v10-y-etapas/` |

## 4. Criterios de aceptación globales

- CI de GitHub en verde en cada PR antes de fusionarlo (no se fusiona automáticamente por tener CI verde).
- Contrato público (15 operaciones + OpenAPI) y migraciones sin cambios en toda la pila.
- Cada PR se fusiona con *merge commit*, no con squash.
- Tras fusionar un PR, la base del siguiente se cambia a `main` y se espera su CI.
- La wiki no se anuncia como publicada hasta revisar su renderizado en GitHub.

## 5. Procedimiento de publicación recomendado (no ejecutado)

1. **Subir las ocho ramas** con el remoto `origin` (el remoto `github` tiene el push bloqueado a propósito y no se toca):

```bash
git push origin chore/HU-v10-prisma-capas-01 chore/HU-v10-fechas-bogota-02 chore/HU-v10-reubicaciones-03 \
  chore/HU-v10-m0-m2-04 chore/HU-v10-m3-m4-05 chore/HU-v10-m5-cierre-06 chore/HU-v10-favicon-tests-07 chore/HU-v10-wiki-08
```

2. **Abrir los ocho PR en borrador**, cada uno contra la rama anterior (títulos y cuerpos en `docs/internal/lanzamiento/pr-NN.md`):

```bash
gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base main --head chore/HU-v10-prisma-capas-01 \
  --title "Prisma por dominio, reglas de capas y primeros movimientos (E0–E1)" \
  --body-file docs/internal/lanzamiento/pr-01.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base chore/HU-v10-prisma-capas-01 --head chore/HU-v10-fechas-bogota-02 \
  --title "Fechas de documentos: día de Bogotá en lugar del día UTC (cambio funcional)" \
  --body-file docs/internal/lanzamiento/pr-02.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base chore/HU-v10-fechas-bogota-02 --head chore/HU-v10-reubicaciones-03 \
  --title "Reubicaciones y puertos entre dominios (E2–E9)" \
  --body-file docs/internal/lanzamiento/pr-03.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base chore/HU-v10-reubicaciones-03 --head chore/HU-v10-m0-m2-04 \
  --title "V10 M0–M2: verificador por áreas, raíz de composición y sectores" \
  --body-file docs/internal/lanzamiento/pr-04.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base chore/HU-v10-m0-m2-04 --head chore/HU-v10-m3-m4-05 \
  --title "V10 M3–M4: business y platform por módulos" \
  --body-file docs/internal/lanzamiento/pr-05.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base chore/HU-v10-m3-m4-05 --head chore/HU-v10-m5-cierre-06 \
  --title "V10 M5 y cierre: finance a domains y `lib/` en nueve áreas" \
  --body-file docs/internal/lanzamiento/pr-06.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base chore/HU-v10-m5-cierre-06 --head chore/HU-v10-favicon-tests-07 \
  --title "Favicon solo SVG y pruebas fuera de `lib/`" \
  --body-file docs/internal/lanzamiento/pr-07.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base chore/HU-v10-favicon-tests-07 --head chore/HU-v10-wiki-08 \
  --title "Wiki unificada, decisiones e informes de entrega" \
  --body-file docs/internal/lanzamiento/pr-08.md
```

3. **Revisar y fusionar en orden**: PR 1 con *merge commit*; cambiar la base del PR 2 a `main` (`gh pr edit <n> --base main`); esperar el CI; repetir hasta el PR 8. Marcar cada PR como listo para revisión (`gh pr ready <n>`) cuando le toque.

> `gh pr create` lee el cuerpo de un archivo que vive en la rama `chore/HU-v10-wiki-08`: ejecuta los comandos con esa rama como directorio de trabajo, o copia antes `docs/internal/lanzamiento/` a una ruta local.

### Wiki de GitHub (se hace después, con la pila subida)

Requisitos: que exista el repositorio Wiki (se crea al guardar una primera página desde la interfaz de GitHub) y que `chore/HU-v10-wiki-08` esté publicada, para que los enlaces de la wiki a documentos que aún no están en `main` funcionen durante la revisión. Se genera con `--branch` para que esos enlaces apunten a esa rama; al integrar toda la pila se vuelve a sincronizar apuntando a `main`:

```bash
# Simulación (no escribe): muestra qué cambiaría en la wiki publicada
node scripts/wiki-sync.mjs publish --remote https://github.com/NexusThrive/nexus-thrive.wiki.git --branch chore/HU-v10-wiki-08
# Publicación (solo con autorización): añade --confirm y NEXUS_WIKI_PUBLISH=yes
```

`--branch` solo cambia el nombre de rama que se escribe en las URL `blob`/`tree` y en el pie de cada página; el resto de la conversión no cambia.

## 6. Trabajos independientes (no bloquean la pila)

- **Recibo del POS:** definir si muestra hora de Bogotá y probarlo antes de tocar `receiptOf`.
- **SQL de diagnóstico de fechas:** ejecutarlo sobre una **copia** de producción, nunca directamente en producción, y documentar el resultado.
- **Wiki de GitHub:** comprobar Mermaid, imágenes, enlaces internos y navegación antes de publicarla.
- **13 documentos pendientes de revisión:** decisión individual ([revisión](../revision-documentos-pendientes.md)).
- **Ramas obsoletas `pr/01…07`:** eliminadas tras la integración.

## 7. Registro de decisiones

| Decisión | Resultado |
|---|---|
| Separar el cambio de fechas | PR 2 independiente |
| Favicon | Cambio de `app/icon.svg` en el PR 7 |
| Estrategia de integración | *Merge commits*, sin squash |
| Prueba horaria | Determinista en el PR 1, sin adelantar el arreglo de fechas |
| Nombres de rama | `chore/HU-v10-<tema>-NN`, compatibles con el hook; `stack/*` queda como copia local |
| Mecanismo de publicación | Recomendado: la persona dueña ejecuta `gh` desde su entorno |
| Publicación | **No autorizada** |
| `pushurl` | `no_push` |

## 8. Correcciones tras el primer CI de GitHub

El primer CI (1 nov 2026) pasó en el PR 1 y falló en los PR 2 a 8 por dos pruebas de integración que yo había escrito y que dependían de mi entorno local, no del código:

| Prueba | Causa | Corrección | Rama |
|---|---|---|---|
| `diagnostico-fechas-utc.integration` | Exigía el nombre de base `nexus_e<n>_test`; el CI usa `nexus_test` | Acepta ambos nombres (`/^nexus_(e\d+_)?test$/`); sigue rechazando cualquier otra base | PR 2 |
| `puertos-integraciones.integration` | Cifra credenciales y necesitaba `WEBHOOK_ENCRYPTION_KEY`, que el CI no define | La fija en `beforeAll`, como sus pruebas hermanas | PR 3 |

Las correcciones se añadieron como commits nuevos en las ramas 02 y 03 y se fusionaron hacia adelante (02→03, 03→04 … 07→08) con commits de merge: **no se reescribió historial ni se hizo force-push**. Por eso las ramas 03 a 08 ya no son idénticas a las copias locales `stack/*`. Lección: la verificación local debe reproducir el entorno del CI (base `nexus_test`, sin variables exportadas a mano).

Vercel falló en #129 y #132 por un error de Turbopack con `next/font/google` ("queries have exactly one entry") al restaurar la caché de compilación; el mismo código compila en las demás ramas, así que parece transitorio. Se revisa tras los nuevos commits.

## 9. Resultado (1 nov 2026)

La pila **se publicó y se integró**. Resumen de lo ocurrido:

| PR | Rama (eliminada tras fusionar) | Fusionado en `main` |
|---|---|---|
| [#128](https://github.com/NexusThrive/nexus-thrive/pull/128) | `chore/HU-v10-prisma-capas-01` | `829b35f` |
| [#129](https://github.com/NexusThrive/nexus-thrive/pull/129) | `chore/HU-v10-fechas-bogota-02` | `68e85fd` |
| [#130](https://github.com/NexusThrive/nexus-thrive/pull/130) | `chore/HU-v10-reubicaciones-03` | `9c3e7fc` |
| [#131](https://github.com/NexusThrive/nexus-thrive/pull/131) | `chore/HU-v10-m0-m2-04` | `88af15e` |
| [#132](https://github.com/NexusThrive/nexus-thrive/pull/132) | `chore/HU-v10-m3-m4-05` | `c87fc22` |
| [#133](https://github.com/NexusThrive/nexus-thrive/pull/133) | `chore/HU-v10-m5-cierre-06` | `6530df1` |
| [#134](https://github.com/NexusThrive/nexus-thrive/pull/134) | `chore/HU-v10-favicon-tests-07` | `cf2a402` |
| [#135](https://github.com/NexusThrive/nexus-thrive/pull/135) | `chore/HU-v10-wiki-08` | `8be7313` |

- Se fusionaron en orden con *merge commit* (sin squash). Para cada PR siguiente se cambió la base a `main` y se **cerró y reabrió** para que el CI lo validara contra `main` (cambiar la base no relanza el CI).
- El primer CI de GitHub falló en los PR 2 a 8 por dos pruebas de integración que dependían del entorno local (ver §8); se corrigieron sin reescribir historial. Vercel falló una vez por un error transitorio de Turbopack.
- `main` quedó idéntica, archivo por archivo, a la última rama verificada; su CI (`verify`) y el despliegue de producción de Vercel pasaron.
- La **Wiki de GitHub** se publicó el 1 nov 2026 (135 páginas) en <https://github.com/NexusThrive/nexus-thrive/wiki>.
- Las 8 ramas remotas fusionadas, las copias locales `stack/*` y las obsoletas `pr/01…07` se eliminaron tras comprobar que sus commits estaban en `main` o en la rama de trabajo.
- Quedan fuera de este lanzamiento: el recibo del POS (UTC), la ejecución del SQL de diagnóstico de fechas contra una copia y los 13 documentos por revisar.
