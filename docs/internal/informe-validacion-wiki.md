# Informe de validación de la wiki (fases 5 y 6)

Fecha: 2026-10-31. Alcance: `docs/wiki/` (11 secciones), `docs/decisions/`, los enlaces desde `README.md`, `CLAUDE.md`, `AGENTS.md` y `CONTRIBUTING.md`, y el mecanismo de sincronización con la Wiki de GitHub. **No se publicó nada, no se subió ninguna rama y no se abrió ningún PR.**

## 1. Las 11 secciones

| Sección | Páginas (sin índice) | Palabras | Contenido principal |
|---|---|---|---|
| 01 · Inicio | 2 | 715 | Instalación y primer día · estructura del repositorio |
| 02 · Producto | 5 | 16 531 | Guía de construcción, visión, distribución por rubro, mapa de capacidades, **hoja de ruta vigente (reescrita)** |
| 03 · Arquitectura | 4 | 8 656 | Arquitectura objetivo, guía de `lib/`, reglas de dependencias, diagramas |
| 04 · Módulos | 3 | 2 148 | Documentación de módulos · **mapa de áreas y módulos (generado)** · gimnasio NFC · 90 páginas de capas |
| 05 · Datos y base de datos | 3 | 2 024 | Prisma: estructura · dinero y decimales · borrado de un negocio |
| 06 · Seguridad y permisos | 2 | 934 | Autenticación, permisos y aislamiento · **matriz de permisos (generada)** |
| 07 · Integraciones | 2 | 4 174 | API · MCP · webhooks · n8n |
| 08 · Operación y despliegue | 4 | 3 636 | DevOps · Clerk · SQL de producción (orden y automatización) |
| 09 · Desarrollo | 4 | 2 955 | Nueva funcionalidad · versionado · equipo de ingeniería · **mantener la wiki** |
| 10 · Pruebas y calidad | 2 | 1 740 | Pruebas · **pruebas de arquitectura (generada)** |
| 11 · Glosario | 1 | 353 | 20 términos |

Navegación: `Home` y `_Sidebar` enlazan las 11 secciones; cada índice de sección lista todas sus páginas (lo comprueba `tests/architecture/wiki.test.ts`). Secciones más delgadas: 01, 06, 11 (una a dos páginas); tienen lo esencial pero no son exhaustivas, y `docs/wiki/06` en particular no cubre RLS ni la política de caché de datos privados (esta última está en `docs/design/pwa.md`).

## 2. Enlaces

- **1 364 enlaces internos** en 289 documentos fuera de `plugins/`, `.agents/` y `.claude/`: **1 364 resueltos, 0 rotos** (antes de la fase 4: 1 208).
- Los enlaces con ancla (`#sección`) se comprueban solo hasta el archivo, no hasta el encabezado.
- Desde `README.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md` y la plantilla de PR: todos los enlaces y rutas citadas existen, salvo `docs/ingenieria/PAUSA` (marcador intencional, solo existe si se pausa el ciclo). Dos descripciones del `README` y de la guía de construcción decían «arquitectura actual y objetivo» para la auditoría de octubre: se corrigieron a «histórica, pendiente de validación».

## 3. Duplicados y contradicciones

- Comparación de frases entre todas las páginas de `docs/wiki` y `docs/decisions` (ventana de 8 palabras): el mayor solapamiento es del 10 % (`formato.md` ↔ `resumen.md`, aceptable). Ningún título repetido.
- Contradicciones detectadas y resueltas:
  - `hoja-de-ruta.md` («después de E3», 31 excepciones abiertas) y `reglas-de-capas-e0.md` («64 excepciones», «rama local sin push») estaban entre las vigentes y describían un estado anterior: **pasaron a `historico/v10-y-etapas/`**; la hoja de ruta se reescribió con el estado de hoy.
  - `reglas-dependencias.md` citaba `lib/core/tenancy/tenant-scope.test.ts`, que ya está en `tests/architecture/`.
  - `arquitectura-objetivo.md` decía que la documentación antigua estaba «pendiente»; ahora refleja lo hecho y lo que queda.
  - La tabla de permisos de construcción **contradecía la matriz real** (ver §5).

## 4. Rutas inexistentes

