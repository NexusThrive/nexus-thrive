# V10 — Revisión posterior a M0–M2 y preparación de M3

**Estado: auditoría y diseño. No se implementó nada.** No se movió ni renombró ningún archivo, no se cambiaron imports, contratos, `layers.json`, pruebas, Prisma ni migraciones, y no se cambió ningún comportamiento de negocio.
Base: rama local `chore/HU-esquema-prisma-modular-01`, commit `ec25880` (sin push, PR, merge ni despliegue). Complementa [`V10-arquitectura-fisica.md`](V10-arquitectura-fisica.md) y [`V10-M0-M2-resultados.md`](V10-M0-M2-resultados.md), que se conservan intactos.
Las cifras salen de scripts de solo lectura; lo que no se pudo comprobar está marcado **[no verificado]**.

---

## 1. Estado técnico comprobado

| Comprobación pedida | Resultado | Evidencia |
|---|---|---|
| `lib/runtime` es la única raíz de composición | **Sí, con una matización** | Solo `lib/runtime/ports.ts` llama a `Port.provide(`; solo `lib/runtime/sectors.ts` llama a `registerSector(`; el registro de operaciones y la conexión de la API están en `lib/runtime`. Ningún archivo de producción de `lib/` fuera de `runtime` lo importa (solo pruebas colocadas). **Matiz:** la lista de suscriptores de eventos se compone en una ruta de `app/` (`app/api/cron/webhooks/route.ts`: `dispatchPending({ subscribers: [presenceSubscriber] })`). Es un punto de entrada, así que cumple la regla, pero es composición fuera de `runtime` (ver H-2) |
| Los módulos compartidos no importan `lib/industry/` | **Sí** | `check:layers`: 0 violaciones. Fuera de industria y construcción, solo `lib/dashboard/notifications-db.ts` importa `industry/gym` y es de la capa experiencia (R1 lo permite) |
| Los siete puertos siguen conectados | **Sí** | `tests/architecture/e5-puertos.test.ts` y `v10-composicion.test.ts` pasan (cada puerto se conecta una vez; todo puerto declarado queda conectado) |
| Dependencias entre las nueve áreas respetan las reglas | **Sí** | 289 archivos, 0 violaciones, 0 sin clasificar, 0 ubicaciones incoherentes. Matriz real: `business→core/foundation`, `finance→business/foundation`, `industry→business/core/foundation`, `integrations→business/core/finance/foundation`, `platform→business/core/foundation`, `runtime→business/core/finance/foundation/integrations`, `experience→core/finance/foundation/industry`, `automation→core/foundation`. Ninguna flecha prohibida. `domains` todavía no tiene archivos |
| No hay ciclos nuevos | **Sí** | 0 ciclos de valores; 3 de solo tipos (tope 3): `auth/permissions ⇄ roles`, `business/money-service ⇄ inventory/stock-service`, `dashboard/chart-catalog ⇄ layout` |
| El catálogo de sectores funciona | **Sí** | 18 sectores; el volcado antes/después de M2 era idéntico; `tests/unit/sectores.test.ts` (22) y `v10-sectores.test.ts` (14) pasan |
| Sectores desconocidos usan el comportamiento general | **Sí** | `""`, `"desconocido"`, `"GYM"`, `"futuro_sector"` dan el sector `general`; los alias heredados (`barber`, `services`, `tourism`) siguen yendo a su rubro actual; `hasMemberAccess` es falso para desconocidos y alias |
| Las rutas de importación modificadas no dejaron referencias antiguas | **Sí en el código** | 0 importaciones de `@/lib/vertical-terms`, `@/lib/operations/registry` o `@/lib/api/runtime-deps`. Las 4 que quedan de `@/lib/admin/catalogs` importan `validateSlug`/`SlugValidation`, que **sí** siguen ahí. Hay referencias en documentación y en una unidad de `layers.json` (ver H-1, H-3) |
| Pruebas de integración y contratos públicos | **Sí** | `pnpm verify` verde. Unitarias: 113 archivos / 1 711 pasan (407 omitidas = integración). Integración sobre una base desechable: 66 archivos / 413 pasan. Desde `81fa625` no cambió ningún archivo de `app`, `lib`, `components` ni `instrumentation.ts` (diff vacío), así que el contrato de M2 (15 operaciones + OpenAPI idénticos byte a byte) sigue vigente |
| Prisma y migraciones | **Sin cambios** | `git status` vacío en `prisma/` y `migrations/`; guardián SQL: sin cambio de tablas |

Entorno: contenedor PostgreSQL desechable propio (tmpfs, puerto local, base `nexus_e11_test`), eliminado al terminar; `nexus-postgres` y `nx-pg` intactos.

