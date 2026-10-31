# V10 · M5 — Diseño detallado: `finance` pasa a `domains/finance`

Estado: **solo diseño, sin implementar.** Rama `chore/HU-esquema-prisma-modular-01`, base `aa8e36a`. Autorizado: M5 (mover `finance` a `domains/finance`). Pendiente de aprobación: las decisiones D5-1 a D5-7 de la §9. No se ha movido ningún archivo ni cambiado `layers.json`, pruebas, Prisma ni migraciones.

Mediciones hechas con el codemod en modo simulación (`--dry`, no escribe), `check-layers` y búsquedas en todo el repositorio (`app/`, `components/`, `lib/`, `tests/`, `scripts/`, `e2e/`). Los conteos del diseño original (V10 §7·M5: «`finance/index` = 37; `tax` = 14…») eran de antes de E5/M3/M4 y ya no valen; los de abajo son los actuales.

## 1. Qué hay hoy

Cinco carpetas, 35 archivos (18 de producción y 17 pruebas, 7 de ellas de integración):

| Carpeta | Archivos de producción | Capa hoy | Qué es |
|---|---|---|---|
| `lib/finance` | `index`, `series`, `cop-amount`, `keypad`, `payment-scan` | `index` y `series`: **foundation** (por unidad); el resto: `finance` | Tres tipos de cosas mezcladas (hallazgo H14) |
| `lib/accounting` | `accounting-db`, `ledger`, `ledger-db`, `puc`, `reports`, `reports-db` | `finance` | Contabilidad: asientos, plan de cuentas, reportes |
| `lib/tax` | `tax`, `tax-db` | `finance` | Impuestos |
| `lib/receivables` | `aging` (**foundation**), `receivables-db` (`finance`) | mixta | Cartera |
| `lib/payments` | `checkout-port`, `intents`, `intents-db` | `finance` | Intenciones de pago y puerto de cobro |

`finance` **no es un área por ruta**: es una capa que `layers.json` asigna a cinco unidades (`lib/finance`, `lib/accounting`, `lib/tax`, `lib/receivables`, `lib/payments`) más tres excepciones de Foundation (`lib/finance/index.ts`, `lib/finance/series.ts`, `lib/receivables/aging.ts`). `domains` ya existe como área pero **no tiene archivos**.

### 1.1 Quién los usa hoy (todo el repositorio, no solo `lib/`)

| Archivo | Importadores de producción | Pruebas | Notas |
|---|---|---|---|
| `finance/index` (vocabulario de pagos) | **37** (31 en `app/`, 2 en `components/`, 4 en `lib/`) | 0 | Se importa como `@/lib/finance` (el directorio) |
| `finance/series` | 8 (5 `app/`, 3 `lib/`: `tenant/db`, `dashboard/notifications-db`, `industry/museum`) | 1 | Fechas y series de Bogotá |
| `receivables/aging` | 3 (2 `app/`, `business/sales/money-service`) + 2 de la misma familia | 0 | |
| `finance/cop-amount` | 2 (`app/finance/validators`, `payment-scan`) | 0 | Pura |
| `finance/keypad`, `finance/payment-scan` | 1 cada uno, ambos de interfaz (`components/molecules/keypad`, `app/finance/_components/scan-payment-sheet`) | 0 | Ayudas de captura en pantalla |
| `tax` | 3 de `app/` + `accounting` + `receivables` + `payments` | 3 | Hoja del grafo (solo importa `plain-date`) |
| `accounting` | hasta 3 de `app/` por archivo, `runtime` y `receivables` | 9 | |
| `receivables-db` | 5 de `app/` | 1 | |
| `payments` | 4 de `app/`, `integrations`, `runtime` | 7 | |

### 1.2 Hacia dónde salen (todo lo que las cuatro familias importan)

