# Cierre de evidencias — Etapa 1

- **Rama:** `feature/construction-apu-engine`
- **Fecha:** 2026-10-11
- **Alcance:** ítems 1.1–1.11 y ajustes A–G del mandato de cierre.
- **Método:** salidas reales de `git`, `pnpm exec tsc`, `pnpm test`, `pnpm build`,
  `psql` y el CLI de Prisma 8. Nada se marca como verificado sin salida pegada.
- **Base de desarrollo:** tenant de obra `juancarlos`
  (`efe0d021-567a-4f08-9e2b-c1b046eac14d`). Todas las consultas de este
  documento son de **solo lectura**.

Commits de la Etapa 1 (`git log --oneline e480c5b..HEAD`):

```
790b314 feat(construction): ciclo de vida del proyecto con compare-and-set (ajuste C)
779c07c feat(construction): editar capitulos y partidas con concurrencia optimista (ajuste C)
e672398 fix(construction): numeracion PRES unica entre Quote y ProjectBudget (ajuste F)
6ea6a58 refactor(construction): AIU_DEFAULTS como fuente unica en apu-engine (ajuste G)
80eed18 feat(construction): linea base del presupuesto (Etapa 1.10)
7d7b725 feat(construction): verifyTotals, auditoria de integridad del presupuesto (Etapa 1.9)
ca1fc2e feat(construction): concurrencia optimista del presupuesto (Etapa 1.8)
a0e1063 feat(construction): eliminar capitulos y partidas del presupuesto (Etapa 1.7)
c5d6eea fix(construction): autor de bitacora desde la sesion (Etapa 1.6)
372a4c8 feat(construction): roles D7 y contexto de tenant compartido (Etapa 1.5)
9969f1f refactor(construction): deduplica formatters/fechas del report-engine (Etapa 1.4)
cddc344 fix(construction): EVM honesto y correcciones del informe semanal (Etapa 1.3)
585633f feat(construction): decimalToMicro con redondeo half-up (Etapa 1.2)
a8892ad test(construction): runner vitest y pruebas de motores puros (Etapa 1.1)
```

---

## 1. Ítems, commits, archivos y pruebas

