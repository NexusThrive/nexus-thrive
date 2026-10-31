# V10 · M4 — Platform: resultados

Ejecutado en la rama local `chore/HU-esquema-prisma-modular-01`, a partir de `c5b6502` y bajo la autorización de M4 (2026-10-31). Sin push, PR, merge ni despliegue.
**Solo M4.** M5–M8, `SectorView`, D-V10-9, `hasMemberAccess()`, la auditoría (M6), `tenant/db.ts`, `lib/construction`, el enum de Prisma y las migraciones no se tocaron.
Fuente de las decisiones: [`V10-decisiones.md`](../decisions/V10-decisiones.md).

## 1. Resumen ejecutivo

`platform` pasa de dos carpetas mezcladas (`lib/ops`, 25 archivos, y `lib/admin`, 6 archivos de los que 4 eran administración) a **nueve módulos** en `lib/platform/`, con un grafo interno sin ciclos, y se **vaciaron** `lib/ops` y `lib/benefits`. Antes de mover hubo que resolver tres dependencias que habrían violado la matriz: `withinLimit` (Business importaba el programa de beneficios), `todayBogota` (tres páginas de los negocios importaban Operaciones por un helper de fecha) y `AuditAction` (Core importaba la administración de la plataforma). Se resolvieron sin cambiar comportamiento ni contratos. **48 archivos movidos, 0 cambios de exportaciones públicas salvo las dos funciones retiradas a propósito, 0 excepciones, 0 ciclos nuevos, contrato público y Prisma intactos.**

## 2. Estructura anterior y nueva

| Antes | Ahora |
|---|---|
| `lib/ops/` (25 archivos + 12 pruebas): equipo, cobranza, comercial, soporte, bandeja, cuentas, salud, presencia, validadores | `lib/platform/{team,billing,crm,support,inbox,accounts,presence}/` |
| `lib/admin/db.ts`, `users-db.ts`, `account-limits.ts`, `audit-labels.ts` (+2 pruebas) | `lib/platform/admin/` |
| `lib/admin/catalogs.ts`, `lib/admin/vertical-icons.ts` | **Se quedan en `lib/admin/`** (ver §4) |
| `lib/benefits/` (3 archivos + 2 pruebas) | `lib/platform/benefits/` |
| `withinLimit` dentro de `benefits.ts` | `lib/foundation/limits.ts` |
| `todayBogota` dentro de `ops/leads.ts` | retirada; los usos pasan a `bogotaDay()` de `lib/plain-date.ts` |

## 3. Módulos y archivos movidos

| Módulo | Archivos de producción | Pruebas que viajan | Por qué es un módulo (V10 §5.1) | Commit |
|---|---|---|---|---|
| `platform/benefits` | `benefits`, `benefits-db`, `benefit-cookie` | 2 | Programa comercial de códigos de acceso de Nexus | `0de8609` |
| `platform/admin` | `db` (`createAdminDb`), `users-db`, `account-limits`, `audit-labels` | 2 | Administración de la plataforma por superadmin | `a39abba` |
| `platform/team` | `access`, `permissions`, `team`, `audit`, `nav`, `validators` | 5 | Acceso, permisos y equipo del Operations Center; se importan entre sí | `2473f99` |
| `platform/crm` | `leads`, `crm-rules` | 1 | Embudo comercial | `f2393ed` |
| `platform/billing` | `billing`, `billing-rules` | 1 | Cobranza de las suscripciones de Nexus | `d98f878` |
| `platform/support` | `tickets`, `support-rules`, `satisfaction`, `satisfaction-rules` | 2 | Soporte y satisfacción | `aded2bc` |
| `platform/inbox` | `inbox`, `inbox-rules`, `inbox-providers` | 1 | Bandeja de conversaciones | `2491db3` |
| `platform/accounts` | `accounts`, `account-stages`, `onboarding-board`, `onboarding-checklist`, `health`, `health-rules`, `work-priorities` | 2 | Seguimiento de la cuenta del cliente; es la cima del grafo | `b01c604` |
| `platform/presence` | `presence` | 0 | Vista del panel sobre la presencia de cada negocio (166 líneas) | `0116c51` |
| **Total** | **32** | **16** | | **48 movimientos** (34 sin ninguna línea cambiada, 14 con solo rutas) |

## 4. Justificación y lo que no se movió