- A **foundation**: `prisma/db`, `format`, `plain-date`, `ports`.
- A **business** (permitido para `domains`): `business/sales/money-error` (accounting), `business/sales/money-service` (receivables, payments), `store/store-settle` (payments), `data-exchange/table` (accounting).
- Dentro de la familia: `accounting → tax`, `receivables → accounting`, `receivables → tax`, `payments → tax`. **Sin ciclos.**
- Hacia `industry`, `platform` o `experience`: **ninguno** (aceptación de M5 ya cumplida hoy).
- Ningún archivo de `business` ni de `core` importa las cuatro familias (solo `money-service` importa `aging`, que es Foundation y seguirá siéndolo).

## 2. Destino propuesto, archivo por archivo

```
lib/foundation/kernel/                 (nuevo; solo vocabulario puro)
  payment-vocabulary.ts   ← lib/finance/index.ts        (métodos, estados, categorías, etiquetas)
  finance-series.ts       ← lib/finance/series.ts (+ .test.ts)
  aging.ts                ← lib/receivables/aging.ts (+ .test.ts)
  cop-amount.ts           ← lib/finance/cop-amount.ts (+ .test.ts)

lib/payment-input/                     (nuevo; capa experience)
  keypad.ts, payment-scan.ts (+ .test.ts de cada uno)

lib/domains/finance/                   (nuevo; área domains)
  tax/          ← lib/tax/*           (tax, tax-db + pruebas)
  accounting/   ← lib/accounting/*    (accounting-db, ledger, ledger-db, puc, reports, reports-db + 6 pruebas)
  receivables/  ← lib/receivables/receivables-db.ts (+ prueba de integración)
  payments/     ← lib/payments/*      (checkout-port, intents, intents-db + 4 pruebas)
```

Resultado: `lib/finance/`, `lib/accounting/`, `lib/tax/`, `lib/receivables/` y `lib/payments/` **dejan de existir**. Las pruebas viajan con su código (las de integración incluidas). Sin cambios de lógica: solo rutas, y dos archivos cambian de nombre (D5-2).

Por qué cada destino:

- **Kernel** — los cuatro archivos (más `aging`) son puros: ninguno importa nada de Nexus, ni `db`, ni `fs`, ni `process.env`, ni red (hoy lo vigila `tests/architecture/e5-compartido.test.ts`). `cop-amount` también cumple, y lo usan una validación del servidor y una ayuda de pantalla, de modo que Foundation es su sitio natural.
- **payment-input (experience)** — `keypad` y `payment-scan` solo los consume la interfaz. D-V10-4 los dejaba como «experience o `business/money`»; `business/money` arrastraría ayudas de pantalla a una capa reutilizable.
- **domains/finance** — tal como propone Q-3, que esta autorización de M5 confirma.
- `money-service`, caja y documentos **no se mueven**: siguen en `business/sales` (D-V10-4, opción A).

## 3. Cambios en `layers.json`

1. **Paso previo (M5.0), sin mover archivos:** las cinco unidades `finance` pasan a capa `domains`, se elimina la capa `finance` y su mención en las listas `mayImport` de `integrations`, `platform`, `industry`, `experience` y `runtime`. Los permisos son idénticos (`domains` = `foundation, core, business`, igual que `finance`), así que no debe aparecer ninguna violación nueva. Es lo que permite mover los módulos uno a uno sin violaciones transitorias.
2. En cada etapa se retira la unidad vieja. Al terminar desaparecen las tres excepciones de Foundation (el área se deduce de la ruta `lib/foundation/…`) y las unidades `lib/tax`, `lib/accounting`, etc.; `lib/domains/finance/**` y `lib/foundation/kernel/**` se clasifican **por ruta**, sin unidad.
3. Se añade una unidad: `lib/payment-input` → `experience`.
4. Se actualiza la descripción de `domains` («hoy ninguna con archivos»).

Excepciones del verificador: **0, tope 0, sin cambios.** Ciclos de tipos: tope 3, sin cambios.

## 4. Orden de ejecución propuesto

Siete commits locales, cada uno con `git add -A` completo. Antes de pasar al siguiente se comprueba que el commit compila **solo** (copia extraída con `git archive` + `tsc`), no solo el árbol de trabajo: es la lección de M4.