| Ítem | Commit(s) | Archivos | Prueba que lo cubre | Resultado |
| --- | --- | --- | --- | --- |
| 1.1 Runner | `a8892ad` | `vitest.config.mts`, `package.json` | `pnpm test` | **OK** — 7 archivos, 72 pasan / 15 saltan |
| 1.2 `decimalToMicro` | `585633f` | `lib/apu-engine.ts`, `lib/apu-engine.test.ts` | `apu-engine.test.ts` (half-up, rechazos) | **OK** |
| 1.3 EVM honesto | `cddc344` | `lib/report-engine.ts`, `_components/reports-workspace.tsx`, `lib/report-engine.test.ts` | `report-engine.test.ts` (3) | **OK** — 7 tarjetas "No medible" + razón |
| 1.4 Dedup formatters/fechas | `9969f1f` | `lib/format.ts`, `lib/report-engine.ts`, `lib/lean-engine.ts` | `report-engine.test.ts`, `lean-engine.test.ts` | **OK** — sin imports muertos |
| 1.5 Roles D7 | `372a4c8` | `lib/tenant-context.ts` (nuevo), 4 × `actions.ts` | `tenant-context.test.ts` (2) | **PARCIAL** — ver «No hecho» |
| 1.6 Autor desde sesión | `c5d6eea` | `field-log/validators.ts`, `field-log/actions.ts` | — | **SIN PRUEBA AUTOMATIZADA** |
| 1.7 Borrado capítulos/partidas | `a0e1063` | `lib/tenant-db.ts`, `budget/actions.ts`, `budget-workspace.tsx` | `tenant-db.integration.test.ts` | **OK** (integración) |
| 1.8 Concurrencia optimista | `ca1fc2e` | `contract.prisma` (`revision`), `lib/tenant-db.ts`, migración `20261011T1817`, UI | `tenant-db.integration.test.ts` | **OK** — `STALE_REVISION` + no-op |
| 1.9 `verifyTotals` | `7d7b725` | `lib/tenant-db.ts`, `budget/actions.ts`, `budget-workspace.tsx` | integración + consulta en dev | **OK** — `mismatches: []` |
| 1.10 Línea base | `80eed18` | `contract.prisma`, `lib/tenant-db.ts`, migración `20261011T1826`, UI | — | **SIN PRUEBA AUTOMATIZADA** (`BudgetBaseline` = 0 filas en dev) |
| 1.11 Migraciones + respaldo | `ca1fc2e`, `80eed18` | `migrations/app/*` (gitignored), `migrations/app/refs/db.json` | `prisma migration status` | **OK** — «Up to date», respaldos en §6 |
| A. Tabla 0.3 | `e480c5b` | `docs/construction/auditoria-etapa-0.md` | — | **OK** (§2 de este doc) |
| B. `advanceWindow` | — (auditoría) | — | `grep -rn advanceWindow` | **OK** — sin llamadores (§3) |
| C-1. Editar capítulo/partida | `779c07c` | `lib/tenant-db.ts`, `budget/actions.ts`, `chapter-modal.tsx`, `item-modal.tsx`, `budget-workspace.tsx` | integración (no-op, `STALE_REVISION`) | **OK** |
| C-2. Editar proyecto / estado | `790b314` | `lib/projects.ts`, `lib/budget-guards.ts`, `lib/tenant-db.ts`, `quotes/projects/actions.ts`, `validators.ts`, `project-lifecycle.tsx`, `page.tsx` | `projects.test.ts` (9), `budget-guards.test.ts` (13), integración (8) | **OK** — CAS sin migración |
| D. Redondeo motor | `585633f` | `lib/apu-engine.ts`, `lib/apu-engine.test.ts` | §5 | **OK** |
| E. >6 decimales / top 20 | — (auditoría SQL) | — | §4 | **OK** — 0 valores con >6 decimales |
| F. `PRES` única | `e672398` | `lib/tenant-db.ts` (`budgets.getOrCreate`) | verificado en dev | **OK** — próximo `PRES-2026-004` |
| G. `AIU_DEFAULTS` | `6ea6a58` | `lib/apu-engine.ts`, `lib/apu-engine.test.ts` | `apu-engine.test.ts` | **OK** — 10/5/5/19 |

### No hecho (explícito)

1. **Rol D7 en la capa de actions**: la denegación real requiere sesión de Clerk.
   Solo está probado el helper puro `canGovernBudget` (`tenant-context.test.ts`).
   No hay prueba de extremo a extremo de la denegación por rol.
2. **Sin prueba automatizada**: 1.6 (autor desde sesión), 1.10 (aprobación de
   línea base), 1.9 en datos de desarrollo (se verificó a mano, ver §4/§1),
   `revalidatePath` y toda la UI (no hay pruebas de componente).
3. **Las pruebas de integración se saltan por defecto** (no hay
   `TEST_DATABASE_URL` en el entorno) ⇒ no corren en CI; se ejecutan a mano
   contra una base aparte (§2).
4. **`advanceWindow` sigue sin llamador** (§3).
5. **Migraciones no versionadas**: `migrations/` está en `.gitignore`; solo se
   versionan `contract.prisma` y los respaldos …/`refs/db.json`.
6. **Pendientes de etapas siguientes**: recuperar `apu-importer` (`be1d010`) y
   `APU_UNITS` (`e5a8eae`) (2), desperdicio (`wastePercent` hoy 0 en todo el
   catálogo) (3.1), y los consumos atípicos del catálogo (§4) (2.4).

---

## 2. Tabla 0.3 + pruebas de bloqueo, rol y tenant cruzado

### Proyectos — `quotes/projects/actions.ts`

