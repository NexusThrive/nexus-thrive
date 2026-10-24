---
title: Un solo sistema: núcleo, perfil y funciones
tags: [rubros, funciones, navegacion, arquitectura, planes]
---

# Un solo sistema: núcleo, perfil y funciones

> NEXUS es **un único sistema operativo para negocios**. No hay aplicaciones
> separadas por rubro ni paquetes de funciones vendidos por sector. El rubro es
> un **perfil**; las funciones son del mismo producto.

## 1. Las tres capas

| Capa | Qué es | Dónde vive |
|---|---|---|
| **1. Núcleo** | Lo que hace que todo sea un solo sistema: usuarios, permisos, clientes y terceros, catálogo, ventas y cobros, inventario, documentos, integraciones (API, MCP, webhooks), reportes. Se comparte; no se duplica por rubro. | `lib/` (tercero único, catálogo maestro, servicio de inventario, `money-service`, registro de operaciones) |
| **2. Perfil del negocio** | El rubro dice qué hace el negocio: vocabulario (Socios, Pacientes, Obras…), qué funciones **empiezan encendidas**, plantillas y el tablero inicial. **Recomienda; no bloquea.** | `VERTICAL_RECIPES` en `lib/admin/catalogs.ts` |
| **3. Funciones y experiencia** | Cada negocio enciende las funciones que necesita, sea cual sea su rubro. El menú muestra lo encendido; el resto se descubre en **Funciones**. | `lib/capabilities/registry.ts` + página `/functions` |

## 2. Reglas definitivas

1. Todos los negocios usan el mismo núcleo y la misma plataforma.
2. El rubro es un perfil de configuración. **No es una frontera**: un gimnasio puede usar obras o inventario y un restaurante, membresías.
3. Las funciones generales y las especializadas (membresías, obras con APU, pedidos de restaurante, taquilla de museo) son del mismo ecosistema y reutilizan el núcleo.
4. **Nada se vende por separado**: ni paquetes por sector ni cobro por desbloquear una función. Todo está incluido en todos los planes.
5. Los planes se diferencian por **uso**: usuarios (1 / 3 / sin límite), clientes (tramos) y, más adelante, consumo (peticiones, almacenamiento). El rubro no cambia el precio.
6. El menú y el inicio son **contextuales**: muestran lo encendido; no una lista infinita. Una función apagada no se oculta del sistema, se descubre en Funciones y en el buscador.
7. Una función que necesita otra **lo explica** («funciona junto con Catálogo e inventario»), no desaparece.
8. Lo común comparte datos: un cliente, un producto, una venta, un documento existen una vez (tercero único, catálogo maestro, servicio de inventario).

## 3. Cómo se siente al usarlo

1. Te registras y dices que eres un gimnasio.
2. NEXUS pone tu vocabulario, tu inicio y **enciende lo que suele servir a un gimnasio**.
3. Clientes, cobros, finanzas y documentos están en el mismo entorno.
4. Si también vendes productos, enciendes Inventario y Compras en **Funciones** (con un clic), sin cambiar de sistema.
5. Sus ventas, existencias, costos y reportes se relacionan solos.

## 4. Qué rubro enciende qué al empezar (sugerencia, no límite)

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

`orders` (Pedidos) sigue planeado. `construction` agrupa la suite de obras (presupuestos APU, bitácora). `payments` vive dentro de Finanzas cuando Finanzas está activa.

## 5. Cuándo usar cada mecanismo

| Quiero que… | Uso |
|---|---|
| Una función nueva exista para todos | Una entrada en el registro; nada más. |
| Un rubro la tenga encendida al empezar | Su receta en `VERTICAL_RECIPES` (sugerencia). |
| Cambiar una palabra por rubro | `VerticalTerms` o la función `label` del menú (ej. «Compras de insumos»). |
| Sugerir una función por lo que el negocio ya hace | Una regla en `lib/functions/suggestions.ts` (ej. compras si hay productos con inventario). |
| Que una función avise que depende de otra | `NEEDS` en `lib/functions/functions.ts` y una `Alert` en su pantalla. |
| Limitar el uso | El plan: usuarios, clientes, consumo. Nunca una función ni un rubro. |
| Que solo gestione quien tiene permiso | El permiso del rol (`permissions.ts`), también en la API y el MCP. |

**No** se agregan condiciones `if (vertical === "x")` dentro de los componentes para ocultar cosas.

## 6. Revisión del estado actual contra esta visión

| Pieza | Estado | Qué se hizo / falta |
|---|---|---|
| Núcleo compartido (tercero único, catálogo maestro, inventario con costo, cobros, API/MCP/webhooks) | **Cumple** | Es el plan de los 30 PR; ya hay 11. |
| Módulos como organización interna del código y del menú | **Cumple** | Se conservan; para la persona son «funciones». |
| `nav` del menú derivado del registro y exigido en el servidor | **Cumple** | Una función apagada no sirve ni su pantalla ni su API. |
| Receta del rubro | **Ajustado** | Era «módulos permitidos»; ahora son «módulos sugeridos». |
| Compatibilidad rubro↔módulo al encender (`checkModuleToggle`) | **Contradecía → corregido** | Ya no bloquea por rubro. |
| Precios por función y factor por rubro | **Contradecía → corregido** | Todas las funciones valen 0 y el factor por rubro es ×1 por defecto. Los precios que ya estén guardados en el panel de planes no se tocan. |
| Planes (Essential/Elite/Signature) | **Ajustado** | Se diferencian por usuarios y clientes; textos actualizados. |
| Descubrir funciones | **Faltaba → hecho** | Página Funciones con «En uso / Te sugerimos / Más funciones». |
| Entrada «Taquilla» que solo ve el museo (`nav.verticals`) | **Contradice (pendiente)** | Plan mínimo: convertirla en la función «Taquilla» (propia), sugerida al museo y encendible por cualquiera; hay que migrar los museos que hoy la ven por tener Reservas. |
| Buscador (Ctrl K) con funciones apagadas | **Pendiente** | Que encuentre también lo apagado y ofrezca encenderlo. |
| Selección de funciones al registrarse (onboarding) | **Funciona, mejorable** | Muestra todas con «Incluido»; las del rubro vienen preseleccionadas. |
| Panel de NEXUS: «Módulos del rubro» | **Pendiente** | Pasar el texto a «Sugeridos por rubro». |

## 7. Secuencia que se sigue

1. **Esta etapa:** regla + Funciones + planes por uso (sin migraciones de datos).
2. PR-11b (traslados y conteos) y PR-12 (importar/exportar) ya con la regla.
3. Después: Taquilla como función propia, buscador con funciones apagadas y panel de NEXUS.