| Etapa | Contenido | Archivos movidos | Archivos con referencias reescritas (simulación por etapa) |
|---|---|---|---|
| **M5.0** | Reclasificar unidades `finance` → `domains` y eliminar la capa `finance`; ajustar pruebas que la nombran | 0 | solo `layers.json` y pruebas |
| **M5.1** | Kernel: `payment-vocabulary`, `finance-series`, `aging`, `cop-amount` | 7 | 49 archivos (la mayor parte, por los 37 de `@/lib/finance`) |
| **M5.2** | `payment-input`: `keypad` y `payment-scan` | 4 | 2 |
| **M5.3** | `domains/finance/tax` | 4 | 17 |
| **M5.4** | `domains/finance/accounting` | 12 | 14 |
| **M5.5** | `domains/finance/receivables` | 2 | 7 |
| **M5.6** | `domains/finance/payments` | 6 | 11 |
| **M5.7** | Pruebas nuevas (`tests/architecture/v10-finance.test.ts`), informe `V10-M5-resultados.md`, decisiones y hoja de ruta | 0 | solo documentación |

Total simulado: **35 archivos movidos, 83 archivos distintos con referencias reescritas** (la suma por etapa da 100 porque un mismo archivo puede aparecer en varias) (110 importaciones con alias, 35 relativas, 11 rutas literales); 50 de ellos en `app/`. Sin destinos duplicados ni preexistentes.

Se ordena así porque el kernel lo importan casi todos y va primero; entre los módulos, de la hoja hacia arriba (`tax` no depende de nadie; `accounting` de `tax`; `receivables` de ambos; `payments` solo de `tax`).

## 5. Riesgos y cómo se cubren

| # | Riesgo | Cobertura |
|---|---|---|
| R1 | **Pruebas negativas que se vuelven vacías.** `e3-dominios.test.ts` comprueba que Core «no importa ningún dominio» con la expresión `/@\/lib\/(…\|accounting\|tax\|receivables)\b/` y otra con `accounting` para el despachador. Tras mover, esas expresiones dejan de coincidir con cualquier ruta real y **pasarían sin vigilar nada**. | Actualizarlas a `@/lib/domains/finance` en el mismo commit de cada etapa, y comprobar con una mutación en copia desechable (inyectar un import de Core a `domains/finance/accounting`) que la prueba falla |
| R2 | `tenant-scope.test.ts` fija la ruta `lib/payments/intents-db.ts` en `SCOPED_ELSEWHERE` | La prueba «cada excepción sigue existiendo» falla de forma visible si la ruta queda vieja; se actualiza en M5.6. Finance **no** se añade a las exclusiones del panel: sigue vigilado |
| R3 | Archivos omitidos por un `git add` parcial (ocurrió en M4) | `git add -A` completo, árbol limpio tras cada commit y compilación del commit en copia limpia |
| R4 | Importar `@/lib/finance` (37 sitios) apunta hoy al directorio; el cambio de nombre a `payment-vocabulary` reescribe los 37 | El codemod resuelve el índice; `tsc` y las 1 747 pruebas lo confirman. Alternativa en D5-2 |
| R5 | Cliente/servidor: el vocabulario y las series los importan componentes `"use client"` | Siguen siendo módulos puros sin `node:`/`db`; la prueba de pureza del kernel se conserva y se amplía a los cuatro archivos |
| R6 | Ramas paralelas que importen las rutas viejas | Cualquier rama deberá reaplicar el codemod (igual que en M4); `integracion/local-revision` sigue sin integrarse (P-13) |
| R7 | Pruebas de integración con base de datos (7 de las 17 se mueven) | Contenedor desechable propio con `nexus_e5_test`, `pg_trgm` antes de las migraciones, sin tocar `nexus-postgres` ni `nx-pg`; se elimina al terminar |

## 6. Criterios de aceptación de M5