| Acción | Rechaza si bloqueado | Rol exigido (D7) | Revalida |
| --- | --- | --- | --- |
| `createProjectAction` | N/A | OWNER | `/{t}/quotes/projects` |
| `updateProjectHeaderAction` | N/A | OWNER / STAFF | `/{t}/quotes/projects/{id}` |
| `updateProjectAction` **(nuevo)** | N/A | OWNER / STAFF | índice + detalle |
| `updateProjectStatusAction` **(nuevo)** | N/A | **OWNER** | índice + detalle |

### Presupuesto — `quotes/projects/[projectId]/budget/actions.ts`

| Acción | Rechaza si bloqueado | Rol exigido (D7) | Revalida |
| --- | --- | --- | --- |
| `getOrCreateProjectBudgetAction` | N/A (crea idempotente) | OWNER / STAFF | — |
| `createChapterAction` | **Sí** | OWNER / STAFF | detalle |
| `createBudgetItemAction` | **Sí** | OWNER / STAFF | detalle |
| `updateChapterAction` **(nuevo)** | **Sí** | OWNER / STAFF | detalle |
| `updateBudgetItemAction` **(nuevo)** | **Sí** | OWNER / STAFF | detalle |
| `deleteChapterAction` / `deleteBudgetItemAction` **(nuevos)** | **Sí** | OWNER / STAFF | detalle |
| `updateAiuConfigAction` | **Sí** | **OWNER** | detalle |
| `toggleBudgetLockAction` | N/A (es el lock) | **OWNER** | detalle |
| `approveBudgetBaselineAction` **(nueva)** | No (permitido con lock) | **OWNER** | detalle |
| `verifyBudgetTotalsAction` | N/A (solo lectura) | OWNER / STAFF | — |

### Lean / Bitácora / Informes

Sin cambios de matriz respecto a `auditoria-etapa-0.md` §0.3: Lean (3 acciones)
y Bitácora (3) quedan en OWNER/STAFF sin guarda de `isLocked` (no aplica);
Informes son solo lectura. `advanceWindow` sigue sin llamador.

### Cobertura de las tres pruebas exigidas

| Prueba | ¿Automatizada? | Dónde / por qué no |
| --- | --- | --- |
| **`locked`** (rechazo con presupuesto bloqueado) | **Sí** | `lib/tenant-db.integration.test.ts` → «presupuesto bloqueado: nada se muta ni se borra»: `createChapter`, `updateChapter`, `deleteChapter`, `deleteItem` y `updateAiu` lanzan «El presupuesto está bloqueado.» y el capítulo queda intacto |
| **`tenant cruzado`** (denegación por pertenencia) | **Sí** | mismo archivo → «el otro negocio no ve el presupuesto ni el proyecto» y «el otro negocio no puede tocar capítulos ni partidas»: `budgets.get` → `null`, `projects.get` → `null`, `projects.updateProject` → `NOT_FOUND`, `updateChapter`/`deleteChapter`/`updateItem` → «Presupuesto no encontrado en este negocio.» |
| **`rol`** (denegación por rol) | **Parcial** | El gate vive en las actions (`canGovernBudget`), que dependen de la sesión de Clerk. Probado el helper puro en `lib/tenant-context.test.ts` (OWNER/SUPERADMIN `true`, STAFF `false`) y el de proyecto en `lib/projects.test.ts`. La denegación de extremo a extremo queda **pendiente** |

### Cómo se ejecutan sin tocar datos de desarrollo

Las pruebas de integración **se saltan** salvo que exista `TEST_DATABASE_URL`,
y dentro del `beforeAll` **fallan a propósito** si `DATABASE_URL` no apunta a
esa misma base. Procedimiento verificado (base aparte `nexus_test`, esquema
creado con las 10 migraciones del contrato):

