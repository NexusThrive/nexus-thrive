# V10 · M5 — Resultados: `finance` pasa a `domains/finance`

Estado: **M5 ejecutada** (rama local `chore/HU-esquema-prisma-modular-01`, sin push, PR, merge ni despliegue). Diseño previo: [`V10-M5-diseno.md`](V10-M5-diseno.md). Decisiones D5-1 a D5-7 aprobadas con las recomendaciones del diseño. Base: `aa8e36a` (cierre de M4). No se inició M6 ni ninguna etapa posterior.

## 1. Resultado en una frase

Las cinco carpetas de Finance (`lib/finance`, `lib/tax`, `lib/accounting`, `lib/receivables`, `lib/payments`) **ya no existen**. Sus 35 archivos (18 de producción y 17 pruebas) viven ahora en tres sitios, cada uno con una responsabilidad clara:

```
lib/foundation/kernel/      payment-vocabulary · finance-series · aging · cop-amount      (puro, sin imports de Nexus)
lib/payment-input/          keypad · payment-scan                                          (Experience)
lib/domains/finance/        tax/ · accounting/ · receivables/ · payments/                  (Domains)
```

La capa heredada `finance` desapareció de `layers.json`. Ninguno de los tres sitios necesita unidades en `layers.json`, salvo `lib/payment-input` (una, Experience): el área de los otros dos se deduce de su ruta.

## 2. Commits (todos locales)

| Etapa | Commit | Contenido | Archivos movidos | Archivos con referencias reescritas |
|---|---|---|---|---|
| Diseño | `ceca542` | `V10-M5-diseno.md` | 0 | 0 |
| M5.0 | `259e684` | Las cinco unidades pasan a la capa `domains` y se retira la capa `finance` | 0 | `layers.json` y 3 pruebas |
| M5.1 | `dc3ef22` | Kernel de Foundation | 7 | 49 |
| M5.2 | `3bad057` | `lib/payment-input` (Experience) | 4 | 2 |
| M5.3 | `b667c5d` | `domains/finance/tax` | 4 | 17 |
| M5.4 | `16755cf` | `domains/finance/accounting` | 12 | 14 |
| M5.5 | `68e8e37` | `domains/finance/receivables` | 2 | 7 |
| M5.6 | `f50f951` | `domains/finance/payments` | 6 | 11 |
| M5.7 | (este commit) | Pruebas de la familia y documentación | 0 | 0 |

Los 35 archivos movidos y las reescrituras de cada etapa coinciden con la simulación del diseño (83 archivos distintos; la suma por etapa da 100 porque un archivo puede aparecer en varias). Todos los movimientos son `git mv`, así que el historial de cada archivo se conserva.

## 3. Qué se movió y por qué ahí

| Antes | Ahora | Razón |
|---|---|---|
| `finance/index.ts` | `foundation/kernel/payment-vocabulary.ts` | Vocabulario puro de pagos; lo usan 37 archivos |
| `finance/series.ts` (+ prueba) | `foundation/kernel/finance-series.ts` | Cálculo puro de series y fechas de Bogotá |
| `receivables/aging.ts` (+ prueba) | `foundation/kernel/aging.ts` | Antigüedad de cartera, pura; la usa `money-service` (Business) |
| `finance/cop-amount.ts` (+ prueba) | `foundation/kernel/cop-amount.ts` | Análisis de montos en pesos, puro; lo usan una validación del servidor y una ayuda de pantalla |
| `finance/keypad.ts`, `payment-scan.ts` (+ pruebas) | `payment-input/` | Ayudas de captura que solo consume la interfaz |
| `tax/*` | `domains/finance/tax/` | Hoja de la familia: solo depende de Foundation |
| `accounting/*` | `domains/finance/accounting/` | Contabilidad |
| `receivables/receivables-db.ts` | `domains/finance/receivables/` | Cartera |
| `payments/*` | `domains/finance/payments/` | Intenciones de pago y puerto de cobro |

`money-service`, la caja y los documentos **no se movieron**: siguen en `business/sales` (D-V10-4, opción A). Los tres nombres que cambian de archivo son `index` → `payment-vocabulary` y `series` → `finance-series` (D5-2); los símbolos exportados no cambian.

## 4. La familia `domains/finance` hoy

Aristas entre módulos (medidas sobre el código, todas importaciones de valor):

```
accounting → tax        (2)
payments   → tax        (1)
receivables → accounting (1)
receivables → tax       (1)
```

Sin ciclos. Antes de M5 existía además `payments → receivables` (por `aging`); desapareció porque `aging` pasó al kernel.

| Módulo | Archivos de producción | Salidas permitidas que usa | Quién lo importa |
|---|---|---|---|
| `tax` | 2 | Foundation | `runtime` (1), `app/` (5), y los otros tres módulos de la familia |
| `accounting` | 6 | Foundation, Business (`money-error`, tabla de intercambio), `tax` | `runtime`, `experience` (`onboarding`), `app/` (6), `receivables` |
| `receivables` | 1 | Foundation, kernel, Business (`money-service`), `accounting`, `tax` | `app/` (5) |
| `payments` | 3 | Foundation, kernel, Business (`money-service`, `store-settle`), `tax` | `runtime` (puerto de cobro), `integrations` (webhook entrante), `app/` (4) |