- **Nueve módulos, no seis.** El diseño nombraba `billing`, `support`, `crm`, `inbox`, `team` y `health`. El grafo real mostró que `health` y `work-priorities` son agregadores que leen las demás áreas y comparten con `accounts` y `onboarding-*` el objeto «cuenta»; un módulo `health` de dos archivos habría sido artificial. Además faltaban `admin`, `benefits` y `presence`, que sí son responsabilidades reales.
- **`validators.ts` va en `team`** porque `validateRole` usa los permisos. `validateContact` (que es de cuentas) se queda en el archivo para no partirlo.
- **`lib/admin/catalogs.ts` y `vertical-icons.ts` no son administración de la plataforma** (medios de pago y reglas de slug; íconos de sector). Sus destinos pertenecen a otras etapas (slug → Core en M6d; íconos → experiencia); no se movieron.
- **`createAdminDb` incluye `createTenant`**, que es aprovisionamiento de negocios. Se mantuvo dentro de `platform/admin` porque moverlo cambiaría quién puede crear negocios y es una decisión de Core no autorizada; queda anotado como opción futura.

## 5. `withinLimit` (`e32f894`)

Pasó de `lib/benefits/benefits.ts` a **`lib/foundation/limits.ts`** (sin imports de Nexus). Se actualizaron sus tres usuarios (`customers-db`, `exchange-db` y `crm/actions`) y su prueba se movió a `lib/foundation/limits.test.ts` con las mismas aserciones. La única diferencia de exportaciones de `benefits.ts` es esa función. Ningún módulo de Business ni de Core importa ya el programa de beneficios (lo comprueba una prueba).

## 6. `benefits-db`, `getTenantAccess`, `expireBenefitTrial` y `benefit-cookie.ts`

Decididos uno por uno (detalle en `V10-decisiones.md` §2.2, «Resolución en M4»):

| Componente | Decisión | Razón |
|---|---|---|
| `benefits-db.ts` | `platform/benefits` | Programa comercial de Nexus; usa `createAdminDb` (solo para auditar el canje) |
| `getTenantAccess`, `expireBenefitTrial` | **Se quedan en `benefits-db.ts`** | Dependen solo de Core, pero leen y escriben los datos de canje del módulo; sus consumidores son puntos de entrada (layout y ajustes del negocio). Separarlas exigiría partir el archivo y llevar `benefits.ts` a Core |
| `benefit-cookie.ts` | `platform/benefits` | Solo lo usan el alta y `/c/[code]`; depende de los dos archivos hermanos |

**Consecuencia y decisión de cierre.** El criterio de aceptación del diseño decía «ningún negocio (`app/[tenant]`) importa platform». Con esta decisión **tres referencias** de `app/[tenant]` importan `platform/benefits/benefits-db` (layout, ajustes y un tipo). La matriz lo permite (experiencia → platform) y una prueba fija que son exactamente esas tres. **El dueño adoptó la opción A al cierre de M4** (`V10-decisiones.md` §6, C-2): se mantienen las tres referencias, no se mueve ninguna función y el criterio de aceptación del diseño se **aclaró** (dependencias entre módulos frente a dependencias legítimas de Experience hacia Platform). El módulo de acceso del negocio en Core queda descartado por ahora. `todayBogota` sí se resolvió: las páginas de los negocios ya no importan Operaciones.

## 7. `createAdminDb` y composición

- **Ubicación:** `lib/platform/admin/db.ts` (1 256 líneas).
- **Qué es:** el repositorio del superadmin (métricas, negocios, módulos, auditoría del panel, alta de negocios).
- **Consumidores finales:** `app/admin` (13 archivos), `app/` fuera de admin (1), pruebas (42, la usan para crear negocios de prueba) y 4 archivos de `platform` (`benefits-db`, `billing`, `team/access`, `team/audit`). **Ningún módulo de Core, Business, Finance ni Experience de `lib/`.**
- **Composición:** no es un punto de composición. El alta de un negocio entra por el puerto `tenant-provisioning` conectado en `lib/runtime`; `lib/runtime` sigue siendo la única raíz y no se tocó.
- **Dependencia de Core hacia Platform evitada:** `lib/tenant/audit.ts` (Core) importaba `AuditAction` de `admin/db.ts`. Ahora Core define `TenantAuditAction` (las 38 acciones `BIZ_*`, movidas tal cual) y `AuditAction` en `admin/db.ts` lo compone con las 32 del panel (`6053359`). Comprobado: las 70 acciones son las mismas y las exportaciones de ambos archivos no cambian. No se tocó ningún escritor (P-9).

