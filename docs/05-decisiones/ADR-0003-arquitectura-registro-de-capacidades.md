# ADR-0003 · Registro de capacidades en código y entitlements en servidor

- **Estado:** Aceptada en parte · implementada el 2026-10-23 (registro en
  `lib/capabilities/registry.ts`, `ModuleName` como texto validado, suite
  `construction` separada de `quotes`). Pendiente: `requireCapability(ctx, id)`
  (hoy la puerta es `modulesForRoute`, que ya sale del registro), el estado
  *configurado* y los "primeros pasos" por capacidad.

## Contexto

El catálogo de módulos vive en cinco lugares y no se aplica en el servidor
(SEC-06, ARCH-02). `quotes` agrupa la suite de construcción (ARCH-01).

## Decisión

Cada capacidad declara en `lib/capabilities/registry.ts` (un archivo; se partirá en `<id>/definition.ts` si crece): id, nombre,
rutas, ítems de menú (con condición de rubro), permisos que define, capacidades de
las que depende, estado (READY/BETA/PLANNED) y "primeros pasos". Un registro
exporta todas. De él se derivan: menú, onboarding, precios por defecto, validación
de `TenantModule.moduleName` y la puerta `requireCapability(ctx, id)` usada por
páginas y acciones. `ModuleSetting` queda para precio y textos editables.

Estados por organización: *disponible* (preset del rubro) → *contratado* (plan) →
*habilitado* (`TenantModule.active`) → *configurado* (`configuredAt`).

## Alternativas

Seguir con el enum + tablas (sin cambios); mover todo a la base de datos (pierde
tipado y acopla despliegues a datos).

## Consecuencias

Migrar `ModuleName` de enum a texto validado; separar `construction` de `quotes`;
pruebas que comprueban que cada `href` del menú tiene página.
