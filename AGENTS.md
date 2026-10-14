<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Enrutamiento contextual — Antes de actuar

Consultar la documentación pertinente según el tipo de tarea:

- **Queries y operaciones sobre datos** → `references/queries.md` (lectura, escritura, transacciones, agregación, lanes ORM vs SQL builder, eager loading, namespaces).
- **Modificaciones del contrato de datos** → `references/contract.md` (modelos, campos, relaciones, enumera, índices, `prisma.config.ts`, `definePrismaConfig`, `contract emit`).
- **Migraciones y planificación** → `references/migrations.md` (`db update`, `migration plan`, `MIGRATION.HASH_MISMATCH`, `MIGRATION.UNFILLED_PLACEHOLDER`, ref management).
- **Wiring runtime (`db.ts`)** → `references/runtime.md` (`db.ts`, middleware, `DATABASE_URL`, `.env`, connection pool, transacciones, serverless).
- **Depuración de errores** → `references/debug.md` (códigos estructurados: `MIGRATION.HASH_MISMATCH`, `RUNTIME.TEMPORAL_UNAVAILABLE`, `BUDGET.ROWS_EXCEEDED`).
- **Pruebas y TDD** → `vitest.config.mts` + `lib/**/*.test.ts`; `pnpm test` y `pnpm test:integration` (requiere `TEST_DATABASE_URL`).

**Regla:** No escribir código ni emitir juicios sobre el comportamiento del sistema sin antes consultar la referencia correspondiente. Si la tarea no encaja en categorías anteriores, preguntar al usuario qué documentación consulta o qué objetivo persigue.

## Cierre de sesión y memoria persistente

Al finalizar una sesión significativa:

1. **Llamar a `mem_session_summary`** (MCP Engram) con la estructura:
   - **Goal**: ¿Qué se trabajaba en esta sesión?
   - **Instructions**: Preferencias o restricciones descubiertas.
   - **Discoveries**: Hallazgos técnicos, *gotchas*, aprendajes no obvios.
   - **Accomplished**: Elementos completados con detalles clave.
   - **Next Steps**: Queda pendiente para la próxima sesión.
   - **Relevant Files**: Archivos modificados o importantes.

2. **Registrar en `registro.md`** (opcional): Un log cronológico `## [YYYY-MM-DD] tipo | descripción` del cierre de sesión.

**Sin esto, la próxima sesión empieza ciego — Engram no conserva el contexto del turno anterior sin resumen explícito.**