```bash
# 1) base aparte (nunca la de desarrollo)
psql "$DATABASE_URL_SIN_PARAMS" -c 'create database nexus_test'

# 2) esquema del contrato en la base aparte
set -a; source .env; set +a
TESTDB="postgresql://postgres:<pw>@localhost:5432/nexus_test"
pnpm exec prisma db migrate --db "$TESTDB"
#   → migrationsApplied: 10, markerHash: 07381774a799e22873af0cbf20aff2bc46ae1d20c2bd9e6b63a27eb935c8c335

# 3) ejecutar SOLO las de integración contra la base aparte
DATABASE_URL="$TESTDB" TEST_DATABASE_URL="$TESTDB" \
  pnpm exec vitest run lib/tenant-db.integration.test.ts
#   → Test Files 1 passed (1) · Tests 15 passed (15)
```

Cada bloque crea su propio tenant (`tenant-cas-*`, `test-bud-a-*`,
`test-bud-b-*`) y lo borra en `afterAll` (cascade). Verificado tras la corrida:
`nexus_test` quedó con 0 tenants y 0 proyectos, y la base de desarrollo siguió
con 6 tenants / 1 proyecto (`DRAFT`) / 1 presupuesto / 0 líneas base.

---

## 3. `advanceWindow`

`grep -rn advanceWindow lib app prisma` → **una sola coincidencia**: la definición en
`lib/tenant-db.ts:3285`. Ninguna ruta, acción ni componente lo invoca. Es
código sin llamador: no hay escritura implícita de ventana Lean. Decisión
pendiente para la Etapa 2 (conectarlo a una acción explícita o retirarlo).

---

## 4. Integridad numérica y top 20 (salida real, base de desarrollo)

### Valores con más de 6 decimales

```
ApuItem.unitPrice  >6dec=0
Composition.consumption >6dec=0
Composition.wastePercent >6dec=0
```

Rangos y cardinalidad:

```
unitPrice min=39 max=165120536
consumption min=0.000004 max=47483
wastePercent distintos=1 no-cero=0
items=2168  composiciones=19020
```

`wastePercent` está en **0** en las 19.020 composiciones (desperdicio sin usar
todavía; Etapa 3.1 lo lleva a todos los tipos de recurso).

### Top 20 por consumo (rendimiento del insumo por unidad de actividad)

| Insumo | Unidad | Consumo | Actividad |
| --- | --- | --- | --- |
| LADRILLO CARAVISTA 7x10x24 cm | UND | 47483 | Muro en ladrillo caravista 7x10x24 cm, e=10 cm |
| AGUA | L | 40000 | Protocolo de Bioseguridad Covid-19 (20 trabajadores) |
| CUADRILLA ELECTRICISTA | DIA | 33774 | Planta eléctrica de emergencia 165 kVA |
| CUADRILLA ELECTRICISTA | DIA | 24768 | Planta eléctrica de emergencia 80 kVA |
| ACERO Fy= 420 MPa | KG | 23716 | Caja de inspección 140x140x140 cm en concreto |
| ACERO Fy= 420 MPa | KG | 23716 | Caja de inspección 140x140x140 cm en adobe |
| CUADRILLA ELECTRICISTA | DIA | 22516 | Planta eléctrica de emergencia 75 kVA |
| CUADRILLA ELECTRICISTA | DIA | 20264 | Planta eléctrica de emergencia 34 kVA |
| TEJA ONDULADA #6 P7 | UND | 18252 | Campamento de 27 m² |
| ACERO Fy= 420 MPa | KG | 17424 | Caja de inspección 120x120x120 cm en adobe |
| ACERO Fy= 420 MPa | KG | 17424 | Caja de inspección 120x120x120 cm en concreto |
| ÁNGULO DE 3/16" x 1 1/2" | M | 16464 | Caja de inspección 140x140x140 cm en adobe |
| ÁNGULO DE 3/16" x 1 1/2" | M | 16464 | Caja de inspección 140x140x140 cm en concreto |
| TEJA ONDULADA #6 P7 | UND | 12168 | Campamento de 18 m² |
| ÁNGULO DE 3/16" x 1 1/2" | M | 12096 | Caja de inspección 120x120x120 cm en concreto |
| ÁNGULO DE 3/16" x 1 1/2" | M | 12096 | Caja de inspección 120x120x120 cm en adobe |
| MALLA ELECTROSOLDADA 4.0 mm 15x15 cm | M2 | 8624 | Caja de inspección 140x140x140 cm en concreto |
| ACERO Fy= 420 MPa | KG | 7072 | Cuneta en concreto 20.7 MPa, b=1.00 m |
| MALLA ELECTROSOLDADA 4.0 mm 15x15 cm | M2 | 6336 | Caja de inspección 120x120x120 cm en concreto |
| CUADRILLA 1 OF + 4 AY | DIA | 6203 | Sistema séptico domiciliario 2.000 Lt |

