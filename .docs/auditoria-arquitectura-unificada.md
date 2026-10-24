---
title: Auditoría — NEXUS como plataforma unificada, multiempresa y multiusuario
tags: [arquitectura, auditoria, rubros, multiempresa, planes]
---

# Auditoría de la arquitectura actual contra la visión unificada

Visión: **NEXUS es el sistema; las funciones son opciones; el rubro es contexto, no una restricción.** Una persona administra varias organizaciones y cada organización tiene su equipo, configuración, datos y plan. Este documento compara el código real con esa visión y propone una migración **incremental** (sin reescrituras ni pérdida de datos).

## 1. Qué ya cumple

| Principio | Evidencia en el código |
|---|---|
| Usuario ≠ organización, relación muchos a muchos | `User` es la **membresía**: `@@unique([clerkUserId, tenantId])` (una cuenta de Clerk puede tener una fila por negocio, con su propio rol, estado, tema y nombre). La identidad es solo Clerk; no hay segunda fuente. |
| Permisos dentro del contexto del negocio | `requireTenantContext`/`requirePageContext` resuelven membresía activa por (cuenta, negocio) en el servidor y aplican `can(role, permiso)`. Tabla `permissions.ts` única. |
| Selector de organización | `BusinessSwitcher` + `businessesOfMember`: lista **solo** los negocios donde la cuenta es miembro activo. |
| Equipo por organización | Invitaciones (`TenantInvite`), cambio de rol, retiro; **no se puede dejar al negocio sin dueño** (`activeOwners`), límite de puestos por plan (`seatLimit`). |
| Aislamiento multiempresa | `tenantId` en todo, `@rls`, guarda automática `tenant-scope.test.ts` y borrado de raíz auditado (`deletion.integration.test.ts`). |
| Plan y consumo con ámbito de organización | `Tenant.plan`, `contractedModules`, `maxCustomers`, `UsageCounter` por negocio y mes; los límites de clientes y de usuarios se aplican en el servidor. |
| Núcleo compartido | Tercero único (clientes/proveedores), catálogo maestro, servicio de inventario, `money-service`, registro de operaciones (API/MCP/webhooks). |
| Navegación derivada de capacidades | Menú y guardia del servidor salen del mismo registro (`registry.ts` → `modulesForRoute`): ocultar del menú no es la única barrera. |

## 2. Qué contradecía la visión (y su estado)

| # | Contradicción | Estado |
|---|---|---|
| 1 | **El rubro limitaba funciones**: `VerticalSetting.modules` «lo demás no se ofrece ni se activa» y `checkModuleToggle` rechazaba «no es compatible con el rubro». | **Corregido en este PR**: el rubro solo *sugiere* (`suggestedModules`); cualquier función operativa se puede encender. |
| 2 | **Se cobraba por función y por rubro** (`priceUsd` por módulo, factor de precio por rubro, Signature «módulos −40 %»). | **Corregido en este PR (valores por defecto)**: todas las funciones valen 0, factores ×1; los planes se diferencian por usuarios y tramos de clientes. Los precios ya guardados en el panel de planes no se tocan. |
| 3 | No había dónde **descubrir** funciones apagadas. | **Corregido**: página `Funciones` («En uso / Te sugerimos / Más funciones») con sugerencias por rubro y por uso. |
| 4 | **El rubro es obligatorio y cerrado**: `Tenant.vertical` es un enum requerido de 17 valores, y el registro ofrece solo 6. No existe «general/otro», ni modelo comercial (B2B/B2C), ni actividades. | **Pendiente (Etapa B)**. |
| 5 | **Una cuenta = un negocio en la práctica**: el alta rechaza crear otro negocio (`completedTenantOf`), «Crear otro negocio» abre WhatsApp, y `homeTenantFor` toma «la primera» membresía. El esquema ya lo permite. | **Pendiente (Etapa C)**. |
| 6 | `Taquilla` es una entrada del menú solo para el rubro museo (`nav.verticals`). | **Pendiente (Etapa D)**: convertirla en función propia. |
| 7 | El buscador no encuentra funciones apagadas. | **Pendiente (Etapa D)**. |
| 8 | El panel de NEXUS dice «Módulos que el rubro puede usar». | **Pendiente (Etapa D)**: texto → «Sugeridos». |
| 9 | El **consumo y los límites no se muestran** al negocio (`UsageCounter` solo se aplica a la API). | **Pendiente (Etapa E)**. |

## 3. Qué NO se toca (compatibilidad)

- `Tenant.vertical` **se conserva** (71 archivos lo usan para vocabulario, plantillas e inicio). Pasa a significar «perfil de partida»; no se borra ni se renombra.
- `User` se llama así por historia, pero es la membresía. No se renombra (cientos de referencias); se documenta.
- `TenantModule` sigue siendo la fuente de qué funciones están encendidas. Los negocios existentes conservan exactamente lo que tenían encendido.
- `contractedModules` se conserva, pero ya no limita.

## 4. Migración incremental propuesta

| Etapa | Qué | Datos / migración | Riesgo |
|---|---|---|---|
| **A (hecha)** | Regla: rubro sugiere, todo incluido, planes por uso, página Funciones | Ninguna | Bajo |
| **B** | **Perfil general**: valor `general` («General / Otro») del perfil con receta y vocabulario neutro; campos opcionales `modelos comerciales` (B2B/B2C/B2B2C/híbrido) y `actividad`; editable en Configuración y preguntado (opcional) al registrarse | Añadir un valor al enum y dos columnas con valor por defecto (aditivo) | Bajo-medio (enum) |
| **C** | **Varias organizaciones por cuenta**: permitir crear otro negocio desde el selector; «negocio de inicio» = el último usado; invitaciones a un negocio existente ya funcionan | Ninguna (el esquema ya lo soporta) | Medio (flujo de registro) |
| **D** | Taquilla como función propia (migrando los museos actuales para que no pierdan su menú), buscador con funciones apagadas, textos del panel de NEXUS | Una fila `TenantModule` por museo | Medio |
| **E** | Pantalla de **plan y consumo** (usuarios, clientes, consumo) y límites aplicados con un solo punto central | Ninguna | Bajo |

Cada etapa deja el sistema funcionando, con pruebas, y se puede detener ahí.

## 5. Criterios de aceptación

1. Una organización puede usar NEXUS sin elegir un rubro cerrado (Etapa B).
2. El perfil no bloquea funciones por pertenecer a otra actividad (**cumple desde Etapa A**).
3. Se pueden combinar funciones generales y especializadas (**cumple**).
4. Lo compartido reutiliza modelos comunes (**cumple**: tercero, catálogo, inventario, cobros).
5. Menú y buscador se adaptan a lo usado (menú **cumple**; buscador, Etapa D).
6. Una persona gestiona varios negocios sin volver a autenticarse (selector **cumple**; crear otro, Etapa C).
7. Ninguna cuenta ve datos de otro negocio cambiando identificadores (**cumple y está probado**: aislamiento por `tenantId` en cada consulta, RLS y pruebas con dos negocios en cada PR).