Ningún archivo de `foundation`, `core`, `business`, `events`, `operations`, `tenant` ni `auth` importa la familia; ningún archivo de la familia importa `industry`, `platform`, `experience`, `integrations` ni `runtime`. Core y Business siguen hablando con Finance por **puertos** (E5/E7), conectados solo en `lib/runtime/ports.ts`.

## 5. Cambios de configuración y pruebas

- **`layers.json`:** se eliminó la capa `finance` y su mención en las listas `mayImport`; se retiraron las unidades `lib/finance`, `lib/tax`, `lib/accounting`, `lib/receivables`, `lib/payments` y las tres excepciones de Foundation; se añadió la unidad `lib/payment-input` (Experience); se actualizó la descripción de `domains`. **Excepciones del verificador: 0 (tope 0). Ciclos de tipos: 3 (tope 3).**
- **Pruebas que se habrían quedado vacías (riesgo R1 del diseño), actualizadas:** las dos de `e3-dominios.test.ts` («Core no importa dominios» y «el despachador no importa dominios») nombraban `accounting`, `tax` y `receivables` por ruta; ahora vigilan `domains/finance`. Se demostró con mutaciones que fallan si Core importa la familia.
- **`e5-compartido.test.ts`:** cubre los cuatro módulos del kernel y exige que la carpeta no contenga otros.
- **`tenant-scope.test.ts`:** solo cambió la ruta de la excepción de `PaymentIntent` en `intents-db.ts`. `domains/finance` **no** se añadió a las exclusiones del panel: sigue vigilado por la prueba de aislamiento por negocio (se demostró con una consulta a `Payment` sin `tenantId`, que falla).
- **Prueba nueva `tests/architecture/v10-finance.test.ts` (36 pruebas; con las 3 del kernel que se añadieron a `e5-compartido` suman las 39 nuevas):** una sección por etapa (contenido exacto de cada carpeta, área por ruta sin unidad, lista cerrada de imports, quién puede importarla) y una de familia (cuatro módulos, aristas exactas, sin ciclos, destinos permitidos, fin de la capa `finance` y de las carpetas de origen).
- **Un comentario corregido** en `lib/tenant/db.ts` (decía `lib/finance-series`, una ruta que nunca existió).

## 6. Resultados de verificación

| Comprobación | Resultado |
|---|---|
| `pnpm verify` completo tras cada etapa (capas, lint, tipos, unitarias, integración, build) | Verde en M5.1 a M5.6 |
| Exportaciones de los 18 archivos de producción (197 exportaciones: 39 + 7 + 37 + 83 + 5 + 26) | **Idénticas** |
| Pruebas unitarias | 117 archivos, **1 786** (base 116 y 1 747; +39, todas de arquitectura: M5.1 +3, M5.2 +6, M5.3 +5, M5.4 +9, M5.5 +4, M5.6 +7, M5.7 +5) |
| Pruebas de integración | 66 archivos, **413** (sin cambios) |
| `check:layers` | 290 archivos, 0 violaciones, 0 huérfanas, 0 incoherentes, 0 excepciones, 0 ciclos de valores, 3 de tipos |
| Archivos por capa | `domains` 12 · `foundation` 22 · `experience` 33 · `business` 59 · `core` 54 · `platform` 32 · `integrations` 23 · `industry` 47 · `automation` 4 · `runtime` 4 |
| 15 operaciones y OpenAPI | **Idénticos** byte a byte |
| Prisma y migraciones | Sin cambios (`markerHash 191a1245…03007`; 61 de 61 migraciones aplicadas en cada base desechable) |
| `HEAD` desde un árbol limpio (`git archive`) en cada etapa | `tsc` 0 errores, mismos archivos que los rastreados, `check:layers` y pruebas unitarias en verde |
| Mutaciones en copias desechables | Core importa tax / accounting / receivables / payments (falla `R3-core-no-importa-domains` y la prueba de Core); Business importa accounting / payments (falla `R3-business-no-importa-domains`); accounting importa una industria (falla `R1`); foundation importa `payment-input` (falla `R3-foundation-no-importa-experience`); import de `db` en el kernel y en `payment-input`; archivo intruso en el kernel; consulta sin `tenantId` en `intents-db` (falla `tenant-scope`) |

**Lección de M4 aplicada:** cada commit se hizo con `git add -A` completo y con el árbol limpio después. En las etapas **M5.1 a M5.6** se extrajo además el commit con `git archive` y se compiló y probó en esa copia (los commits no son intermedios entre sí: cada etapa es un commit único). M5.0 solo cambia configuración y se comprobó con `check:layers`, `tsc`, lint y pruebas unitarias antes de confirmarlo.

## 7. Incidencias durante la ejecución (sin impacto en el resultado)