## 2. Hallazgos de la auditoría

Ninguno se corrigió (la revisión no autoriza cambiar código ni configuración).

| # | Hallazgo | Evidencia | Gravedad |
|---|---|---|---|
| **H-1** | `layers.json` conserva una **unidad huérfana**: `{ "path": "lib/vertical-terms.ts", "layer": "core" }` (el archivo se movió en M2) | El verificador no detecta unidades que apuntan a archivos inexistentes | Baja (inofensiva), pero indica un hueco del verificador |
| **H-2** | La composición de **suscriptores de eventos** vive en una ruta de `app/` | `app/api/cron/webhooks/route.ts:24`; además esa ruta reprocesa eventos de proveedores | Baja: es un punto de entrada permitido; no está en `runtime` |
| **H-3** | Documentación viva con rutas antiguas | `docs/nexus-architecture/current-architecture.md:75` cita `lib/vertical-terms.ts` | Baja |
| **H-4** | La **ficha 360° consulta datos del gimnasio aunque el módulo esté apagado** | `app/[tenant]/(app)/crm/[id]/page.tsx:64`: `getCustomer360Memberships(...)` se llama siempre; luego solo se *muestra* si `showMemberships` | Media (ya anotado en la hoja de ruta; ver §6) |
| **H-5** | Las funciones de **código de acceso (QR/NFC)** se autorizan con la ruta `/crm` y no con `/memberships` | `crm/[id]/access-actions.ts`: `accessCodeAction` y `linkNfcAction` usan `requireTenantContext(slug, "/crm")`; las dos siguientes sí usan `/memberships` | Media: una función de socios no exige el módulo de membresías |
| **H-6** | El **menú y la acción «Crear» se calculan en el navegador** con el sector | `components/providers/shell-context.tsx` (cliente) llama a `buildTenantNav(vertical, …)` y `quickCreateActions(vertical, …)`, que resuelven términos con `getVerticalTerms` | Alta para M7 (ver §4) |
| **H-7** | Inconsistencia de numeración entre el diseño y la autorización | La lista D-V10-1…9 aprobada reinterpreta 3, 4, 6, 7 y 8 respecto del diseño (ver §9) | Media: algunas preguntas abiertas del diseño no tienen decisión explícita |
| **H-8** | Una rama paralela tendría conflictos de importación | `integracion/local-revision` comparte 20 archivos con esta rama (ver §3) | Media si se va a integrar |
| **H-9** | Dos fuentes para «módulo activo» | `TenantModule.active` (usado por `isRouteEnabled`) frente a `Tenant.contractedModules` (lo que se puede activar) | Informativa: el diseño de §6 las distingue |

## 3. Imports y ramas paralelas (E)

Ramas locales: 10; remotas: 24. Todas las ramas **anteriores** contienen, como es esperable, las importaciones antiguas (`origin/main` y `main`: 98 archivos). Eso no es una incompatibilidad: son estados previos a M1/M2.

Las únicas que tienen trabajo propio por encima de `origin/main`:

| Rama | Commits propios | Archivos en común con esta rama | Importaciones viejas en lo que añade |
|---|---|---|---|
| `chore/HU-integracion-rubros-restaurante-01` | 5 | **0** | ninguna |
| `feature/HU-nexus-restaurant-investigacion-01` | 2 | **0** | ninguna |
| `docs/capas-reorganizacion-v2` | 4 | 1 (`package.json`) | ninguna |
| `integracion/local-revision` | 1 (varias bases de fusión) | **20** (p. ej. `crm/page.tsx`, `bookings/page.tsx`, `tenant-nav.test.ts`) | **sí**: 8+ archivos con `@/lib/admin/catalogs`/`@/lib/vertical-terms` |

**Conclusión:** las ramas de restaurante no chocan. `integracion/local-revision` sí lo haría (conflictos de textos en las líneas de importación, no de lógica); una vez resueltos, se corrigen con el mismo codemod (por símbolo) que se usó en M2. Mi rama nunca modificó otras ramas. Para quien integre en paralelo: los símbolos de sectores y módulos ya no salen de `@/lib/admin/catalogs` (solo `PAYMENT_METHODS`, `validateSlug`, etc.).

Las 87+ rutas de M2 están completas en el árbol actual; la verificación fue un `grep` de todo el repositorio (sin `node_modules`, `.next` ni `.git`).

---

## 4. Configuración sectorial en el cliente (A) — propuesta para M7

### 4.1 Cómo funciona hoy

