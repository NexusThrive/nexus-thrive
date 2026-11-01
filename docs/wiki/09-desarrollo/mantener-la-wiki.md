# Mantener la wiki

Reglas para que la documentación siga siendo la **única fuente de verdad** y no se pudra. Aplican a desarrolladores, administradores técnicos y agentes de IA.

## Principios

1. **Una sola fuente por tema.** Si dos páginas dicen lo mismo, una se elimina o enlaza a la otra.
2. **Vigente separado del historial.** `docs/wiki/` explica cómo funciona Nexus **hoy**. Los informes fechados van a [`docs/internal/historico/`](../../internal/historico/README.md); las decisiones, a [`docs/decisions/`](../../decisions/README.md).
3. **El código manda.** Si una página contradice al código, se corrige la página en el mismo cambio. Una afirmación que no se pueda comprobar en el código se marca como **pendiente de validación** y sale de `docs/wiki/`.
4. **Cambia la estructura, cambia la wiki.** Un cambio que mueve módulos, añade una área, un permiso, una tabla o un comando actualiza su página en el mismo PR.

## Qué se genera y qué se escribe

| Página | Origen | Si cambia el origen |
|---|---|---|
| [Matriz de permisos](../06-seguridad-y-permisos/matriz-de-permisos.md) | `BUSINESS_PERMISSIONS` (`lib/core/auth/permissions.ts`) | La prueba `wiki.test.ts` falla hasta que se regenere |
| [Mapa de áreas y módulos](../04-modulos/mapa-de-areas-y-modulos.md) | Carpetas de `lib/` | Ídem |
| [Pruebas de arquitectura](../10-pruebas-y-calidad/pruebas-de-arquitectura.md) | Comentario inicial de cada archivo de `tests/architecture/` | Ídem |
| Índice de cada sección (`README.md`) | Las páginas de la carpeta | La prueba falla si una página no figura en su índice |
| Resto | Se escriben a mano | Revisión en el PR |

## Cómo añadir una página

1. Crea el `.md` en la sección que corresponda (`docs/wiki/NN-sección/`). Un título `#` y, al principio, para quién es.
2. Añádela al índice de la sección (`README.md`) y, si es de entrada, a `Home.md` / `_Sidebar.md`.
3. Usa enlaces **relativos** (`../05-datos-y-base-de-datos/prisma-estructura.md`), nunca absolutos.
4. Cita rutas de código entre comillas invertidas y comprueba que existen.
5. Ejecuta `pnpm test` (incluye `tests/architecture/wiki.test.ts`) y `node scripts/wiki-sync.mjs check`.

## Wiki de GitHub (sincronización)

La Wiki de GitHub es un repositorio Git **aparte** (`<repo>.wiki.git`) y plano. `scripts/wiki-sync.mjs` genera desde `docs/wiki/` una copia lista para publicar:

| Comando | Qué hace |
|---|---|
| `node scripts/wiki-sync.mjs check` | Genera en un directorio temporal y valida: sin enlaces rotos, sin `.md` en enlaces internos, todas las páginas alcanzables desde `Home` |
| `node scripts/wiki-sync.mjs build --out DIR` | Genera la wiki en `DIR` para inspeccionarla |
| `node scripts/wiki-sync.mjs publish --remote URL` | **Simulación (dry run)**: clona el remoto, copia lo generado y muestra qué cambiaría; no hace commit ni push |
| `node scripts/wiki-sync.mjs publish --remote URL --confirm` | Publica. Exige además `NEXUS_WIKI_PUBLISH=yes` y que `docs/wiki/` no tenga cambios sin confirmar |

Qué hace la conversión: nombres planos (`04-modulos/mapa.md` → `04-modulos-mapa`; el `README` de una sección es la página de la sección), enlaces entre páginas a nombre de página, enlaces a código u otros documentos del repositorio a URL de GitHub (`blob`/`tree`), se quita el front matter YAML y cada página lleva un pie con su ruta de origen. Las decisiones (`docs/decisions`) y el historial **no** se publican en la wiki; se enlazan al repositorio.

### Estado y permisos necesarios

- **Estado actual: publicada** el 1 nov 2026 en <https://github.com/NexusThrive/nexus-thrive/wiki> (135 páginas, generadas desde `main`). **No hay sincronización automática en CI**: cada vez que cambie `docs/wiki/` hay que volver a sincronizar a mano, con una decisión explícita.
- Requisito (ya cumplido): el repositorio tiene la Wiki activada y una primera página creada desde la interfaz, para que exista `<repo>.wiki.git`.
- Hace falta permiso de escritura en el repositorio. Con HTTPS, un token con acceso de escritura; en una acción de GitHub, `GITHUB_TOKEN` con `contents: write`. Con credenciales de escritura locales (HTTPS) la publicación del 1 nov funcionó sin más.
- El token de `gh` de este entorno no puede subir archivos de workflows; un workflow nuevo se añade a mano o desde la interfaz.
- La rama de la wiki suele llamarse `master`; el script usa la rama que traiga el clon.
- Nunca se edita en la Wiki de GitHub: el siguiente `publish` sobrescribe esos cambios.
- El clon temporal que usa `publish` no tiene identidad de Git: al publicar hay que definir `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME` y `GIT_COMMITTER_EMAIL` en el entorno de esa ejecución (sin tocar la configuración global).
- Los enlaces a código y documentos fuera de la wiki apuntan a `main`; si se publica desde otra rama, usa `--branch <rama>`.

### Cómo resincronizar

```bash
# 1. Desde una copia de main con docs/wiki al día y sin cambios sin confirmar
node scripts/wiki-sync.mjs publish --remote https://github.com/NexusThrive/nexus-thrive.wiki.git      # simulación
GIT_AUTHOR_NAME=… GIT_AUTHOR_EMAIL=… GIT_COMMITTER_NAME=… GIT_COMMITTER_EMAIL=… \
  NEXUS_WIKI_PUBLISH=yes node scripts/wiki-sync.mjs publish --remote https://github.com/NexusThrive/nexus-thrive.wiki.git --confirm
```
