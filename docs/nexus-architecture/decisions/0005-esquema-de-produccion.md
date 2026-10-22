# ADR-0005 · Migraciones de Prisma como única fuente del esquema

- **Estado:** Propuesta · 2026-10-22

## Contexto

El CI migra con Prisma; producción se cambia con SQL manual en el editor de
Supabase (`docs/prod-sql`). Ya difieren (RLS) y el orden documentado está
incompleto (DATA-03).

## Decisión

Producción se actualiza con `prisma db migrate` desde un paso controlado (job
manual de GitHub Actions con aprobación, o script local con la URL directa). El SQL
manual queda solo para datos puntuales, versionado aparte. Antes del cambio,
comparar el esquema de producción con una base migrada y escribir una migración
de "reconciliación".

## Alternativas

Mantener SQL manual pero generado desde las migraciones (sigue siendo manual);
usar las migraciones de Supabase CLI (tercera fuente).

## Consecuencias

`scripts/check-prod-sql.sh` y `docs/prod-sql/00-ORDEN.md` se retiran o cambian de
propósito.