- El **layout del servidor** ya resuelve los términos (`getVerticalTerms(tenantRecord.vertical)`) y los entrega por `VerticalTermsProvider` a 5 componentes de cliente de CRM: bien.
- Pero el **shell** (cliente) recibe solo el `vertical` y, dentro del navegador, `buildTenantNav` y `quickCreateActions` vuelven a resolver el sector. Hoy es inocuo porque el registro del navegador y el del servidor coinciden (solo existe el catálogo base).
- Con M7, una industria registrará su definición **solo en el servidor** (`instrumentation.ts`). El HTML renderizado en el servidor usaría la definición de la industria y el navegador, al hidratar, la del catálogo base: **etiquetas distintas y avisos de hidratación**. Esa es la razón concreta del riesgo.
- Otros componentes de cliente importan tablas estáticas del catálogo base (`VERTICAL_LABELS`, `VERTICALS`, `VERTICAL_ICONS`, `MODULE_LABELS`) para listas de administración y formularios. Con la lista cerrada actual es correcto; con sectores dinámicos dejaría de serlo.

### 4.2 Contrato propuesto

**Principio:** el servidor resuelve; el cliente solo recibe datos serializables. Un único resolvedor de sector.

```ts
// lib/core/sectors/view.ts  (Core, puro, solo tipos serializables + una función de servidor)
export type SectorView = {
  id: string;                 // sector resuelto (nunca el crudo): "general" si era desconocido
  label: string;
  terms: VerticalTerms;       // con el respaldo general ya aplicado
  quoteTerms?: QuoteTerms;    // solo si el negocio usa cotizaciones
};
export function resolveSectorView(raw: string): SectorView;   // ÚNICA lógica de selección; solo servidor
```

| Pieza | Regla |
|---|---|
| Servidor (layout) | `const sector = resolveSectorView(tenant.vertical)`; lo entrega a un `SectorProvider` y a `TenantShell` (`sector={sector}`) |
| Cliente | `useSector()` (o el `useVerticalTerms()` actual, que pasa a leer del proveedor). **No resuelve nada**: `buildTenantNav(terms, modules)` y `quickCreateActions(terms, modules, …)` reciben los términos ya resueltos en vez del `vertical` |
| Respaldo | Lo aplica `resolveSectorView` (cadena sector → general). El cliente no tiene lógica de respaldo: si llega un `SectorView`, está completo |
| Capacidades | Se envían **booleanos ya calculados** por el servidor (módulo + permiso; ver §6), nunca la receta del sector ni los roles |
| Listas de administración | `listSectorOptions()` en el servidor → props; el catálogo estático deja de importarse en el cliente cuando existan sectores registrados |
| Prohibiciones comprobables | Un componente con `"use client"` no puede importar `lib/core/sectors/registry`, `terms` ni `catalog` (prueba de arquitectura que lee los imports, como `v10-sectores.test.ts`) |
| Hidratación | El HTML del servidor y el del cliente salen de las mismas props: no pueden divergir |

**Tamaño del dato:** ~12 cadenas por negocio. **No duplica lógica:** `getVerticalTerms` pasa a ser un envoltorio de servidor sobre `resolveSectorView`.

**Qué toca en M7 (no antes):** `view.ts`; `layout.tsx`; `tenant-shell.tsx`; `shell-context.tsx`; las firmas de `buildTenantNav` y `quickCreateActions`; sus pruebas; una prueba de arquitectura nueva. Es un cambio acotado porque ya existe el proveedor.

**Riesgo residual:** `tenant-nav` y `quick-create` también los usa una página del servidor (`app/[tenant]/(app)/page.tsx`); se les pasan los términos de `resolveSectorView`. Los términos que usa `getQuoteTerms` en las páginas de cotizaciones ya se resuelven en el servidor.

---

## 5. El `enum Vertical` de Prisma (B)

### 5.1 Hechos verificados (solo lectura)

- El enum solo se usa en **un campo**: `Tenant.vertical` (`prisma/schema/core/tenant.prisma:109`). Tiene 18 valores y coincide con la lista `VERTICALS` del código.
- La plataforma **ya** guarda el sector como texto en otros lugares: `VerticalSetting.vertical` (`String @id`, con `signupEnabled`, `priceFactorPct`, módulos recomendados, orden) y `Lead.vertical String?`. `lib/plans/settings.ts` inserta las filas que falten de `VerticalSetting` al cargar la configuración.
- Escrituras de `Tenant.vertical`: **dos funciones** — `admin/db.ts#createTenant` (llamada desde `app/admin/actions.ts`, `app/admin/usuarios/actions.ts` y el alta/onboarding) y `lib/tenant/settings-db.ts#updateBusinessContext` (esta última con `value.vertical as never`).
- Lecturas: 60 archivos leen `.vertical`; 21 expresiones indexan tablas por clave tipada con el enum.
- Ninguna política RLS del repositorio menciona `vertical` **[no verificado contra las políticas reales de una base viva; solo contra `docs/prod-sql`]**.
- **[No verificado]** cómo la herramienta de migraciones de este repositorio ejecuta un `ADD VALUE` de enum en una base con datos.

