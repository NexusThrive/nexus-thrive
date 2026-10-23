# Registro de validación

[← Índice](README.md) · Fecha: 2026-10-22 · Commit `1551e9a` · Node v22.22.0 · pnpm 12.3.4.

Todo se ejecutó en el contenedor de la auditoría. Ninguna prueba tocó servicios
desplegados. La base usada fue un **Postgres 16 local y efímero** creado para
esta auditoría (puerto 55432, datos en un directorio temporal fuera del repo).

| # | Comando | Resultado | Nota |
|---|---|---|---|
| 1 | `git status` | Limpio | Al empezar y después de las pruebas |
| 2 | `pnpm install --frozen-lockfile --ignore-scripts` | OK (15 s) | Sin `postinstall` (`prisma skills sync` escribe en el repo) |
| 3 | `pnpm exec tsc --noEmit` | **Falla**: `JavaScript heap out of memory` a ~2 GB | Límite por defecto de Node 22 |
| 4 | `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit` | **OK** (0 errores) | Ver [QA-01](technical-debt.md#qa-01) |
| 5 | `pnpm lint` | **0 errores, 29 avisos** (27 `no-unused-vars`, 2 `react-hooks/exhaustive-deps`) | — |
| 6 | `pnpm test` | **46 archivos OK, 20 omitidos; 413 pruebas OK, 126 omitidas** | Las omitidas son de integración (sin `TEST_DATABASE_URL`) |
| 7 | `prisma db migrate --db <postgres local>` (tras `CREATE EXTENSION pg_trgm`) | **OK: 33/33 migraciones** | — |
| 8 | Conteo de tablas tras migrar | 71 tablas = 71 modelos del contrato | Ningún modelo falta en las migraciones |
| 9 | Tablas con RLS / políticas tras migrar | 0 / 0 | Contrasta con el SQL manual de producción (36 tablas con RLS) |
| 10 | `pnpm test:integration` (Postgres local) | **19 archivos, 123 pruebas OK** | `check-prod-sql.sh` sin diferencias (HEAD = `origin/main`) |
| 11 | `SELECT 'ana.perez@outlook.com' ILIKE 'ana_perez@outlook.com'` | `true` | Base de SEC-01 |
| 12 | PoC Vitest fuera del repo contra `findStaffByEmail` real | **1/1**: devuelve la ficha ajena | [SEC-01](security-audit.md#sec-01) |
| 13 | `pnpm build` | **No ejecutado** | Requiere claves de Clerk; no hay credenciales |
| 14 | `pnpm build-storybook` | **No ejecutado** | Tiempo; no aporta a la auditoría |
| 15 | Prueba RSC de SEC-03 | **No ejecutada** | Requiere `next dev` con Clerk |
| 16 | Contenido de `.env.produccion` | **No inspeccionado** | La política de la herramienta bloqueó leer valores |

Coherencia de la documentación (revisada a mano):

- Las rutas citadas existen en `app/` (52 `page.tsx`, 7 `route.ts`).
- Los números de línea citados se comprobaron con `grep -n` en `1551e9a`.
- Los diagramas Mermaid reflejan los archivos citados en cada tabla.
- Los enlaces internos apuntan a documentos de esta carpeta.

Cómo reproducir la integración local:

```bash
initdb -D /tmp/pg && pg_ctl -D /tmp/pg -o "-p 55432" start
createdb -p 55432 nexus_test && psql -p 55432 -d nexus_test -c "CREATE EXTENSION pg_trgm;"
export DATABASE_URL=postgresql://postgres@127.0.0.1:55432/nexus_test TEST_DATABASE_URL=$DATABASE_URL
pnpm exec prisma db migrate --db "$DATABASE_URL"
pnpm test:integration
```