## 8. Dependencias

**Entre módulos de platform (exactamente ocho, fijadas por una prueba):** `accounts → billing, crm, inbox, support`; `inbox → support`; `billing → admin`; `team → admin`; `benefits → admin`. `accounts` es la cima y `admin` la base; sin ciclos.

**Salientes de platform hacia fuera:** `admin` → capacidades, sectores (Core), `format`, `sql-like`, `onboarding/types`, `tenant`; `benefits` → capacidades, sectores, `plans`, `onboarding/types`; `team` → `auth`, `navigation`; `support` → `app-url`; `accounts`/`billing` → `plain-date`; `presence` → `lib/presence` (business). Todas hacia áreas permitidas.

**Entrantes:** casi todas desde `app/admin` y rutas de entrada; los negocios (`app/[tenant]`) solo importan `benefits-db` (tres referencias); ningún módulo de `lib/` fuera de platform, experience y runtime importa platform (0 violaciones en `check:layers` y una prueba propia).

Matriz real de `platform` (archivo → archivo): → `foundation` 21, → `core` 15, → `business` 2.

## 9. Commits (14, todos locales)

| Commit | Alcance |
|---|---|
| `e32f894` | `withinLimit` → Foundation |
| `d9f7c6a` | `todayBogota` → `bogotaDay()` (10 usos) |
| `6053359` | Core define `TenantAuditAction`; la plataforma compone `AuditAction` |
| `0de8609` | `platform/benefits` |
| `a39abba` | `platform/admin` |
| `2473f99` | `platform/team` |
| `f2393ed` | `platform/crm` |
| `d98f878` | `platform/billing` |
| `aded2bc` | `platform/support` |
| `2491db3` | `platform/inbox` |
| `b01c604` | `platform/accounts` |
| `0116c51` | `platform/presence` y fin de `lib/ops` |
| `ac71d60` | Corrección: tres referencias que no entraron en sus commits (ver §14) |
| `d72b30f` | Pruebas de la estructura final de platform |

## 10. Archivos modificados y referencias

187 archivos tocados (572 inserciones, 344 eliminaciones): 48 renombrados (34 sin cambios de contenido), 3 nuevos (`limits.ts`, `limits.test.ts`, `v10-platform.test.ts`) y 136 modificados. Referencias reescritas por el codemod determinista en los 9 movimientos de módulo: **142 archivos únicos, 238 importaciones absolutas, 62 relativas y 16 rutas literales**, más las ediciones a mano de los tres pasos previos (5, 10 y 2 archivos). Se cubrieron importaciones estáticas, relativas, dinámicas, reexportaciones, `vi.mock`, rutas literales en comentarios y pruebas, y `scripts/staff-seed-sql.mjs`. No hay copias ni reexportaciones en las rutas antiguas. Se retiraron las unidades `lib/ops` y `lib/benefits` de `layers.json`; no se añadió ninguna.

## 11. Resultados reales de las verificaciones

| Verificación | Línea base (HEAD de M3 revisado, `c5b6502`) | Final de M4 |
|---|---|---|
| `pnpm verify` | verde | **verde**, también tras cada una de las 12 etapas |
| Pruebas unitarias | 114 archivos / 1 725 pasan (407 omitidas = integración) | **116 archivos / 1 747 pasan** (407 omitidas) |
| Pruebas de integración (base desechable propia) | 66 archivos / 413 pasan | **66 archivos / 413 pasan** |
| `check:layers` | 289 archivos, 0 excepciones | **290 archivos**, 0 violaciones, 0 sin clasificar, 0 incoherentes, **0 huérfanas**, 0 excepciones (tope 0) |
| Exportaciones (32 archivos de producción, 299) | — | idénticas, salvo `withinLimit` (benefits.ts) y `todayBogota` (leads.ts), retiradas a propósito |
| 15 operaciones + OpenAPI | idénticas | **idénticas byte a byte**, comprobado tras cada etapa |
| Siete puertos | conectados | **conectados** (`e5-puertos` y `v10-composicion` pasan) |
| Prisma y `migrations/` | sin cambios | **`git diff c5b6502..HEAD` vacío** |
| Rutas antiguas | — | 0 referencias a `lib/ops/`, `lib/benefits/` ni a los cuatro archivos movidos de `lib/admin/` en código ni configuración |