### 5.2 Comparación

| Criterio | A. Enum de Prisma (hoy) | B. Catálogo independiente del enum (texto + registro) | C. Sectores dinámicos (en base de datos) |
|---|---|---|---|
| **Qué es** | El conjunto de sectores lo fija Prisma | `Tenant.vertical` pasa a texto; el registro de código (y, opcionalmente, `VerticalSetting`) valida | Los sectores, sus términos y recetas se guardan y editan en la base |
| **Sector nuevo** | Migración + despliegue + `VERTICALS` + registro | Archivo del sector + línea en `runtime` (+ fila en `VerticalSetting`); **sin migración** | Se crea desde el panel; sin despliegue |
| **Integridad de datos** | Total en la base (valor inválido imposible) | Se pierde la garantía de tipo en la base. Se recupera con una **clave foránea a `VerticalSetting`** (ya existe, ya es texto) o con validación en las dos funciones de escritura | Igual que B más validación de contenido |
| **Migración necesaria** | Una por sector | **Una vez**: enum → texto (reescribe `Tenant`; hay que bloquear brevemente) y, si se usa, la FK | Esquema nuevo para términos/recetas |
| **Compatibilidad** | Total | Compatible hacia atrás: el texto contiene los mismos valores; el código nuevo acepta lo conocido y respalda lo demás en `general` (ya implementado) | Requiere versionado de claves de términos |
| **Tipado en el código** | `VerticalValue` = enum | `VerticalValue` pasa a describir *sectores integrados*; el id general es `string` (21 expresiones a revisar) | Igual que B |
| **Validaciones** | Las hace la base | Las dos funciones de escritura validan contra el registro + lectura con respaldo (D-V10-5) | Panel con validación y vista previa |
| **Complejidad operativa** | Orden obligatorio: migrar la base antes de desplegar código que use el valor; quitar un valor es difícil | Sin orden especial; el riesgo se mueve a la disciplina de validar | Alta: caché e invalidación, el servidor debe entregar términos al cliente, pruebas que no pueden fijar valores editables, errores de configuración por personal |
| **Procesos** | No afecta | No afecta | **No resuelve** los procesos sectoriales (siguen siendo código) |

### 5.3 Recomendación (por fases, ninguna ejecutada)

1. **Ahora y durante M7: mantener el enum.** M7 no requiere cambiar Prisma: el registro de sectores y el contrato de cliente funcionan con la lista cerrada. Aun así, hay que dejar de usar `as never` en la frontera de `settings-db.ts` apoyándose en el validador del registro (es un cambio de código, no de Prisma).
2. **Cuando se autorice P5 (Prisma): opción B**, con clave foránea a `VerticalSetting`. Reutiliza una tabla que ya existe, no añade modelo nuevo y elimina la migración por sector. Prerrequisito: que la fila de `VerticalSetting` exista antes de crear un negocio (hoy se siembra de forma perezosa en `lib/plans/settings.ts`; habría que sembrarla en la propia migración).
3. **Opción C: no ahora.** Su valor (cambiar términos sin desplegar) es menor que su costo; y los procesos, que es lo que realmente diferencia a un sector, no se pueden configurar en una tabla. El registro de §4 permite añadirla después con un *cargador* que registre definiciones desde la base, sin cambiar a los consumidores.

**No se modificó Prisma ni `migrations/`.**

---

## 6. Autorización de funciones de socios (C) — diseño para D-V10-9

### 6.1 Estado actual (verificado)

| Capa | Hoy |
|---|---|
| Sector | `hasMemberAccess(vertical)` (bandera de la receta): decide, junto con `showMemberships`, si la ficha 360° muestra el estado de acceso (`isGym = hasMemberAccess && showMemberships`, `crm/[id]/page.tsx:103`) |
| Módulo activo | `isRouteEnabled(tenantId, route)` ⇒ `TenantModule.active` para algún módulo que habilite la ruta (`modulesForRoute`). Lo aplica `requireTenantContext(slug, route)` |
| Usuario | `requireTenantContext` exige sesión, negocio activo y miembro activo; luego cada acción llama `can(role, permiso)` o los atajos `canHandleCash`/`canManage` |
| Operación concreta | Reglas de cada acción (el cliente es del negocio, estado de la membresía, etc.) y bitácora `logTenantAction` |

