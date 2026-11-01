# Etapa 2 — Evidencias PASO 0 (reproducibilidad, pruebas, limpieza)

> Fecha: 2026-10-11 · Rama: `feature/construction-apu-engine` · HEAD: `2be9776fa2e271861217b7a2ee0382485e50a80b`
> Este documento cierra los tres pendientes de evidencia antes de la Biblioteca Maestra (2.2–2.4).

---

## a) Clon limpio → base vacía → `prisma db migrate`

**Procedimiento real ejecutado**

```bash
git clone /home/craxker/github/nexus-thrive /home/craxker/backups/nexus-thrive/clean-repro-20261011-210446
cd clean-repro-20261011-210446 && pnpm install --prefer-offline
# base PostgreSQL VACÍA (misma instancia local)
psql "$ADMIN" -c 'CREATE DATABASE nexus_clean_repro;'
DATABASE_URL="$CLEANDB" pnpm exec prisma db migrate --db "$CLEANDB"
```

**Salida real (resumida) de `prisma db migrate` sobre la base vacía**

```json
{
  "ok": true,
  "migrationsApplied": 11,
  "migrationsTotal": 11,
  "markerHash": "b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7",
  "summary": "Applied 11 migration(s) (163 operation(s)) across 1 contract space(s)",
  "pathDecision": { "fromHash": "empty", "toHash": "b100b157…", "alternativeCount": 1 }
}
```

**Camiño elegido (11 migraciones, en orden)**

```
20261008T0438_baseline
20261008T0439_migration
20261008T2100_add_audit_log_and_suspension
20261008T2202_add_adaptive_onboarding_profile
20261011T0003_add_project_container
20261011T0102_add_project_budget_apu
20261011T0147_add_lean_planner
20261011T0342_add_field_log
20261011T1817_add_budget_revision
20261011T1826_add_budget_baseline
20261012T0021_etapa2_apu_active_createdat
```

**Comparación clon limpio ↔ dev (tras poner dev al día)**

| Métrica | Clon limpio (`nexus_clean_repro`) | dev (`nexus`) | ¿Coincide? |
| --- | --- | --- | --- |
| `markerHash` | `b100b157…c335` | `b100b157…c335` | ✅ |
| Tablas `public` (BASE TABLE) | 28 | 28 | ✅ |
| Nombres de tablas (diff) | — | — | ✅ `TABLAS_IDENTICAS` |
| CHECK constraints (enums) | 20 | 20 | ✅ |
| `ApuItem` columnas | `active, createdAt, imageUrl` presentes | presentes | ✅ |

Enums: Prisma 8 **no** crea tipos `ENUM` de PostgreSQL (`typtype='e'` = 0). Los modela como
columnas `text` con **CHECK constraints** (p. ej. `ApuItem_category_check_cb615411`:
`category = ANY (ARRAY['MATERIAL','MANO_DE_OBRA','EQUIPO','TRANSPORTE'])`). Por eso se comparan
CHECK constraints y no tipos enum.

### Por qué "11 vs 12 vs 23"

- **14 migraciones en disco** (`prisma migration list`), pero el grafo tiene dos raíces y un fork:
  - dos raíces: `20261008T0438_baseline` (`null → 7924e5f`) y `20261010T0641_initial` (`null → a30e2c4c`);
  - duplicado/fork: `20261009T2235_migration` (`ab7da12 → 7924e5f`, repetido) y
    `20261011T2356_add_budget_lock_event` (`0738177 → 8b0874c`, rama que NO está en el camino a HEAD).
- El replay a HEAD (`b100b157`) selecciona **11 migraciones** (`alternativeCount: 1`). Las otras 3 no
  se aplican como pasos: el contrato destino `b100b157` ya *incluye* el efecto de
  `BudgetLockEvent` (creación de la tabla) aunque esa rama quede colgada en el grafo. Prueba: el plan
  de 163 operaciones incluye `table.BudgetLockEvent` y las columnas `ApuItem.active/createdAt/imageUrl`.
- El "esperado: 12" cae entre esos conteos (12 ≈ 11 aplicadas + la rama colgada, o 12 de las 14 menos
  las reconstrucciones de baseline). El conteo canónico verificado es **11 aplicadas / 28 tablas**.
- El "**23 tablas**" reportado en `prisma8-replay.md` era un **subconteo** sobre la misma base de
  reproducción: para el mismo `markerHash` `b100b157` el conteo canónico es **28**. Se corrige aquí.

### Estado de dev antes/después (integridad)

- dev estaba en `currentContract: 0738177…` con **1 migración pendiente**
  (`20261012T0021_etapa2_apu_active_createdat`): **27 tablas**, sin `BudgetLockEvent` y sin las
  columnas de Etapa 2 en `ApuItem`/`ApuActivity`.
- Se respaldó antes de tocar:
  `/home/craxker/backups/nexus-thrive/nexus-dev-20261011-211701-pre-etapa2-apu.sql` (4.4 MiB).
- Se aplicó la migración pendiente: dev quedó en **`currentContract = targetContract = b100b157…`**,
  `summary: "Up to date"`, **28 tablas**. Coincide con el clon limpio.

---

## b) `pnpm test:integration` — 29 pruebas (27 previas + 2 añadidas)

Base de prueba dedicada creada y migrada a HEAD: `nexus_test_etapa2` (11 migraciones, `b100b157…`).

