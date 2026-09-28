# Glosario NEXUS — nomenclatura congelada (2026-09-22)

> Referencia corta. Un solo significado por término. No usar sinónimos en
> nombres de variables, rutas, tablas, PRs ni docs. Dónde vive cada cosa:
> `docs/ARQUITECTURA.md`.

## Niveles de producto (de afuera hacia adentro)

| Término | Qué es | ¿El cliente lo ve? | Dónde vive |
|---|---|---|---|
| **NEXUS** | La marca / el sistema completo | Sí — es todo lo que ve | — |
| **CAMPO** | Taxonomía interna (Finance, Services, Productivity…) | **No — nunca se vende ni se menciona** | `CampoModulo` en schema |
| **PLANTILLA** | Conjunto de módulos que resuelven un rubro completo (ej: Gym = clientes+planes+pagos+gastos) | Sí (como "el producto de su rubro") | `Plantilla` + `PlantillaModulo` |
| **MÓDULO** | Producto reutilizable, se activa por organización | Sí — esto es lo que se contrata | `Module` + `OrganizationModule` |
| **COMPONENTE** | Pieza de UI reutilizable | No | `components/` |
| **ENTIDAD** | Modelo de datos (tabla) | No | `packages/prisma/schema/*.prisma` |

## Naturaleza de módulo

| Término | Qué es | Ejemplo |
|---|---|---|
| **CAPA** | Módulo horizontal: sirve a cualquier negocio, se activa suelto | `caja-menor` |
| **VERTICAL** | Módulo de rubro específico; entra como plantilla cuando el rubro coincide | clientes/planes/pagos/gastos (Gym) |

## Identidad y multitenancy

| Término | Qué es |
|---|---|
| **Organization** | El negocio del cliente (una org por negocio) |
| **Member** | Una persona dentro de una org (email global, multi-org) |
| **OrganizationModule** | Activación de un módulo en una org (`ACTIVO`/`SOLICITADO`) |

## Reglas innegociables

1. El **núcleo no conoce módulos verticales**: `identidad.prisma` solo tiene
   Organization/Member/Module/Plantilla/OrganizationModule/PlantillaModulo.
2. Un módulo nace de un **dolor validado** (regla §9), no de listas imaginadas.
3. Un módulo nuevo **nunca re-registra usuarios** (la identidad es global).
4. Nunca se borra: **se anula** (pagos, gastos, movimientos — con motivo).
5. El cliente solo ve **NEXUS y módulos/plantillas**; los campos son plomería interna.