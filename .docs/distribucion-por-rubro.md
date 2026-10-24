---
title: Cómo se distribuye el sistema por rubro
tags: [rubros, modulos, navegacion, arquitectura]
---

# Cómo se distribuye el sistema por rubro

> **Regla corta:** el **módulo** es lo que el negocio tiene encendido; el **rubro**
> decide cuáles vienen encendidos por defecto y cómo se llaman las cosas. Nada
> se oculta con condiciones sueltas en las pantallas: se oculta porque el módulo
> está apagado, y eso lo aplican el menú **y** el servidor.

## 1. Las tres capas

| Capa | Qué decide | Dónde vive |
|---|---|---|
| **Capacidad (módulo)** | Qué pantallas, rutas, operaciones de API y herramientas MCP existen para ese negocio. Se enciende o apaga en Configuración → Módulos y se cobra por plan. | `lib/capabilities/registry.ts` (ADR-0003) |
| **Receta del rubro** | Qué módulos se activan al crear el negocio y el **vocabulario** (Socios, Pacientes, Obras; «Compras de insumos» en restaurante…). | `VERTICAL_RECIPES` en `lib/admin/catalogs.ts` |
| **Permisos del rol** | Quién, dentro del negocio, ve y hace qué (dinero, equipo, gestión). | `lib/business/permissions.ts` |

Cada pantalla pertenece a **un** módulo (su ruta sale del registro), y cada
operación de la API y herramienta MCP declara su `module` y su `permission`. Un
módulo apagado no aparece en el menú, y el servidor responde `module_inactive`
si alguien llama a su ruta o a su API igual.

## 2. Qué rubro enciende qué (por defecto)

Cualquier rubro puede encender cualquier módulo `general` desde Módulos; esto es
solo lo que viene prendido.

| Rubro | crm | bookings | memberships | orders | inventory | purchases | finance | payments | billing | whatsapp | construction |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Gimnasio | ● | ● | ● |  | ● |  | ● | ● |  | ● |  |
| Agencia de Turismo | ● | ● |  |  | ● |  | ● | ● | ● | ● |  |
| Hotel & Posada | ● | ● |  |  | ● |  | ● |  |  |  |  |
| Construcción | ● |  |  |  |  |  | ● |  | ● |  | ● |
| Carpintería | ● |  |  |  | ● | ● | ● |  |  |  | ● |
| Restaurante | ● |  |  | ● | ● | ● | ● | ● |  |  |  |
| Tienda | ● |  |  | ● | ● | ● | ● | ● |  |  |  |
| Belleza & Barbería | ● | ● |  |  | ● |  | ● |  |  | ● |  |
| Salud | ● | ● |  |  |  |  | ● |  |  | ● |  |
| Mecánica | ● | ● |  |  | ● | ● | ● |  |  |  |  |
| Educación | ● | ● | ● |  |  |  | ● |  |  |  |  |
| Inmobiliaria | ● | ● |  |  |  |  | ● |  | ● |  |  |
| Ferretería | ● |  |  | ● | ● | ● | ● |  |  |  |  |
| Náutica | ● | ● |  |  |  |  | ● | ● |  |  |  |
| Guías Turísticos | ● | ● |  |  |  |  | ● |  |  | ● |  |
| Eventos | ● | ● |  |  |  |  | ● |  | ● |  |  |
| Museo | ● | ● |  |  | ● |  | ● | ● | ● | ● |  |

`orders` (Pedidos) sigue en estado planeado. `construction` agrupa la suite de
obras (presupuestos APU, bitácora). `payments` vive dentro de Finanzas cuando
Finanzas está activa.

## 3. Cuándo usar cada mecanismo

| Quiero que… | Uso |
|---|---|
| Una función exista solo para ciertos rubros desde el inicio | Módulo propio y recetas de esos rubros (ej. `purchases`). |
| Una entrada del menú solo aparezca en un rubro | `nav.verticals` de la capacidad (ej. «Taquilla» solo en museo). |
| El mismo módulo diga otra palabra según el rubro | La función `label` del menú o `VerticalTerms` (ej. «Compras de insumos»). |
| Un módulo dependa de otro | Se avisa en su pantalla con una `Alert` y un camino para activarlo (Compras pide «Catálogo e inventario»). No se oculta en silencio. |
| Una opción solo la use quien gestiona | El permiso del rol, no el rubro. |
| Mostrar tipos de ítem distintos (planes, entradas, tours…) | `kindsForVertical` (`lib/business/catalog-kinds.ts`). |

**No** se agregan condiciones `if (vertical === "x")` dentro de componentes para
ocultar cosas: si algo es de un rubro, es de un módulo, un `verticals` del menú
o un término del vocabulario.

## 4. Checklist para un módulo o pantalla nueva

1. ¿A qué módulo pertenece? Si es nuevo, una entrada en el registro (nada más).
2. ¿Qué rubros lo traen encendido? Receta en `catalogs.ts`; el resto lo activa a mano.
3. ¿Qué palabras cambian por rubro? `label`/`VerticalTerms`, no textos duplicados.
4. ¿De qué módulos depende? Avisar y guiar en la pantalla.
5. ¿Quién puede usarlo? Un permiso de `permissions.ts`, también en la API.
6. ¿Perfil individual (sin equipo)? Si es de equipo, `TEAM_HEAVY_MODULES` en `lib/onboarding/presets.ts`.
7. API, MCP y webhooks: la operación declara `module` y `permission` (el motor ya aplica ambos).
8. Una historia de Storybook por estado (vacío, con datos, error) y prueba de accesibilidad.

## 5. Decisiones abiertas

- **Precio de «Compras»**: hoy `priceUsd: 0` y estado `BETA` (decisión comercial).
- **Rubros con tienda anexa** (gimnasio, museo, belleza) no traen Compras por defecto; se activa a mano.
- **Perfil individual** no incluye Compras (se considera de equipo).
