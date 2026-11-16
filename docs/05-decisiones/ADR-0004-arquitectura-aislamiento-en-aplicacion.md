# ADR-0004 · Aislamiento en la aplicación + defensas mínimas en base

- **Estado:** Propuesta · 2026-10-22

## Contexto

La app usa un rol privilegiado; no hay políticas RLS (SEC-07). El aislamiento
descansa en recordar `tenantId` en cada consulta; 17 páginas no validan membresía
(SEC-03).

## Decisión

1. Puerta obligatoria: `requireTenantContext` (acciones) y `requirePageContext`
   (páginas), y repositorios que reciben el contexto.
2. FK a `Tenant` en todas las tablas con `tenantId` y FK compuestas
   `(tenantId, id)` en relaciones de dinero y clientes.
3. RLS activada **sin políticas** en todas las tablas para cerrar la API REST de
   Supabase; la clave `anon` no se usa.
4. Pruebas de arquitectura que fallan si una página o acción no pasa por la puerta.

## Alternativas

RLS completa con `SET app.tenant_id` por transacción: más defensa, pero exige
envolver cada consulta en una transacción con contexto y un rol no privilegiado;
reconsiderar cuando la capa de repositorios exista.

## Consecuencias

Cambio mecánico en páginas; migraciones de FK con verificación previa de datos
huérfanos.