De 103 rutas citadas que no existían al cerrar la fase 4, **quedan 30, todas históricas o intencionales** (0 pendientes): 41 se corrigieron por coincidencia única de archivo o por la correspondencia de carpetas de V10 y el resto a mano. Detalle clasificado: [`rutas-citadas-inexistentes.md`](rutas-citadas-inexistentes.md).

## 5. Tabla de permisos de construcción

`docs/construction/tabla-permisos-catalogo.md` quedó marcada **NO VÁLIDA** y con el contraste: `apu.edit` y `apu.destroy` incluyen a `ADMIN` en la matriz real y la tabla no. La referencia vigente es la [matriz de permisos](../wiki/06-seguridad-y-permisos/matriz-de-permisos.md), generada de `BUSINESS_PERMISSIONS`.

## 6. Páginas antiguas

- Las cuatro de `nexus-architecture` anteriores a V10 están fuera de la wiki (39 de 59 rutas inexistentes).
- Los 13 documentos pendientes **no se eliminaron ni se fusionaron**; su veredicto recomendado está en [revision-documentos-pendientes](revision-documentos-pendientes.md). `tests/architecture/wiki.test.ts` impide que una página con aviso de «pendiente de validación» o «NO VÁLIDA» entre en `docs/wiki/`.

## 7. Mecanismo de sincronización (fase 6)

`scripts/wiki-sync.mjs` (`pnpm wiki:check` valida) genera una copia plana de `docs/wiki` para la Wiki de GitHub. Descripción, comandos y permisos: [mantener la wiki](../wiki/09-desarrollo/mantener-la-wiki.md).

| Comprobación | Resultado |
|---|---|
| Generación completa | 135 páginas planas + `_Sidebar`, `_Footer`; 0 errores |
| Páginas alcanzables desde `Home` | 135 de 135 (una página huérfana, el índice de pestañas de la capa de construcción, se corrigió) |
| `Home` y `_Sidebar` | `Home.md` y `_Sidebar.md` generados a partir de los de `docs/wiki`, con enlaces por nombre de página |
| Enlaces | Enlaces entre páginas → nombre de página; 187 enlaces a código y documentos fuera de la wiki → URL de GitHub (`blob`/`tree`) |
| Conversión | Se quita el front matter YAML; cada página lleva pie «generada desde `docs/wiki/…`, no editar aquí» |
| **Dry run contra un remoto local falso** (repositorio bare creado en una carpeta temporal con una wiki «vieja») | Muestra el listado de cambios (todas las páginas nuevas, las viejas desaparecen), **sin commit ni push**; el remoto siguió con 1 commit |
| `--confirm` sin `NEXUS_WIKI_PUBLISH=yes` | Rechazado: «Publicar exige NEXUS_WIKI_PUBLISH=yes en el entorno» |
| `--confirm` con la variable pero `docs/wiki` con cambios sin confirmar | Rechazado |
| Pruebas | `tests/architecture/wiki-sync.test.ts` (4) y `wiki.test.ts` (8); con mutaciones (página sin índice, enlace roto) las pruebas fallan |

**No probado:** la publicación real (commit y push) ni el comportamiento de la Wiki de GitHub con estas páginas (renderizado de Mermaid, enlaces entre páginas planas, subcarpeta `assets/`), porque no se publicó. Los permisos necesarios están descritos pero hay que confirmarlos al activar la publicación. No se tocó `pushurl = no_push` ni ningún workflow.

## 8. Limitaciones de esta validación

- Se comprobó que las rutas **existen**, no que lo que se dice de ellas sea cierto; las páginas generadas (matriz, mapa, pruebas) sí quedan atadas al código por pruebas.
- Las páginas largas de `02-producto` (visión, mapa de capacidades, guía de construcción) no se contrastaron frase a frase con el código.
- No se revisó la ortografía ni se midió la calidad de la redacción.

## 9. Verificación final

`pnpm verify` completo en verde sobre este commit (lint, tipos, `check:layers`, unitarias y de arquitectura, integración contra una base desechable, `next build`). Comprobaciones propias de la wiki: `tests/architecture/wiki.test.ts` (8) y `wiki-sync.test.ts` (4) pasan; con una página sin índice y un enlace roto introducidos a propósito fallan 4 pruebas, y vuelven a pasar al revertirlos.
