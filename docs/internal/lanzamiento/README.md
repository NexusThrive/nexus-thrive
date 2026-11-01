# Lanzamiento de la pila de 8 PR

**Estado: preparado, NO publicado.** Este documento es la trazabilidad de la primera gran integración arquitectónica de Nexus. Nada de lo que contiene se ha ejecutado contra GitHub; publicar requiere autorización expresa. Los comandos están para que **tú** los revises y ejecutes desde tu entorno.

## 1. La pila

| PR | Rama | Base | Título |
|---|---|---|---|
| 01 | `stack/01-prisma-capas-e1` | `main` | Prisma por dominio, reglas de capas y primeros movimientos (E0–E1) |
| 02 | `stack/02-fechas-bogota` | `stack/01-prisma-capas-e1` | Fechas de documentos: día de Bogotá en lugar del día UTC (cambio funcional) |
| 03 | `stack/03-reubicaciones-e2-e9` | `stack/02-fechas-bogota` | Reubicaciones y puertos entre dominios (E2–E9) |
| 04 | `stack/04-v10-m0-m2` | `stack/03-reubicaciones-e2-e9` | V10 M0–M2: verificador por áreas, raíz de composición y sectores |
| 05 | `stack/05-v10-m3-m4` | `stack/04-v10-m0-m2` | V10 M3–M4: business y platform por módulos |
| 06 | `stack/06-v10-m5-cierre` | `stack/05-v10-m3-m4` | V10 M5 y cierre: finance a domains y `lib/` en nueve áreas |
| 07 | `stack/07-favicon-y-tests` | `stack/06-v10-m5-cierre` | Favicon solo SVG y pruebas fuera de `lib/` |
| 08 | `stack/08-wiki` | `stack/07-favicon-y-tests` | Wiki unificada, decisiones e informes de entrega |

Cadena lineal verificada: cada rama es descendiente de la anterior. `main` (`97eb497`) no ha avanzado, así que no hace falta rebase. Las ramas `pr/01…07` de la primera versión del plan están **obsoletas**: no las subas ni las borres hasta que la pila nueva esté integrada.

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
git push origin stack/01-prisma-capas-e1 stack/02-fechas-bogota stack/03-reubicaciones-e2-e9 \
  stack/04-v10-m0-m2 stack/05-v10-m3-m4 stack/06-v10-m5-cierre stack/07-favicon-y-tests stack/08-wiki
```

2. **Abrir los ocho PR en borrador**, cada uno contra la rama anterior (títulos y cuerpos en `docs/internal/lanzamiento/pr-NN.md`):

```bash
gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base main --head stack/01-prisma-capas-e1 \
  --title "Prisma por dominio, reglas de capas y primeros movimientos (E0–E1)" \
  --body-file docs/internal/lanzamiento/pr-01.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base stack/01-prisma-capas-e1 --head stack/02-fechas-bogota \
  --title "Fechas de documentos: día de Bogotá en lugar del día UTC (cambio funcional)" \
  --body-file docs/internal/lanzamiento/pr-02.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base stack/02-fechas-bogota --head stack/03-reubicaciones-e2-e9 \
  --title "Reubicaciones y puertos entre dominios (E2–E9)" \
  --body-file docs/internal/lanzamiento/pr-03.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base stack/03-reubicaciones-e2-e9 --head stack/04-v10-m0-m2 \
  --title "V10 M0–M2: verificador por áreas, raíz de composición y sectores" \
  --body-file docs/internal/lanzamiento/pr-04.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base stack/04-v10-m0-m2 --head stack/05-v10-m3-m4 \
  --title "V10 M3–M4: business y platform por módulos" \
  --body-file docs/internal/lanzamiento/pr-05.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base stack/05-v10-m3-m4 --head stack/06-v10-m5-cierre \
  --title "V10 M5 y cierre: finance a domains y `lib/` en nueve áreas" \
  --body-file docs/internal/lanzamiento/pr-06.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base stack/06-v10-m5-cierre --head stack/07-favicon-y-tests \
  --title "Favicon solo SVG y pruebas fuera de `lib/`" \
  --body-file docs/internal/lanzamiento/pr-07.md

gh pr create --draft --repo NexusThrive/nexus-thrive \
  --base stack/07-favicon-y-tests --head stack/08-wiki \
  --title "Wiki unificada, decisiones e informes de entrega" \
  --body-file docs/internal/lanzamiento/pr-08.md
```

3. **Revisar y fusionar en orden**: PR 1 con *merge commit*; cambiar la base del PR 2 a `main` (`gh pr edit <n> --base main`); esperar el CI; repetir hasta el PR 8. Marcar cada PR como listo para revisión (`gh pr ready <n>`) cuando le toque.

> `gh pr create` lee el cuerpo de un archivo que vive en la rama `stack/08-wiki`: ejecuta los comandos con esa rama como directorio de trabajo, o copia antes `docs/internal/lanzamiento/` a una ruta local.

## 6. Trabajos independientes (no bloquean la pila)

- **Recibo del POS:** definir si muestra hora de Bogotá y probarlo antes de tocar `receiptOf`.
- **SQL de diagnóstico de fechas:** ejecutarlo sobre una **copia** de producción, nunca directamente en producción, y documentar el resultado.
- **Wiki de GitHub:** comprobar Mermaid, imágenes, enlaces internos y navegación antes de publicarla.
- **13 documentos pendientes de revisión:** decisión individual ([revisión](../revision-documentos-pendientes.md)).
- **Ramas obsoletas `pr/01…07`:** eliminarlas solo cuando la pila nueva esté integrada.

## 7. Registro de decisiones

| Decisión | Resultado |
|---|---|
| Separar el cambio de fechas | PR 2 independiente |
| Favicon | Cambio de `app/icon.svg` en el PR 7 |
| Estrategia de integración | *Merge commits*, sin squash |
| Prueba horaria | Determinista en el PR 1, sin adelantar el arreglo de fechas |
| Mecanismo de publicación | Recomendado: la persona dueña ejecuta `gh` desde su entorno |
| Publicación | **No autorizada** |
| `pushurl` | `no_push` |