Brechas: **H-4** (se consultan datos del gimnasio sin módulo activo) y **H-5** (código QR/NFC solo exige `/crm`).

### 6.2 Tres niveles, tres respuestas distintas

| # | Nivel | Pregunta | Fuente de verdad | Resultado |
|---|---|---|---|---|
| 1 | **Módulo activo para la organización** | ¿Esta organización tiene encendida la función? | `TenantModule.active` (con `contractedModules` como tope de lo que se puede encender) | Booleano por módulo. **No** consulta el sector |
| 2 | **Permisos del usuario** | ¿Este usuario, con su rol, puede hacer esta clase de acción? | Matriz `BUSINESS_PERMISSIONS` + `can(role, permiso)` | Booleano por permiso |
| 3 | **Autorización de la operación** | ¿Esta operación concreta, sobre este recurso, ahora, es válida? | Reglas de la operación: el recurso pertenece al negocio, el estado lo permite (membresía no cancelada), el límite del plan, etc. | Decisión con motivo; se audita |

**Regla central: los niveles se combinan con AND y ninguno concede nada al otro.** Un módulo activo no da permisos; un permiso no enciende un módulo; ninguno de los dos autoriza una operación inválida. El sector **sale de la decisión**: solo puede influir en *qué módulos se encienden de partida* (la receta), nunca en el control de acceso.

### 6.3 Diseño

```ts
// lib/industry/gym/member-access.ts  (o el módulo de membresías; servidor)
type MemberFeature = "view" | "sell" | "scan" | "assignCode";

/** Nivel 1 + 2, calculado una vez por solicitud. Es lo que se envía al cliente (booleanos). */
type MemberFeatures = { available: boolean; view: boolean; sell: boolean; scan: boolean; assignCode: boolean };
function memberFeatures(ctx: { tenantId: string; role: BusinessRole; activeModules: ReadonlySet<string> }): MemberFeatures;

/** Nivel 3, en cada acción del servidor; lanza o devuelve una decisión con motivo. */
function authorizeMemberOperation(ctx, feature: MemberFeature, resource?: { customerId?: string; membershipId?: string }): Promise<Decision>;
```

- **Un solo punto de verdad** por función: la pantalla, las acciones y las notificaciones llaman a `memberFeatures` / `authorizeMemberOperation`. Se acaba el uso de rutas indirectas (`/crm`) para decidir funciones de socios (H-5).
- **Permisos:** al inicio, nuevos nombres en la matriz con **exactamente los mismos roles** que hoy (por ejemplo, `members.view`, `members.checkin`, `members.assignCode` con los roles de `canHandleCash`; la venta sigue en `money.handle`). Así no cambia quién puede hacer qué; sí se vuelve legible y auditable. *Decisión pendiente*: permisos nuevos o reutilizar los actuales.
- **Cliente:** recibe `MemberFeatures` (booleanos). Oculta botones, pero **la decisión que cuenta es la del servidor** (como dice la matriz de permisos hoy).
- **Datos:** `getCustomer360Memberships` solo se llama si `memberFeatures.available` (cierra H-4 y reduce exposición de datos).
- **`hasMemberAccess(vertical)`:** se retira cuando se implemente (M7). Mientras tanto no se toca.
- **Auditoría:** las operaciones con efecto (asignar/regenerar código, vender, congelar, cancelar) siguen registrándose con `logTenantAction`; el motivo de una denegación no se guarda (solo se responde).

### 6.4 Cambios de comportamiento que traerá (a aprobar antes de implementar)

1. Un negocio **que no es gimnasio** y tiene el módulo `memberships` activo **empezaría a ver** el estado de acceso y las funciones de QR en la ficha (hoy no, porque la receta no tiene la bandera).
2. Un gimnasio **sin** el módulo activo: igual que hoy (ya exige `showMemberships`), pero además dejará de consultarse la membresía.
3. `accessCodeAction`/`linkNfcAction` pasarían a exigir el módulo de membresías además del de clientes.

**Comprobación previa recomendada (solo lectura, sobre una copia; no se ejecutó):**

```sql
BEGIN READ ONLY;
SELECT t."vertical", count(DISTINCT t."id") AS negocios_con_membresias_activas
FROM "Tenant" t
JOIN "TenantModule" m ON m."tenantId" = t."id" AND m."moduleName" = 'memberships' AND m."active"
GROUP BY 1 ORDER BY 2 DESC;
ROLLBACK;
```