Pruebas nuevas: 20 de arquitectura (`v10-platform.test.ts`), 1 de `withinLimit`, 2 de equivalencia de `bogotaDay()` con la fórmula anterior. Una prueba existente tuvo que ajustarse: `lib/tenant/tenant-scope.test.ts` excluía `lib/ops/` y `lib/admin/` (el panel opera entre negocios a propósito); ahora excluye las ocho carpetas de `lib/platform/` que son ese panel y **sigue vigilando `benefits`**. No se debilitó ninguna aserción.

## 12. Ciclos antes y después

| | Antes | Después |
|---|---|---|
| Ciclos de valores | 0 | **0** |
| Ciclos de solo tipos (tope 3) | `auth/permissions ⇄ roles`, `sales/money-service ⇄ inventory/stock-service`, `dashboard/chart-catalog ⇄ layout` | **los mismos 3** |
| Ciclos entre módulos de platform | n/a | **0** |

## 13. Prisma y migraciones

Sin cambios: `git status` y `git diff c5b6502..HEAD` vacíos en `prisma/` y `migrations/`; `enum Vertical` intacto; ninguna consulta contra bases reales (contenedor PostgreSQL desechable propio, eliminado al terminar; `nexus-postgres` y `nx-pg` no se tocaron).

## 14. Riesgos y pendientes

1. **Limitación del historial: nueve commits intermedios no compilan por separado (conservados por decisión del dueño, C-1).** Ver §14.1 abajo.
2. **Criterio de aceptación aclarado:** las tres referencias de `app/[tenant]` a `benefits-db` se mantienen (opción A, C-2); ver §6.
3. **`createTenant` dentro de `platform/admin`:** es aprovisionamiento; moverlo a Core es una decisión futura.
4. **`validators.ts` mezcla** `validateContact` (cuentas) con los de equipo; partirlo es una pasada futura.
5. **Documentación viva con rutas antiguas** (pasada documental independiente, P-12): `docs/wiki/10-pruebas-y-calidad/pruebas.md`, `docs/PENDIENTES.md`, `docs/nexus-architecture/*`, `docs/product/contexto-dominio.md`, `.docs/…`, dos scripts SQL de producción (`docs/prod-sql/*`, no se tocan) y un comentario en `prisma/schema/core/team.prisma` (Prisma no se modifica).
6. **Ramas paralelas:** cualquier rama que importe `@/lib/ops/…`, `@/lib/benefits/…` o `@/lib/admin/db` tendrá que reaplicar el codemod; `integracion/local-revision` sigue sin integrarse (P-13).
7. **Trabajo independiente fuera de V10, registrado y no iniciado (C-3):** auditoría de aislamiento por negocio y revisión de las guardas de `app/admin`. La prueba `lib/tenant/tenant-scope.test.ts` se mantiene sin debilitar. Alcance anotado en `V10-decisiones.md` §6.

### 14.1 Limitación del historial: commits que no compilan por separado

**Qué pasó.** Por un `git add` incompleto (`app lib tests` sin `components/` ni `scripts/`), dos commits dejaron fuera referencias que el codemod sí había reescrito en el árbol de trabajo. Por eso `pnpm verify` pasaba en cada paso y los commits, sin embargo, no eran autosuficientes.

| Commit | Módulo | `tsc` en árbol limpio | Referencia que falta (la trae `ac71d60`) |
|---|---|---|---|
| `0de8609` | benefits | 1 error | `components/organisms/onboarding/benefit-card.tsx` |
| `a39abba` | admin | 1 error | la misma |
| `2473f99` | team | 2 errores + 1 script roto | además `components/organisms/app-sidebar.stories.tsx` y `scripts/staff-seed-sql.mjs` |
| `f2393ed`, `d98f878`, `aded2bc`, `2491db3`, `b01c604`, `0116c51` | crm, billing, support, inbox, accounts, presence | 2 errores + 1 script roto cada uno | las tres |

`ac71d60` cambia solo esas tres rutas (4 líneas, más un comentario); desde `ac71d60` hasta HEAD todo compila y no quedan referencias rotas. Los commits de M3 y los tres primeros de M4 (`e32f894`, `d9f7c6a`, `6053359`) compilan por separado. **El historial se conserva tal cual (decisión C-1); no se reescribe ni se reorganiza.**