- **M5.1, entorno:** la integración falló dos veces por falta de `DATABASE_URL` igual a `TEST_DATABASE_URL` (lo exige `test-integration.sh`) y de `WEBHOOK_ENCRYPTION_KEY`. Era el entorno de mi base desechable, no el código; con ambas definidas pasó todo.
- **M5.2:** un `@ts-expect-error` sobrante en mi prueba nueva (lo detectó `tsc` en `pnpm verify` antes de confirmar) y un directorio vacío (`lib/finance`) que `git mv` dejó atrás y que se eliminó con `rmdir`.
- **M5.5:** el codemod convirtió `./aging` en una ruta relativa larga; se pasó al alias `@/lib/foundation/kernel/aging`.
- **M5.6:** mi primera mutación de aislamiento usó `PaymentIntent`, el modelo exceptuado, y por eso no falló; se repitió con `Payment` y falló como debía.

## 8. Decisiones aplicadas (D5-1 a D5-7)

| # | Decisión | Aplicada |
|---|---|---|
| D5-1 | Anidación `lib/domains/finance/<módulo>` | Sí (cierra Q-3) |
| D5-2 | Renombrar `index.ts` y `series.ts` al entrar en kernel | Sí (`payment-vocabulary`, `finance-series`) |
| D5-3 | `cop-amount` en el kernel | Sí |
| D5-4 | `keypad` y `payment-scan` en `lib/payment-input` (Experience) | Sí |
| D5-5 | Paso previo M5.0 (reclasificar y retirar la capa `finance`) | Sí |
| D5-6 | No tocar informes históricos ni documentación viva con rutas antiguas | Sí; los absorbe la pasada P-12 |
| D5-7 | Verificación con contenedor desechable propio | Sí (`nexus-m5-itest`, base `nexus_e5_test`, 0 conexiones al eliminarlo; `nexus-postgres` y `nx-pg` no se tocaron) |

## 9. Riesgos y pendientes

1. **Documentación viva con rutas antiguas** (pasada P-12, sin hacer): `docs/internal/historico/v10-y-etapas/E5-resultados.md`, `E7-resultados.md`, `dinero-y-decimales.md`, `documentacion-de-modulos.md`, `hallazgo-fechas-utc-en-asientos.md`, `docs/wiki/03-arquitectura/anterior-a-v10/domain-and-data-model.md` y varios archivos de `.docs/`. Describen la estructura anterior a M5.
2. **Ramas paralelas:** cualquier rama que importe `@/lib/finance`, `@/lib/tax`, `@/lib/accounting`, `@/lib/receivables` o `@/lib/payments` tendrá que reaplicar el codemod; `integracion/local-revision` sigue sin integrarse (P-13).
3. **`lib/` sigue ancho a la vista:** quedan 63 entradas en su raíz (42 carpetas y 21 archivos sueltos; eran 66). M5 movió Finance, pero `core`, `business`, `integrations` y `experience` conservan carpetas en la raíz que `layers.json` ya clasifica pero V10 (M0–M8) **no programa mover**: ver el punto siguiente.
4. **Movimientos físicos sin etapa definida:** `tenant`, `auth`, `plans`, `usage`, `events`, `operations`, `capabilities`, `parties`, `files` hacia `core/`; `inventory`, `purchasing`, `pos`, `store`, `data-exchange`, `growth`, `presence`, `catalog` hacia `business/`; `providers`, `einvoice`, `google`, `maps` hacia `integrations/`; `navigation`, `dashboard`, `onboarding`, `site`, `motion`, `hooks`, `fonts` hacia `experience/`; los 21 archivos sueltos hacia `foundation/`. El diseño los dibuja en su árbol destino pero ninguna etapa los mueve. **Proponer una etapa nueva requiere su propio diseño y tu aprobación** (no se ha iniciado).

## 10. Diferencias respecto del plan original (V10 §7·M5)

| Plan | Realidad | Por qué |
|---|---|---|
| `finance/{keypad,cop-amount,payment-scan}` → `experience` o `business/money` | `cop-amount` al kernel; `keypad` y `payment-scan` a `lib/payment-input` | D5-3 y D5-4: `cop-amount` es puro y lo usa también el servidor |
| Conteos de importadores (`finance/index` = 37; `tax` = 14…) | Medidos de nuevo: el vocabulario de pagos sigue en 37 archivos de producción (31 de `app/`, 2 de `components/`, 4 de `lib/`; más una prueba de arquitectura que lo nombra); los demás son mucho menores (`tax`: 3 archivos de `app/` más la familia) | Los del diseño eran anteriores a E5/M3/M4 |
| «Los 3 archivos de kernel» | 4 archivos (se añade `cop-amount`) | D5-3 |
| (no previsto) paso M5.0 | Reclasificar las unidades antes de mover | D5-5: evita violaciones transitorias |

## 11. Estado de la hoja de ruta

- **Implementado:** M0, M1, M2, M3, M4 y **M5**.
- **Aprobado, no implementado:** D-V10-9, `SectorView`, permisos `members.*` y la comprobación previa (todo en M7); la pasada documental (P-12); la composición de suscriptores (P-11).
- **Pendiente de autorización:** M6, M7 y M8, y el movimiento físico de las carpetas del punto 4 de la §9 (etapa nueva, sin diseñar).

**No se inició M6 ni ninguna etapa posterior.**