1. `check:layers`: 0 violaciones, 0 incoherentes, 0 huérfanas, **0 excepciones (tope 0)**, 0 ciclos de valores y 3 de tipos (tope 3). La capa `finance` ya no existe.
2. `lib/finance`, `lib/accounting`, `lib/tax`, `lib/receivables` y `lib/payments` no existen; `lib/domains/finance/{tax,accounting,receivables,payments}` y `lib/foundation/kernel` contienen exactamente los archivos de la §2.
3. Cero imports desde `domains/finance` hacia `industry`, `platform` o `experience`; ninguno desde `business`, `core`, `foundation` o `automation` hacia `domains` (Core y Business siguen hablando con Finance por puertos).
4. Los cinco archivos de `kernel` no importan nada de Nexus, ni `node:`, ni `process.env`, ni `fetch`.
5. Exportaciones de los 18 archivos de producción **idénticas** antes y después (herramienta `cmp-exports`).
6. Las 15 operaciones y el OpenAPI, idénticos byte a byte; `prisma/schema/**` y `migrations/` sin cambios (`storageHash 191a1245…03007`); los 7 puertos siguen conectados solo en `lib/runtime/ports.ts`.
7. `pnpm verify` verde; pruebas unitarias: **mismo número que ahora (116 archivos, 1 747 pruebas)** más las nuevas de M5; integración: 66 archivos / 413 pruebas (más las nuevas).
8. Cada uno de los siete commits compila y pasa `check:layers` por separado (comprobado en copias extraídas).
9. Las pruebas negativas actualizadas (R1) demostradas con una mutación en copia desechable.

## 7. Qué NO entra en M5

`money-service` y la caja (D-V10-4 A), `lib/construction`, `tenant/db.ts`, M6–M8, Prisma P3–P6, la pasada documental de rutas antiguas (P-12) ni los informes históricos E5/E7. Tampoco se cambia comportamiento, contratos públicos, RLS ni autenticación.

## 8. Reversibilidad

Cada etapa es un commit independiente y revertible en orden inverso (el más reciente primero). M5.0 es solo configuración. No hay migraciones ni datos involucrados.

## 9. Decisiones que necesitan aprobación

| # | Decisión | Recomendación | Alternativa |
|---|---|---|---|
| **D5-1** | Anidación `lib/domains/finance/<módulo>` (Q-3) | Confirmar (ya la propone Q-3 y la petición dice «finance a domains/finance») | `lib/domains/<módulo>` plano |
| **D5-2** | Nombres en kernel: `index.ts` → `payment-vocabulary.ts`, `series.ts` → `finance-series.ts` | Renombrar: un `index.ts` suelto en `foundation/kernel` sería ambiguo y `@/lib/finance` desaparece | Conservar `index.ts`/`series.ts` (importadores `@/lib/foundation/kernel` y `…/kernel/series`) |
| **D5-3** | Destino de `cop-amount` | `foundation/kernel` (pura; la usan servidor y pantalla) | `lib/payment-input` (experience) |
| **D5-4** | Destino de `keypad` y `payment-scan` | Nueva unidad `lib/payment-input` (experience) | `business/money` (arrastra ayudas de pantalla a una capa reutilizable) |
| **D5-5** | Paso previo M5.0: reclasificar las unidades a `domains` y eliminar la capa `finance` antes de mover | Sí: evita violaciones transitorias | Mover todo en un solo commit grande |
| **D5-6** | Informes históricos (E5/E7) y documentación viva con rutas antiguas | No tocarlos; los absorbe la pasada P-12 | Actualizarlos dentro de M5 |
| **D5-7** | Verificación con un contenedor Docker desechable propio (`nexus_e5_test`) para la integración | Mismo procedimiento que en M4, sin tocar `nexus-postgres` ni `nx-pg` | Solo pruebas unitarias (no cubre las 7 de integración que se mueven) |

**No se ha iniciado la implementación.** Esperando aprobación de D5-1 a D5-7 (o sus ajustes) para empezar por M5.0.