Si hay filas con sector distinto de `gym`, el punto 1 afecta a negocios reales y conviene decidirlo caso por caso antes de activar el cambio.

---

## 7. Auditoría (D): conclusión conservada

Los tres escritores de `AuditLog` (más el envoltorio de `ops`) **tienen contratos diferentes**: modelo de actor (personal / miembro / API key o automatización), columnas que llenan, acción permitida y semántica de fallo (`logAudit` lanza; los demás se tragan el error). Detalle en [`V10-M0-M2-resultados.md`](V10-M0-M2-resultados.md).

**Adaptación del alcance de M6c (propuesta; no se ejecuta):** el diseño original decía «unificar en `core/audit`». Con estos hallazgos, M6c deja de ser una fusión y pasa a una de dos opciones, a decidir:

- **M6c-a (recomendada): no tocar los contratos.** Dejar los cuatro puntos donde están y documentar la regla de cuándo usar cada uno.
- **M6c-b: extraer solo la inserción.** Una función interna `writeAuditLog(row)` (sin política de fallo ni modelo de actor) que usen los cuatro; cada uno conserva su contrato y su manejo de errores. Se justifica solo si aparece un quinto escritor o un cambio de columnas que obligue a tocar los cuatro a la vez.

En ningún caso se unificarían la política de fallo ni el modelo de actor sin una decisión de producto.

---

## 8. Plan técnico de M3

### 8.1 Qué contempla M3 en el diseño

Según `V10-arquitectura-fisica.md` §7 · M3: **dividir `lib/business` en módulos** — `customers`, `catalog`, `documents`, `money`, `scheduling` — más dos movimientos menores (`countries` → Foundation; `inventory.ts` → `business/inventory`), en el orden de menos a más importadores (`scheduling` → `customers` → `catalog` → `documents` → `money`), un commit por módulo.

### 8.2 Diferencia de alcance que los hallazgos exigen

> **`documents` y `money` no se pueden separar tal como estaban en el diseño.** Medí las dependencias entre los módulos propuestos y hay una **dependencia circular**:
> - `documents → money`: `charge.ts` y `invoices-db.ts` importan `money-service.ts`.
> - `money → documents`: `money-service.ts` importa `documents-db.ts` (`insertDocument`, `issueCreditNote`, `saleDocumentOfPayment`), `invoice.ts`, `commercial-document.ts` y el puerto `accounting-port.ts`.
>
> Por el criterio de fusión del propio diseño (§5.3: un ciclo de imports entre ambos y consumidores que los usan juntos), **se fusionan en un solo módulo `business/sales`** («Ventas y cobros», que es además el nombre de su categoría en el registro de capacidades). Separarlos crearía un ciclo entre módulos nuevos, justo lo que V10 pretende evitar.

Otras diferencias respecto del diseño, todas de detalle:

| # | Diferencia | Justificación |
|---|---|---|
| 1 | `documents` + `money` → **`business/sales`** (15 archivos, ~1 900 líneas, un solo componente conexo) | Ciclo documentado arriba. Queda bajo los umbrales de división del diseño (≤ 15 archivos o < 2 500 líneas) |
| 2 | La unidad `lib/catalog` de `layers.json` se retira al mover sus 2 archivos | Quedaría huérfana (como H-1) |
| 3 | Hay que actualizar **pruebas con rutas literales** (`layers.test.ts`, `e3-dominios.test.ts`, `v10-verificador.test.ts` citan `lib/business/customers-db.ts` y `money-service.ts`) | No es modificar su intención, sino sus rutas; el diseño lo omitía |
| 4 | El codemod de M2 **no basta**: M3 tiene importaciones **relativas** (19 en producción, 21 en pruebas), **dinámicas** (`lib/inventory/operations.ts` usa `import("@/lib/business/products-db")` y `import("@/lib/catalog/catalog-db")`), reexportaciones (`export { payInvoice } from "./money-service"`) y posibles `vi.mock("…")` | Hay que extender la herramienta y comprobar con un `grep` que no quede ninguna ruta antigua |
| 5 | `countries` → Foundation y `inventory.ts` → `inventory` van como commits **separados** al final | Son movimientos de otra naturaleza |

### 8.3 Módulos afectados y archivos

