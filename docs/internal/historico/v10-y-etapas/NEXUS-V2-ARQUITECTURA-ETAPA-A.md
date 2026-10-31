# NEXUS THRIVE V2 — Etapa A: diagnóstico, arquitectura objetivo y plan

Fecha: 2026-10-30 · Rama de lectura: `chore/HU-integracion-rubros-restaurante-01` (main + #122 + #123) · No se modificó el repo.

Clasificación usada: **[OK]** implementado · **[PARCIAL]** · **[REORG]** existe pero mal ubicado · **[RIESGO]** · **[PROPUESTO]** · **[NO ENCONTRADO]** · **[VALIDAR]**

## 1. Diagnóstico (medido en el código)

### Stack (leído de `package.json`)
Next 16.3.8 · React 19.2.8 · **Prisma 8.0.0-rc.20 (candidata, no estable)** · Clerk 7.9 · Vitest 5 · Playwright 1.64 · Zod 4 · pnpm workspace (`packages/brand`).
`prisma/contract.prisma`: un solo archivo, 3 408 líneas, 118 modelos.

### Hallazgos

| # | Hallazgo | Estado |
|---|---|---|
| H1 | **El Core depende de un rubro.** `lib/tenant/db.ts` importa 8 fábricas de `lib/construction/*` (12 imports desde `tenant/`). `createTenantDb` es el punto de entrada de datos de todo el sistema, así que Core → Industry ya existe. | [REORG] [RIESGO] |
| H2 | **Rubro depende de rubro.** `lib/business/gym-db.ts` importa `escapeLike` de `lib/construction/shared`. Utilidad genérica alojada en un rubro. | [REORG] |
| H3 | **Aislamiento por tenant solo en la aplicación.** Cada consulta lleva `tenantId` vía `createTenantDb(tenantId)`. RLS está activado en las 118 tablas **sin políticas**: el propio SQL (`2026-10-23-restricciones-negocio-y-rls.sql`) dice que cierra la API REST de Supabase y que la app entra con el rol dueño, que no está sujeto a RLS. Un olvido de `where tenantId` en código no lo frena la base. | [PARCIAL] [RIESGO] |
| H4 | `eslint.config.mjs` prohíbe `@/prisma/db` en `app/` (ARCH-04) pero `app/` importa `createTenantDb` directamente (21+7 imports). Si ese objeto expone `db.orm` crudo, la regla se elude. | [VALIDAR] |
| H5 | **El rubro ya es configuración, no código.** `VERTICALS` tiene 18 valores, incluido `general`. `VERTICAL_RECIPES` asigna módulos y vocabulario por rubro. `lib/capabilities/registry.ts` es el registro único de módulos (`base` / `specialized`) y `TenantModule` separa «habilitado» de «contratado». Solo 4 rubros tienen código propio: construction, gym, museum (mezclados en `lib/business/`) y, por venir, restaurant. | [OK] |
| H6 | Un tenant tiene **un solo** rubro. Escenario «varios sectores en una organización» no soportado. | [NO ENCONTRADO] |
| H7 | **Facturación detrás de un puerto**: `EInvoicePort` (`lib/einvoice/port.ts`) con sandbox y adaptador HTTP genérico; el propio código dice que el proveedor real se elige en PR-20. Alegra y Siigo aparecen solo en docs como destino de exportación contable. Ningún adaptador concreto. | [PARCIAL] |
| H8 | Operación comercial, facturación y finanzas ya viven en carpetas distintas: `business/` (documentos), `einvoice/`, `finance/`, `accounting/`, `receivables/`, `tax/`, `payments/`. La separación conceptual existe; falta hacerla cumplir. | [OK] [REORG] |
| H9 | Eventos y API: `lib/events` (outbox, firma, SSRF), `lib/operations` (cada operación declarada una vez), `lib/api`, `lib/mcp`. | [OK] |
| H10 | **No hay reglas de dependencia entre carpetas de `lib/`** (no existe `layers.json` ni regla de import por capa). Solo la regla ARCH-04. | [NO ENCONTRADO] |
| H11 | `lib/business/` mezcla caja, cobros, documentos, clientes **y** gym/museo/membresías (8 de 41 archivos); 154 archivos importan de ahí, 32 de ellos de gym/museum/memberships. | [REORG] |
| H12 | 11 comparaciones `vertical ===` fuera del registro (regla F7 del #123 las prohíbe). | [REORG] |
| H13 | Auditoría (`tenant/audit.ts`, `operations/audit.ts`), contexto de tenant (`tenant/context.ts`), pruebas de integración de aislamiento (`*.integration.test.ts`). Falta verificar que haya prueba de acceso cruzado entre tenants por cada repositorio. | [PARCIAL] [VALIDAR] |
| H14 | Prisma 8 RC: D-3 (partir `contract.prisma`) sin comprobar. | [VALIDAR] |

**Corrección al #123:** «~370 archivos» de gimnasio eran ~370 *líneas*. La mudanza del gimnasio es pequeña (6 archivos + 2 pruebas + 32 importadores).

## 2. Arquitectura objetivo

Las 6 capas son **conceptuales**; en disco solo cambia lo que tiene sentido (sección 4).

```
Experience ─────────────────────────────────────────────┐ (UI: lee de todos, nadie la importa)
Industry   construction · gym · museum · restaurant …   │ → puede importar Business, Finance, Core, Foundation
Transversales  Finance · Automation · Insights · Integrations (prestan servicio, no mandan)
Business   CRM · Ventas · Compras · Productos · Inventario · POS · Agenda · Proyectos
Core       Identity · Org · Tenant · Permisos · Terceros · Auditoría · Notificaciones · Archivos · Config · API
Foundation BD, cliente Prisma, colas, utilidades (format, rate-limit, errors)
```

**Reglas de dependencia (se hacen cumplir en CI):**
1. Foundation no importa nada de arriba. Core solo importa Foundation.
2. Business importa Core y Foundation. **Nunca Industry** (regla 7 de tu lista).
3. Finance / Automation / Insights / Integrations importan Core y Foundation; se comunican con Business e Industry **por eventos y puertos**, no por import.
4. Industry importa Business, transversales vía contrato público, Core, Foundation. **Industry no importa Industry.**
5. Experience puede importar contratos públicos de cualquiera; nadie importa Experience.
6. Nadie importa los internos de otro dominio: solo su `index.ts` público.
7. Proveedores externos (Wompi, DIAN/Alegra…) solo dentro de adaptadores de Integrations, detrás de puertos.

**Dónde cae cada carpeta actual (clasificación, sin mover):**

| Capa | Carpetas actuales |
|---|---|
| Foundation | `lib/*.ts` sueltos, `db-errors`, `rate-limit`, `format`, `cn`, `prisma/` |
| Core | `tenant` (sin los repos de construction), `auth`, `admin` (catálogos), `plans`, `usage`, `capabilities`, `operations`, `parties`, `files`, `onboarding`(lógica) |
| Business | `business` (sin gym/museo), `catalog`, `inventory`, `purchasing`, `pos`, `store`, `data-exchange` |
| Finance | `finance`, `accounting`, `tax`, `receivables`, `payments` (dominio) |
| Integrations | `providers`, `einvoice` (adaptadores), `payments` (adaptador Wompi), `google`, `maps`, `api`, `mcp` |
| Automation | `events`, `functions` |
| Insights | `dashboard` (datos), `growth`, `presence` (datos), `ops` (reportes) |
| Industry | `construction`, gym, museo (hoy en `business/`), restaurant (nuevo) |
| Experience | `navigation`, `motion`, `design`, `hooks`, UI de `dashboard`/`presence`, `components/`, `app/` |

## 3. Sector, capacidad, módulo, activación: el modelo

Hoy se mezclan en una sola palabra («rubro»). Se separan así:

| Concepto | Qué es | Dónde vive hoy | Propuesta |
|---|---|---|---|
| **Capacidad** | Función reutilizable (ventas, inventario, facturación) | `CAPABILITIES` (registry) | Se mantiene. Es lo que vende y habilita Nexus |
| **Módulo** | Capacidad instalada en un tenant | `TenantModule` | Se mantiene |
| **Suscripción / derecho de uso** | Qué incluye el plan | `plans/`, `usage/` | Se mantiene; «contratado ≠ habilitado ≠ operativo» ya existe |
| **Permiso** | Qué puede hacer un usuario | `auth/authorization`, `can()` | Se mantiene |
| **Sector** | Paquete de capacidades **especializadas** + vocabulario + preset | `VERTICAL_RECIPES` | Se trata como *preset opcional*, no como requisito |
| **Feature flag** | Activación gradual | onboarding/flags | Se mantiene |

### Respuesta a tu pregunta sobre D-2: negocio general

- `general` ya es un valor de primera clase (`VERTICALS`, `SIGNUP_VERTICALS`). Un negocio que no es gimnasio ni restaurante usa **solo capacidades Business/Finance**, sin ninguna ruta con prefijo.
- Por eso el prefijo (`/restaurant/…`) solo se justifica para pantallas que **no existen fuera de ese sector**. Todo lo demás (ventas, clientes, inventario, facturación, caja) va sin prefijo para cualquiera.
- La clave para un negocio fuera de la lista: **que ningún flujo general requiera rubro.** El rubro solo activa un preset y capacidades extra.
- Varios sectores en un tenant (H6): se resuelve convirtiendo el sector en una activación más (como un módulo), y dejando `vertical` como *preset de arranque*. Es cambio de datos; entra como decisión D-9 y no bloquea el resto.

Escenarios pedidos, contra el modelo: restaurante, gimnasio, constructora y agencia de servicios son posibles. La agencia no necesita sector (usa `general`). Verificado en el registro solo para gym y construction; **restaurante y agencia: [PROPUESTO]**, requieren que Proyectos y Agenda existan como capacidades generales (hoy `projects` está ligado a construction).

## 4. Organización del repositorio

Sin mudar el Core ni Business (154 importadores, un solo `contract.prisma`). Cambios físicos mínimos:

```
lib/
├── (Foundation, Core, Business, Finance, Integrations…  se quedan; clasificados en layers.json)
└── industry/               ← único movimiento físico
    ├── construction/       (hoy lib/construction)
    ├── gym/                (hoy 4 archivos de lib/business)
    ├── museum/             (hoy 2 archivos de lib/business)
    └── restaurant/         (nuevo)
```

Sustituye a `lib/verticals/` del #123 por `lib/industry/` para alinearse con «Nexus Industry». Cada rubro expone un `index.ts` público y un `manifest.ts` (id, capacidades que consume, eventos que emite).
**Dentro del repo `layers.json`** declara la capa de cada carpeta; una regla de lint/prueba lee ese manifiesto y falla si hay un import prohibido. Las violaciones actuales (H1, H2) entran a una lista de excepciones con fecha que solo puede encoger.

## 5. Seguridad y multi-tenancy: qué fortalecer

1. **Políticas RLS reales** (H3): rol de aplicación sin privilegio de dueño + `SET LOCAL app.tenant_id` por transacción + política `tenantId = current_setting(...)`. Es defensa en profundidad; el filtro de código sigue. Riesgo alto (cambia el rol de conexión, afecta transacciones, Prisma 8 RC). Va tras pruebas, nunca en producción sin tu autorización.
2. **Prueba de acceso cruzado por repositorio** (H13): una prueba que, para cada fábrica de `createTenantDb`, comprueba que el tenant B no ve ni escribe datos del A.
3. Cerrar H4: que `app/` no reciba `db.orm` crudo.
4. Distinguir entidades **globales** (Tenant, Plan, catálogos), **organizacionales** (casi todo) y **de sucursal** (por definir: hoy no hay modelo de sucursal; [NO ENCONTRADO] como entidad propia).

## 6. Facturación y finanzas: «Alegra como motor»

Alegra y Siigo son el **referente de producto** (qué debe poder hacer un negocio general), no una dependencia de código. Propuesta:

- **Operación comercial** (cotizar, pedir, vender, comprar): capacidad Business. Documento comercial unificado.
- **Facturación fiscal**: Integrations. `EInvoicePort` ya existe; falta (a) un **registro de proveedores seleccionable por tenant** (`lib/providers/connections` ya guarda conexiones) y (b) el primer adaptador real. Candidatos: Alegra, Siigo u otro proveedor tecnológico autorizado. NEXUS no firma XML ni habla con la DIAN (decisión ya tomada en `port.ts`).
- **Finance**: cartera, recaudos, pagos, tesorería, contabilidad (PUC). Se alimenta por eventos de Business; libro mayor inmutable con compensaciones (nota crédito/contra-asiento), nunca edición.
- **[VALIDAR]** antes de elegir adaptador: si Alegra/Siigo ofrecen API para emitir facturas en nombre de un tercero (reventa/marca blanca) y a qué costo. No lo he verificado; no lo asumo.
- Para igualar a Alegra/Siigo en negocios generales, la brecha a medir es: catálogo, cotización→factura, compras, cartera/cuentas por pagar, bancos y conciliación, retenciones/impuestos, reportes. Varias existen ya (`receivables`, `tax`, `accounting`); la auditoría funcional capacidad por capacidad es un entregable de la Fase 1 del plan.

## 7. Patrones: qué ahora, qué después

| Patrón | Decisión |
|---|---|
| Modular monolith + bounded contexts | **Ahora**: ya es la forma real; se hace cumplir con `layers.json` |
| Ports & adapters | **Ahora** donde hay proveedor externo (facturación, pagos). Ya existe |
| Extension registry | **Ahora**: ya existe (capabilities, operations). Se extiende a Industry (manifest) |
| Domain events + transactional outbox + idempotencia | **Ahora**: existen en `events/`. Obligatorio para Business→Finance |
| Tenant context guard | **Ahora**: reforzar (sección 5) |
| Immutable ledger | **Ahora para dinero** (compensaciones); validar estado actual en `accounting/` |
| DI formal / repositorios abstractos para todo | **Después / no**: ceremonia sin beneficio hoy |
| Microservicios | **No** |

## 8. Plan incremental

| Etapa | Objetivo | Riesgo | Aceptación |
|---|---|---|---|
| **E0** | `layers.json` + regla de lint, con lista de excepciones (H1, H2, H12) | Bajo | CI falla ante un import nuevo prohibido; el conteo de excepciones no sube |
| **E1** | Invertir H1: `createTenantDb` deja de importar construction; los rubros se registran (registro de repositorios de rubro) | Medio (toca el punto de entrada de datos) | Pruebas `tenant/*` y `construction/*` verdes, tipos limpios, 0 cambios de comportamiento |
| **E2** | Mover `escapeLike` a Foundation; gym y museo → `lib/industry/`; construction → `lib/industry/construction` | Medio (32+ importadores) | Mismas pruebas; 0 imports entre rubros |
| **E3** | Prueba de acceso cruzado por repositorio + cerrar H4 | Bajo | Prueba automática en CI |
| **E4** | Verificar D-3 (partir contract.prisma en Prisma 8 RC) y H13 | Bajo (solo investigar) | Informe |
| **E5** | Modelo de sector multi-activación (D-9) y capacidades Proyectos/Agenda generales | Alto (datos) | Aprobación + SQL en `docs/prod-sql` con respaldo |
| **E6** | RLS real con rol sin privilegio | Alto | Autorización explícita; primero en base de prueba |
| **E7** | Registro de proveedores de facturación por tenant + 1.er adaptador | Medio | Prueba de contrato del puerto + sandbox |
| **E8** | Restaurante sobre la nueva estructura (D1–D6 del #122) | Medio | Historias de la fase 0 |

Condición para pasar de E0 a E1: aprobar este documento. Para E5/E6: autorización explícita (tocan datos).

## 9. Decisiones pendientes

- **D-1** No mudar Core/Business ahora (recomendado) · **D-2** prefijo solo para pantallas exclusivas de sector (recomendado) · **D-4** pedido propio de restaurante con evento a ventas (confirmar) · **D-6** reservas de mesa en Agenda compartida (confirmar).
- **D-9 (nueva)** ¿Un negocio puede tener varios sectores activos?
- **D-10 (nueva)** ¿Qué proveedor de facturación va primero (Alegra / Siigo / otro) tras validar la API?
- **D-11 (nueva)** ¿`lib/industry/` en lugar de `lib/verticals/`?
- Pendiente de verificar: H4, H13, D-3, estado del libro contable inmutable, API de Alegra/Siigo.