Atípicos a revisar en la Etapa 2.4: **LADRILLO CARAVISTA 47.483 UND/m²**,
**AGUA 40.000 L**, **CUADRILLA ELECTRICISTA 33.774 DIA** (parecen unidades
mal cargadas en el origen APA).

### Top 20 por aporte de costo (`unitPrice` × suma de consumo, en COP)

| Insumo | Precio unit. | Consumo total | Aporte total |
| --- | --- | --- | --- |
| CUADRILLA ELECTRICISTA | 259.322 | 131.788,873147 | 34.175.754.162,23 |
| CUADRILLA 1 OF + 4 AY | 578.391 | 32.959,089176 | 19.063.240.547,60 |
| CONCRETO 20.7 MPa | 521.421 | 19.046,646289 | 9.931.321.354,66 |
| ACCESORIOS % | 5.318.645 | 1.388,8 | 7.386.534.176,00 |
| CUADRILLA 1 OF + 1 AY | 248.136 | 24.889,416447 | 6.175.960.239,49 |
| CUADRILLA PLOMERÍA | 253.728 | 19.842,9823 | 5.034.720.213,01 |
| CUADRILLA 1 OF + 3 AY | 468.306 | 9.275,4808 | 4.343.763.311,52 |
| CONCRETO 27.6 MPa | 584.900 | 5.716,546839 | 3.343.608.246,13 |
| CONCRETO 24.2 MPa | 557.085 | 5.713,846839 | 3.183.098.366,30 |
| CUADRILLA 1 OF + 2 AY | 358.221 | 7.611,256144 | 2.726.511.787,16 |
| PLOMERO (Incl. prestaciones) | 132.457 | 15.785,0375 | 2.090.838.712,14 |
| TEJA ONDULADA #6 P7 | 54.657 | 37.184 | 2.032.365.888,00 |
| CUADRILLA 2 Ay | 220.170 | 5.792,708913 | 1.275.380.721,38 |
| CUADRILLA PINTURA | 248.135 | 5.079,4206 | 1.260.382.030,58 |
| CUADRILLA 1 OF + 5 AY | 688.476 | 1.501,1470 | 1.033.503.681,97 |
| ÁNGULO DE 3/16" x 1 1/2" | 15.940 | 57.215,97 | 912.022.561,80 |
| GRÚA 10 Ton | 168.965 | 5.061,16 | 855.158.899,40 |
| CONCRETO 17.2 MPa | 490.186 | 1.538,1904 | 753.999.399,41 |
| CONCRETO 20.7 MPa (Premezclado) | 541.820 | 1.311,27 | 710.472.311,40 |
| CUADRILLA SOLDADURA | 255.837 | 2.651,167124 | 678.266.643,50 |

### Auditoría de totales del presupuesto en desarrollo

`budgets.verifyTotals(PRES-2026-001)` → `ok: true`, `mismatches: []`
(directo 120.000.000.000, admin 12.000.000.000, imprevisto 6.000.000.000,
utilidad 6.000.000.000, IVA 1.140.000.000, gran total 145.140.000.000 en micro).