```bash
TEST_DATABASE_URL=… nexus_test_etapa2 DATABASE_URL=… nexus_test_etapa2 \
  pnpm exec vitest run lib/tenant-db.integration.test.ts --reporter=verbose
# → Test Files 1 passed (1) · Tests 29 passed (29)
```

**Nombres (describe > test)** — las 27 originales + las 2 nuevas (`2.0:`):

1. projects.updateProject (integración) > transición válida con expectedStatus correcto
2. projects.updateProject (integración) > expectedStatus viejo → STALE_STATUS y no escribe
3. projects.updateProject (integración) > transición no permitida → INVALID_TRANSITION
4. projects.updateProject (integración) > sin expectedStatus no hay cambio de estado
5. projects.updateProject (integración) > guardado sin cambios no escribe (updatedAt intacto)
6. projects.updateProject (integración) > nombre y descripción se actualizan sin tocar el estado
7. projects.updateProject (integración) > CANCELLED es terminal
8. projects.updateProject (integración) > proyecto inexistente → NOT_FOUND
9. presupuesto: bloqueo y pertenencia (integración) > el otro negocio no ve el presupuesto ni el proyecto
10. presupuesto: bloqueo y pertenencia (integración) > el otro negocio no puede tocar capítulos ni partidas
11. presupuesto: bloqueo y pertenencia (integración) > guardado sin cambios no avanza la revisión
12. presupuesto: bloqueo y pertenencia (integración) > cambio real sí avanza la revisión
13. presupuesto: bloqueo y pertenencia (integración) > revisión vieja → STALE_REVISION
14. presupuesto: bloqueo y pertenencia (integración) > presupuesto bloqueado: nada se muta ni se borra
15. presupuesto: bloqueo y pertenencia (integración) > verifyTotals sigue cuadrando tras las mutaciones
16. …línea base, autor y transiciones… > 1.10: aprobar línea base solo OWNER (helper canGovernBudget)
17. … > 1.10: línea base es inmutable (no hay update/delete en la API de datos); se pueden crear múltiples versiones
18. … > 1.10: version incrementa y budgetRevision guarda la revisión del presupuesto al aprobar
19. … > 1.10: desbloqueo con motivo funciona - setLocked(false, reason) sí desbloquea
20. … > **2.0: desbloqueo sin motivo falla - setLocked(false) sin reason lanza error y no desbloquea** ⬅ AÑADIDA
21. … > **2.0: bloquear y desbloquear NO borra líneas base (solo añade BudgetLockEvent)** ⬅ AÑADIDA
22. … > 1.10: Informe Cero lee la última línea base o muestra 'Sin línea base aprobada'
23. … > 1.6: autor de bitácora desde la sesión (createEntry usa authorName/authorRole del contexto)
24. … > updateProject: transiciones válidas DRAFT→BIDDING→APPROVED→IN_EXECUTION→COMPLETED
25. … > updateProject: transiciones inválidas (no saltear, no retroceder)
26. … > updateProject: terminales (COMPLETED/CANCELLED) no admiten salida
27. … > updateProject: STALE_STATUS si expectedStatus no coincide
28. … > updateProject: rol - helper puro canChangeProjectStatus (OWNER/SUPERADMIN sí, STAFF no)
29. … > guardado sin cambios NO sube revisión (verificación explícita)

**Cobertura de los 3 comportamientos pedidos**

| Comportamiento | Antes | Ahora |
| --- | --- | --- |
| Desbloqueo **sin motivo falla** | ❌ (solo existía la de "con motivo") | ✅ #20 (añadida): `setLocked(false)` sin `reason` → `rejects.toThrow("Desbloqueo requiere un motivo.")` y sigue bloqueado |
| Desbloqueo **con motivo funciona** | ✅ nombre engañoso ("no requiere motivo…") | ✅ #19 (renombrada a la verdad) + #20/#21 |
| **No borra líneas base** | ❌ | ✅ #21 (añadida): `listBaselines` mantiene el count tras lock/unlock y se registran `BudgetLockEvent` |

> Corrección de verdad: la capa de datos **sí** exige motivo (`tenant-db.setLocked` lanza
> `"Desbloqueo requiere un motivo."`); el nombre del test #19 original afirmaba lo contrario. Se
> renombró y se añadió la prueba negativa.

---

## c) `git status` limpio y restos `catalog/.wip`

- Restos eliminados (todos **directorios vacíos**, no versionados por git):
  `app/(tenant)/(app)/quotes/catalog/_components`, `app/api/webhooks/clerk`, `scripts/`,
  `nexus-thrive-brand/brand/fonts/public_stunt/img/`.
- `find . -type d -empty` (excluyendo `node_modules/.git/.next`): **sin resultados**.
- `conversations/` (transcripciones de sesión) se agregó a `.gitignore` para no versionarlas ni
  ensuciar el estado.
- `git status --short`: **limpio** (sin modificaciones pendientes fuera de este commit).

---

## Resumen

| Punto | Estado |
| --- | --- |
| a) Clon limpio reproduce el esquema (11 migr., hash `b100b157`) y coincide con dev | ✅ |
| a) dev puesto al día con respaldo previo | ✅ |
| b) 29/29 pruebas nombradas; 2 faltantes escritas | ✅ |
| c) `git status` limpio; sin restos catalog/.wip | ✅ |
