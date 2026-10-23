# 07 · Problemas y deuda técnica

[← Índice](README.md)

Prioridades: **P0** seguridad/integridad crítica o bloqueo esencial · **P1** impide
usar o mantener bien · **P2** necesario para escalar · **P3** optimización.
"Comprobado" = visto en el código o ejecutado; "Hipótesis" = requiere validación.

## Resumen

| ID | Título | Prioridad | Gravedad | Tipo |
|---|---|---|---|---|
| [SEC-01](security-audit.md#sec-01) | Comodines en el correo del equipo NEXUS | P0 | Crítica | Comprobado (PoC) |
| [SEC-02](security-audit.md#sec-02) | Bootstrap de OWNER en negocio vacío | P0 | Alta | Comprobado (código) |
| [SEC-03](security-audit.md#sec-03) | Autorización solo en layout (17 páginas) | P0 | Alta/Crítica | Hipótesis |
| [SEC-04](security-audit.md#sec-04) | `.env.produccion` versionado | P0 si tiene valores | — | Indeterminado |
| [DATA-01](#data-01) | Flujos de dinero sin transacción; doble cobro de facturas | P1 | Alta | Comprobado (código) |
| [DATA-03](#data-03) | Dos fuentes del esquema de producción | P1 | Alta | Comprobado |
| [SEC-05](security-audit.md#sec-05) | Permisos por rol incompletos | P1 | Media | Comprobado |
| [SEC-06](security-audit.md#sec-06) | Módulos/plan no aplicados en servidor | P1 | Media | Comprobado |
| [SEC-10](security-audit.md#sec-10) | Vinculación por correo sin verificación | P1 | Alta si aplica | Indeterminado |
| [ARCH-01](#arch-01) | `quotes` = suite de construcción | P1 | Media | Comprobado |
| [ARCH-02](#arch-02) | Catálogo de módulos disperso; ruta `/departures` rota | P1 | Media | Comprobado |
| [QA-01](#qa-01) | `tsc` necesita >2 GB; build no reproducible sin Clerk | P1 | Baja | Comprobado |
| [DATA-02](#data-02) | Cobros de membresía duplicados (JSON + `Payment`) | P2 | Media | Comprobado |
| [DATA-04](#data-04) | Restricciones débiles y estados en texto | P2 | Media | Comprobado |
| [SEC-07](security-audit.md#sec-07) | Sin defensa en base de datos (RLS, FK) | P2 | Media | Comprobado |
| [SEC-08](security-audit.md#sec-08) | Retirados conservan archivos | P2 | Media | Comprobado |
| [SEC-09](security-audit.md#sec-09) | SSRF en Presence | P2 | Media | Comprobado |
| [SEC-11](security-audit.md#sec-11) | Sin auditoría dentro del negocio | P2 | Media | Comprobado |
| [ARCH-03](#arch-03) | Duplicados: dos onboardings, dos motores de precios | P2 | Baja | Comprobado |
| [ARCH-04](#arch-04) | Acceso a datos sin capa: `tenant-db.ts` gigante y consultas en páginas | P2 | Media | Resuelto en `app/` (2026-10-23) |
| [ARCH-05](#arch-05) | Modelo de identidad: sin persona, sin selector de negocio, `SUPERADMIN` ambiguo | P2 | Media | Comprobado |
| [ARCH-06](#arch-06) | Sin trabajos programados; escrituras en el render | P2 | Baja | Comprobado |
| [UX-01](#ux-01) | Sin `error.tsx`; "Sin acceso" sin salida | P2 | Baja | Comprobado |
| [SEC-12](security-audit.md#sec-12) | Endurecimientos menores | P3 | Baja | Comprobado |
| [ARCH-07](#arch-07) | Código muerto y documentación dispersa | P3 | Baja | Comprobado |

Los SEC-* se detallan en [security-audit.md](security-audit.md); abajo, el resto
con el formato completo.

---

<a id="data-01"></a>
## DATA-01 · Flujos de dinero sin transacción

| Campo | Contenido |
|---|---|
| Descripción | Cobro, venta, gasto y pago de factura hacen 2–5 escrituras independientes: `Payment` → número de recibo → `cashSessionId` → `CashMovement` (→ stock, → estado de la factura) |
| Evidencia | `app/[tenant]/(app)/finance/actions.ts:57`, `app/[tenant]/(app)/inventory/actions.ts:72`, `lib/business/charge.ts:10`, `lib/business/invoices-db.ts:84` |
| Estado | IMPLEMENTADO sin atomicidad |
| Impacto en negocio | Arqueos de caja que no cuadran, pagos sin número, ventas sin descuento de stock; **dos clics en "Pagar" una factura crean dos cobros** (se lee `ISSUED` y se marca `PAID` al final) |
| Impacto técnico | Imposible garantizar invariantes; reintentos peligrosos |
| Dependencias | Ninguna |
| Riesgo de no corregir | Datos contables incorrectos en negocios reales |
| Recomendación | Un servicio único `money.recordIncome(tx, …)` dentro de `db.transaction`; `UPDATE … WHERE status = 'ISSUED'` y comprobar filas afectadas; stock validado dentro de la transacción |
| Aceptación | Prueba de integración: 2 pagos concurrentes de la misma factura → 1 `Payment`; fallo simulado a mitad → ninguna fila |
| Archivos | `lib/business/{charge,finance-db,invoices-db,products-db}.ts`, `app/[tenant]/(app)/{finance,inventory,billing}/actions.ts` |

<a id="data-02"></a>
## DATA-02 · Cobros de membresía en dos lugares

| Campo | Contenido |
|---|---|
| Evidencia | `Membership.payments` (JSON) y `Payment.membershipId`; ambos se escriben en `memberships/actions.ts:126-160` |
| Impacto | Historial que diverge si se anula un `Payment` |
| Recomendación | `Payment` como única fuente; el JSON se deriva o se elimina con una migración de datos |
| Aceptación | La ficha 360° lee solo `Payment`; prueba de anulación refleja el cambio |
| Prioridad | P2 |

<a id="data-03"></a>
## DATA-03 · Dos fuentes de verdad del esquema de producción

| Campo | Contenido |
|---|---|
| Descripción | Las migraciones de Prisma (`migrations/app`, usadas en CI) y el SQL manual (`docs/prod-sql`, ejecutado a mano en Supabase) evolucionan por separado |
| Evidencia | RLS solo en el SQL manual; `00-ORDEN.md` marca el n.º 5 como **PENDIENTE** y no lista `2026-10-21-alta-en-panel.sql`, `2026-10-21-invitaciones-equipo.sql`, `2026-10-21-reinicio-de-datos.sql`; `scripts/check-prod-sql.sh` solo exige que exista *algún* SQL |
| Impacto | Despliegues que leen columnas inexistentes (el propio `00-ORDEN.md` lo advierte); deriva silenciosa |
| Recomendación | Aplicar en producción las mismas migraciones de Prisma (`prisma db migrate`) desde un paso controlado; el SQL manual solo para datos. Mientras tanto, comparar `pg_dump --schema-only` de producción con una base migrada |
| Aceptación | Diff de esquema vacío entre producción y una base migrada desde cero |
| Prioridad | P1 |

<a id="data-04"></a>
## DATA-04 · Restricciones débiles

| Campo | Contenido |
|---|---|
| Evidencia | 22 tablas con `tenantId` sin FK; FK simples sin `tenantId`; `Customer.accessCode`/`nfcUid` sin unicidad; estados como `String` (`TicketSale.status`, `Invoice.kind`, `StockMovement.kind`…) |
| Recomendación | FK a `Tenant` en todas; índices únicos parciales `(tenantId, accessCode)` y `(tenantId, nfcUid)`; `CHECK` o enums para estados con valores cerrados |
| Aceptación | Migración aplicada; pruebas de integración siguen en verde |
| Prioridad | P2 |

<a id="arch-01"></a>
## ARCH-01 · El módulo `quotes` es la suite de construcción

| Campo | Contenido |
|---|---|
| Evidencia | `lib/navigation/tenant-nav.ts:62-70` (Obras, Cotizaciones, Catálogo APU); recetas de `mechanic`, `tour_guides`, `events`, `carpentry` incluyen `quotes` (`lib/admin-catalogs.ts`) |
| Impacto | Un guía turístico ve "Catálogo APU" y presupuestos de obra; no existe una cotización genérica para otros rubros |
| Recomendación | Separar capacidad `construction` (vertical) de `quotes` (cotización comercial genérica sobre `Product`) |
| Aceptación | Ningún rubro no constructor ve pantallas APU; recetas actualizadas |
| Prioridad | P1 |

<a id="arch-02"></a>
## ARCH-02 · Catálogo de módulos disperso y enlaces rotos

| Campo | Contenido |
|---|---|
| Evidencia | Cinco catálogos ([modules-and-dependencies.md](modules-and-dependencies.md#1-qué-es-hoy-un-módulo)); `/departures` en el menú sin página, y `tourism_agency` tiene registro abierto; `orders` placeholder en la receta de `restaurant` |
| Impacto | Agencias de turismo llegan a un 404; cada módulo nuevo toca 6–8 archivos |
| Recomendación | Registro de capacidades en código ([ADR-0003](decisions/0003-registro-de-capacidades.md)); retirar del menú lo que no tiene página |
| Aceptación | Prueba que recorre `buildTenantNav` para cada rubro y comprueba que cada `href` tiene `page.tsx` |
| Prioridad | P1 |

<a id="arch-03"></a>
## ARCH-03 · Duplicados funcionales

| Duplicado | Evidencia | Recomendación |
|---|---|---|
| Dos wizards de onboarding | `app/onboarding/*`, `app/[tenant]/onboarding/*` | Retirar el clásico (redirigir) |
| Dos motores de precios | `lib/plans/*` (BD) y `lib/pricing/*` (estático + `localStorage`) | Que `/pricing` use `lib/plans` |
| `payments` vs `finance` | `payments/page.tsx` redirige | Quitar `payments` como módulo independiente o definirlo |
| Tres tipos de rol | `TenantRole`, `NexusRole`, `BusinessRole` | Uno, junto a la matriz de permisos |
| Varias copias locales de `requireTenantContext` | `crm/actions.ts`, `memberships/actions.ts`, `finance/actions.ts`… | Usar el helper compartido directamente |

Prioridad P2.

<a id="arch-04"></a>
## ARCH-04 · Acceso a datos sin capa

| Campo | Contenido |
|---|---|
| Evidencia | `lib/tenant-db.ts` (1.563 líneas) y `lib/admin-db.ts` (1.235); páginas y acciones con `db.orm.public.*` directo; tres estilos (`tenantDb.x`, `lib/business/*-db.ts(tenantId, …)`, consultas inline) |
| Impacto | Es fácil olvidar el `tenantId`; difícil saber qué módulo es dueño de qué tabla |
| Recomendación | Repositorios por módulo que reciben un `TenantContext` (no un `tenantId` suelto); regla de lint que prohíba `db.orm` en `app/` |
| Estado (2026-10-23) | Hecho en `app/`: los 42 archivos de la lista (y las transacciones de membresías) pasan por repositorios de `lib/`; ESLint bloquea `@/prisma/db` y `moneyTransaction` en todo `app/` sin excepciones. `lib/tenant/tenant-scope.test.ts` exige `tenantId` en cada consulta a una tabla de negocio fuera del panel CEO. Pendiente: repositorios que reciban `TenantContext` en vez de `tenantId` suelto, y partir `lib/tenant/db.ts` |
| Aceptación | `grep "db.orm" app/` vacío salvo excepciones documentadas |
| Prioridad | P2 |

<a id="arch-05"></a>
## ARCH-05 · Modelo de identidad

| Campo | Contenido |
|---|---|
| Evidencia | `User` es la membresía; no hay entidad persona; onboarding "una cuenta = un negocio" (`app/onboarding/actions.ts:299`) pero invitaciones permiten varios; `/auth/callback` elige el **primer** negocio; `isSuperAdmin` busca `role = SUPERADMIN` en cualquier negocio (`lib/admin-db.ts:469`) |
| Impacto | Bloquea la futura experiencia multiempresa; datos de la persona duplicados y desactualizados |
| Recomendación | [ADR-0002](decisions/0002-identidad-y-membresias.md) |
| Prioridad | P2 |

<a id="arch-06"></a>
## ARCH-06 · Sin trabajos programados

`expireBenefitTrial` escribe durante el render de `app/[tenant]/layout.tsx:51`; los
vencimientos de membresías y avisos se calculan al leer; no hay recordatorios
automáticos. Recomendación: Vercel Cron + endpoint protegido para vencimientos y
recordatorios; quitar escrituras del render. P2.

<a id="ux-01"></a>
## UX-01 · Manejo de errores y salidas

Sin `error.tsx` ni `not-found.tsx` propios: un fallo de base de datos muestra la
pantalla genérica. "Sin acceso" (`app/[tenant]/layout.tsx:100`) no ofrece cerrar
sesión ni ir a tu negocio. P2.

<a id="qa-01"></a>
## QA-01 · Verificación local frágil

`pnpm exec tsc --noEmit` muere por memoria con el heap por defecto de Node 22 (2 GB);
con 8 GB pasa. `pnpm build` y Storybook no se pudieron ejecutar sin claves de
Clerk. Recomendación: `NODE_OPTIONS=--max-old-space-size=…` en el script
`verify`; claves de desarrollo o *keyless mode* documentado para el build local. P1
porque `pnpm verify` es la puerta de `pnpm release`.

<a id="arch-07"></a>
## ARCH-07 · Código muerto y documentación dispersa

`app/page.tsx` nunca se renderiza; `Departure`/`TourBooking` sin uso; visión en
`.docs/` (oculta) y estado en `docs/`, `IDEAS-…md`, `CHANGELOG.md`; skills de Prisma
duplicadas en `.agents/`, `.claude/`, `.cursor/`, `.devin/`. P3.

Siguiente: [target-architecture.md](target-architecture.md).