**Consecuencias.**

- **`git bisect`.** Un bisect que cruce el rango `0de8609`…`0116c51` y use `tsc`, las pruebas o el build como criterio verá un fallo falso en esos nueve commits. Recomendación: marcarlos con `git bisect skip` (o fijar los extremos `good`/`bad` fuera del rango). Los commits `c5b6502` (antes de M4) y `ac71d60` en adelante son seguros como extremos.
- **`git revert` individual.** Revertir un módulo de esos nueve **no es autosuficiente en dos casos**: `benefits` (`0de8609`) deja `benefit-card.tsx` apuntando a la ruta nueva, y `team` (`2473f99`) deja así `app-sidebar.stories.tsx` y `scripts/staff-seed-sql.mjs`; en ambos casos hay que revertir también el fragmento correspondiente de `ac71d60`. El resto de los módulos (admin, crm, billing, support, inbox, accounts, presence) no depende del contenido de `ac71d60`. Siempre en orden inverso (el más reciente primero), porque `accounts` depende de `billing`, `crm`, `inbox` y `support`, y `billing`, `team` y `benefits` dependen de `admin`.
- **Revertir todo M4** (el rango `e32f894`…`d72b30f`) en orden inverso no tiene este problema.
- **Estado de la comprobación.** La compilación por commit se verificó con `tsc` y una búsqueda de referencias rotas sobre copias extraídas de cada commit. Los `git revert` descritos **no se han ejecutado** (son consecuencia del análisis, **no probada** en un revert real).

**Prevención.** En lo sucesivo, cada commit de movimiento se hace con `git add -A` completo y se comprueba que el árbol compila antes de confirmar.

## 15. Diferencias respecto del plan original

| Plan (`V10-arquitectura-fisica.md` M4) | Realidad | Por qué |
|---|---|---|
| `platform/{billing,support,crm,inbox,team,health}` | Nueve módulos: se añaden `admin`, `benefits`, `presence`; `health` se funde en `accounts` | Responsabilidades reales y grafo medido |
| Criterio «ningún `app/[tenant]` importa platform» | Tres referencias a `benefits-db`, fijadas por una prueba. **Criterio aclarado** al cierre (opción A) | Ver §6 y `V10-arquitectura-fisica.md` §4.1 |
| Solo mover | Además: `withinLimit`, `todayBogota` y la inversión de `AuditAction` | Prerrequisitos para no violar la matriz (ver §1) |
| Dependencias de `admin` | `catalogs.ts` y `vertical-icons.ts` se quedan en `lib/admin/` | No son administración de la plataforma |

## 16. Estado de la hoja de ruta

- **Implementado:** M0, M1, M2, M3 y **M4**.
- **Aprobado, no implementado:** D-V10-9, `SectorView`, permisos `members.*` y la comprobación previa (todo en M7); la pasada documental (P-12); la composición de suscriptores (P-11).
- **Propuesto, a confirmar en su etapa:** `domains/finance/<módulo>` (M5; `lib/domains/` no existe).
- **Pendiente de autorización:** M5, M6, M7 y M8.

**No se inició M5 ni ninguna etapa posterior.**

## 17. Cierre de M4 (decisiones del dueño, 2026-10-31)

Tras la auditoría final de M4 (solo lectura), el dueño decidió, de forma exclusivamente documental:

1. **Historial (C-1):** conservar los nueve commits intermedios que no compilan por separado y `ac71d60`; no reescribir el historial. La limitación y sus consecuencias para `git bisect` y los `revert` están en §14.1.
2. **Benefits (C-2):** opción A. Se mantienen las tres referencias de `app/[tenant]` a `platform/benefits/benefits-db`; se aclara el criterio de aceptación (§4.1 de `V10-arquitectura-fisica.md`); no se introducen excepciones en el verificador (0 abiertas, tope 0); no se mueve ninguna función ni cambia comportamiento.
3. **Aislamiento y seguridad (C-3):** la prueba `tenant-scope` se mantiene sin debilitar; la auditoría de aislamiento por negocio y la revisión de las guardas de `app/admin` quedan **registradas como trabajo independiente fuera de V10 y no iniciadas**.

Estas decisiones no modificaron código, configuración, pruebas, Prisma, migraciones ni `layers.json`. M4 queda cerrada; M5–M8 siguen pendientes de autorización.