| Módulo nuevo | Archivos que se mueven (desde `lib/business/` salvo indicación) | LOC | Importadores externos (archivos) |
|---|---|---|---|
| `business/scheduling` | `bookings-db`, `calendar` | 183 | 9 (7 `app`, 2 `lib/industry`) |
| `business/customers` | `customers-db`, `customer-fields`, `customer-notes` | 205 | 19 (15 `app`, 4 `lib`) |
| `business/catalog` | `products-db`, `catalog-kinds`, y de `lib/catalog/`: `catalog-db`, `barcode` | 447 | 20 (15 `app`, 5 `lib`) |
| `business/sales` | `commercial-document`, `documents-db`, `invoice`, `invoices-db`, `charge`, `receipt-qr`, `receipt-share`, `accounting-port`, `fiscal-port`, `numbering-port`, `money-service`, `money`, `money-error`, `cash`, `finance-db` | ~1 900 | 46 (documents) ∪ 39 (money), solapados |
| *(menores)* | `countries` → `foundation`; `inventory.ts` → `lib/inventory` | 84 | 2 y 5 |

**Total:** 26 archivos se mueven; **98 archivos importadores externos únicos** (47 `app`, 4 `components`, 42 `lib`, 5 pruebas); 9 pruebas colocadas se mueven con su módulo. Los módulos de `lib` que importan: `accounting`, `einvoice`, `industry`, `inventory`, `payments`, `pos`, `purchasing`, `receivables`, `runtime`, `store`. Tras M3, `lib/business/` queda solo con subcarpetas.

### 8.4 Dependencias involucradas

- **Entre los módulos nuevos (medido):** la única arista es `catalog → inventory` (por `products-db → inventory.ts`; nueva pero permitida: negocio → negocio). `scheduling`, `customers` y `sales` no se importan entre sí. **No hay ciclos entre módulos nuevos** una vez fusionado `sales`.
- **Ciclo de tipos que se conserva:** `sales/money-service ⇄ inventory/stock-service` (tope 3). M3 no lo resuelve ni lo empeora; queda documentado para una etapa propia (sacar `MoneyTx` y el tipo compartido a un archivo hoja).
- **Capas:** `lib/business/<módulo>/…` sigue siendo el área `business` por su ruta: no cambia ninguna dependencia entre áreas. Los tres puertos de `sales` (`accounting`, `fiscal`, `numbering`) mantienen sus nombres y su conexión en `lib/runtime/ports.ts` (cambia solo la ruta del import).
- **Industrias:** `lib/industry/*` importa `customers`, `scheduling`, `catalog` y `sales`; ya está permitido (industria → negocio).

### 8.5 Importaciones que deben actualizarse

98 archivos externos (más los propios archivos movidos). Formas a cubrir: `import`/`export … from "@/lib/business/x"`, `@/lib/catalog/x`, relativas `./x` y `../x`, `import("…")` dinámicos y `vi.mock("…")`. Verificación de cierre: `grep` sin resultados para los 26 nombres de ruta antiguos en `app`, `components`, `lib`, `tests`, `scripts`.

### 8.6 Riesgos

| Riesgo | Mitigación |
|---|---|
| Volumen (98 archivos) y ramas paralelas (`integracion/local-revision` comparte 20) | Un commit por módulo; codemod reproducible; avisar que esa rama requerirá rehacer importaciones |
| Importaciones dinámicas o relativas que el codemod no vea y fallen solo en ejecución | Extender el codemod; `tsc` (detecta las estáticas y dinámicas literales); `grep` de cierre; pruebas de integración de inventario y catálogo |
| Un ciclo nuevo entre los módulos | `check:layers` ya falla con ciclos de valores y con tope de ciclos de tipos |
| Romper contratos públicos (operaciones inventario/catálogo importan `products-db` y `catalog-db` dinámicamente) | Comparar las 15 operaciones y el OpenAPI antes y después (como en M1/M2) |
| Cambiar el comportamiento de dinero | No se edita lógica: solo ubicación. Comparar la lista de exportaciones de cada archivo movido antes/después (idéntica) y correr la integración de contabilidad, POS, tienda, cobros y recibos |
| Next/cliente: `receipt-share.ts` y `countries.ts` se importan desde componentes de cliente | No cambian de naturaleza; `build` en cada paso |
| Pruebas con rutas literales | Actualizarlas dentro del mismo commit del módulo, sin cambiar sus aserciones |

### 8.7 Pruebas necesarias

- Por módulo: `tsc`, `pnpm check:layers`, pruebas del módulo y de sus consumidores, `pnpm verify`.
- **Equivalencia de exportaciones:** script que compare la lista de símbolos exportados de cada archivo movido antes y después (debe ser idéntica).
- **Contrato público:** las 15 operaciones y el OpenAPI idénticos.
- **Integración sobre base desechable:** `business`, `pos`, `store`, `accounting`, `receivables`, `payments`, `einvoice`, `inventory`, `purchasing`, `catalog`.
- **Nuevas (arquitectura):** los módulos están donde dice el diseño; no queda ninguna ruta antigua; cada módulo nuevo tiene un solo componente conexo; no hay aristas circulares entre los módulos de `business`.