---

## 5. Redondeo del motor

Política (BigInt en micro-unidades, `SCALE = 1_000_000`):

- `decimalToMicro(raw)`: entero × 10⁶ + 6 primeros decimales; el 7.º dígito
  decide **half-up** (≥ 5 suma 1 micro). Rechaza negativos, vacíos,
  notación científica e inválidos.
- `roundDiv(n, d) = (n + d/2) / d` — **half-up** con enteros, sin `Number`.
- `percentOf(amount, pct) = roundDiv(amount × pct, 100 × UNIT)`.

Pruebas (`lib/apu-engine.test.ts`, todas en verde):

| Caso | Entrada | Esperado | Resultado |
| --- | --- | --- | --- |
| half-up 0,5 micro | 5 micro × 10 % | 1 | **OK** |
| half-up 1,5 micro | 15 micro × 10 % | 2 | **OK** |
| half-up 0,4 micro | 4 micro × 10 % | 0 | **OK** |
| caso grande | 333.333.333 micro × 10 % | 33.333.333 | **OK** |
| caso dorado | 5.618.750.000.000 micro, AIU 10/5/5/19 | gran total 6.795.878.125.000 | **OK** |
| 7.º decimal = 5 | `decimalToMicro("0.0000005")` | 1 | **OK** |

---

## 6. Migraciones aplicadas, respaldos y hash del contrato

Estado de la base de desarrollo (`prisma migration status`): **«✔ Up to date»**,
10 migraciones aplicadas.

Migraciones de la Etapa 1:

| Migración | Contenido | Respaldo previo (pg_dump, antes de migrar) |
| --- | --- | --- |
| `20261011T1817_add_budget_revision` | `ProjectBudget.revision Int @default(1)` | `/tmp/opencode/backups/nexus-dev-20261011-131710-pre-revision.sql` (4.282.100 bytes) |
| `20261011T1826_add_budget_baseline` | tabla `BudgetBaseline` + `@@unique([budgetId, version])` | `/tmp/opencode/backups/nexus-dev-20261011-132610-pre-baseline.sql` (4.404.820 bytes) |

**Hash del contrato (marker de la base):**
`07381774a799e22873af0cbf20aff2bc46ae1d20c2bd9e6b63a27eb935c8c335`
(coincide con `migrations/app/refs/db.json` y con el `markerHash` que reporta
el CLI al aplicar migraciones en una base nueva).

Aviso: los respaldos viven en `/tmp` (efímeros) y `migrations/` está en
`.gitignore`; ningún artefacto de migración quedó versionado.

---

## 7. Archivos de prueba y cantidad de pruebas

| Archivo | Pruebas | Cobertura |
| --- | --- | --- |
| `lib/apu-engine.test.ts` | 24 | motor APU/AIU, `decimalToMicro`, redondeo half-up, AIU por defecto |
| `lib/lean-engine.test.ts` | 21 | planificador Lean, ventanas, PPC |
| `lib/report-engine.test.ts` | 3 | EVM honesto ("No medible") |
| `lib/projects.test.ts` | 9 | ciclo de vida del proyecto, roles D7 |
| `lib/budget-guards.test.ts` | 13 | guardas de guardado sin cambios |
| `lib/tenant-context.test.ts` | 2 | rol D7 del presupuesto (`canGovernBudget`) |
| `lib/tenant-db.integration.test.ts` | 15 | CAS de estado, bloqueo, pertenencia cruzada, revisión (requiere `TEST_DATABASE_URL`) |

Totales reales de la suite:

```
 Test Files  6 passed | 1 skipped (7)
      Tests  72 passed | 15 skipped (87)
```

Compuerta de salida: `pnpm exec tsc --noEmit` → sin errores; `pnpm test` → la
tabla anterior; `pnpm build` → «✓ Compiled successfully in 87s» +
«Finished TypeScript in 9.9s».
