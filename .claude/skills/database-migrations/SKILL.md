---
name: database-migrations
description: Cambia el esquema de Prisma 8/PostgreSQL con migraciones reversibles, RLS y aislamiento multiempresa verificado.
metadata:
  opencode/autoinvoke: true
---

# Migraciones de base de datos

## Antes de tocar el contrato

1. Lee `references/contract.md` y `references/migrations.md` del skill
   `prisma-8` (en `.claude/skills` o `.agents/skills`).
2. Identifica el contrato real (`prisma/contract.prisma`) y las migraciones
   existentes. No inventes APIs de Prisma 8.
3. Define el cambio mínimo y su reversibilidad.

## Reglas del proyecto

- Toda tabla multiempresa lleva RLS; el CI falla si falta.
- No se desactiva RLS para "hacer pasar" una prueba.
- Migración compatible hacia atrás cuando haya datos en producción.
- Índices justificados por consultas reales, no por intuición.
- No borrar datos sin respaldo ni plan de rollback documentado.

## Verificación

```bash
pnpm exec prisma contract emit
pnpm exec prisma db migrate --db "$DATABASE_URL"
pnpm test:integration   # requiere TEST_DATABASE_URL
```

Comprobación de RLS (la misma del CI):

```sql
select tablename from pg_tables
where schemaname = 'public' and not rowsecurity;
```

Debe devolver vacío.

## Entrega

Cambio de contrato + migración + pruebas + nota de rollback en el ADR. Si el
cambio afecta producción, requiere PR y aprobación humana; nunca se aplica
directamente.