### 8.8 Criterios de aceptación

1. `pnpm verify` verde después de **cada** módulo.
2. 0 excepciones, 0 ciclos de valores, **tope de ciclos de tipos sin subir** (3), 0 ubicaciones incoherentes.
3. 0 referencias a las 26 rutas antiguas.
4. Exportaciones de cada archivo movido idénticas; contrato público idéntico.
5. Prisma y migraciones sin cambios.
6. Cada módulo cumple el criterio de creación de V10 §5.1 y el grafo interno de cada uno tiene un solo componente.
7. `lib/business/` queda sin archivos sueltos.

### 8.9 Estrategia de reversión

- Un commit por módulo, hecho con `git mv` (conserva el historial) y un codemod determinista. `git revert <commit>` deshace el módulo completo, incluidas las importaciones, mientras no haya commits posteriores que toquen los mismos archivos; en ese caso se revierte en orden inverso.
- Antes de empezar se recomienda una etiqueta local de punto de control (`pre-v10-m3`); **no se crea en esta revisión**.
- Orden de ejecución propuesto (menor a mayor riesgo): `scheduling` → `customers` → `catalog` (+ `inventory.ts`) → `sales` → `countries`. Se puede detener después de cualquiera sin dejar el repositorio inconsistente.

### 8.10 Lo que M3 **no** incluye

M4 a M8; la división de `tenant/db.ts`; la migración de las 151 pruebas (se mueven solo las 9 colocadas con los módulos de M3); mover `lib/construction`; Prisma; la decisión sobre si `money-service` pasa a Finance.

---

## 9. Decisiones que requieren aprobación

**Nota de numeración (H-7).** La lista D-V10-1…9 de la autorización no coincide con la del diseño en 3, 4, 6, 7 y 8. Preguntas abiertas del diseño que **no tienen decisión explícita**: (a) el nivel de anidación de `domains/finance`; (b) la ubicación de `money-service` (¿Finance?); (c) la ubicación de `presence`, `growth` y `benefits`; (d) no introducir `extensions/` por ahora; (e) el destino del enum (tratado en §5).

| # | Decisión | Recomendación |
|---|---|---|
| **P-1** | **Alcance de M3:** fusionar `documents` y `money` en `business/sales` (por el ciclo) | **Sí.** La alternativa (separarlos) crea un ciclo entre módulos nuevos |
| **P-2** | Ubicación de `money-service` en Finance (pregunta (b)) | Mantener en `business/sales` ahora; reevaluar con un segundo consumidor que no sea Negocio |
| **P-3** | `countries.ts` a Foundation y `inventory.ts` a `lib/inventory` dentro de M3 | Sí, como commits separados al final |
| **P-4** | Permitir en M3 actualizar las rutas literales de las 3 pruebas de arquitectura | Sí (sin cambiar sus aserciones) |
| **P-5** | Contrato de sector para el cliente (`SectorView`) como prerrequisito de M7 | Aprobar el diseño de §4; implementarlo en M7 |
| **P-6** | Camino del enum: A ahora, **B (texto + FK a `VerticalSetting`) cuando se autorice P5**, C no | Aprobar como línea de planeación; sin cambios ahora |
| **P-7** | Permisos de socios: nombres nuevos con los mismos roles (`members.*`) o reutilizar `money.handle`/`canHandleCash` | Nombres nuevos, mismos roles |
| **P-8** | D-V10-9: aceptar los 3 cambios de comportamiento de §6.4 y ejecutar antes la comprobación de solo lectura sobre una copia | Sí, en M7 y con la comprobación previa |
| **P-9** | M6c: opción **M6c-a** (no tocar) o **M6c-b** (solo extraer la inserción) | M6c-a |
| **P-10** | Corregir la unidad huérfana de `layers.json` (H-1) y añadir al verificador la detección de unidades huérfanas | Hacerlo al inicio de M3 (es configuración del propio V10) |
| **P-11** | Mover la composición de suscriptores de eventos (H-2) a `lib/runtime` | Posponer; no bloquea M3 |
| **P-12** | Actualizar la documentación viva con rutas antiguas (H-3) | En la próxima pasada de documentación |
| **P-13** | Política con `integracion/local-revision` (20 archivos solapados) | Decidir si se integrará; si sí, resolver importaciones con el codemod después de M3 |

**Punto de detención.** Esta revisión no autoriza M3. Queda esperando la revisión del informe y del alcance de M3.
