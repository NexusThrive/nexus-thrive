# V10 — Correspondencia definitiva de decisiones

Reconcilia la numeración **D-V10-1…9 del diseño** ([`V10-arquitectura-fisica.md`](../internal/historico/v10-y-etapas/V10-arquitectura-fisica.md) §8) con la de **las autorizaciones** (2026-10-31) y con las decisiones **P-1…P-13** de [`V10-revision-post-M0-M2.md`](../internal/historico/v10-y-etapas/V10-revision-post-M0-M2.md) §9.
No altera ni reinterpreta ninguna decisión ya aprobada: solo dice cuál es cuál, qué está **aprobado**, qué está **implementado** y qué sigue **pendiente**. Los informes históricos no se modifican.

## 0. Convención de nombres (para no volver a confundirlos)

| Sigla | Qué es | Dónde está definida |
|---|---|---|
| **D-V10-n** | Decisión de la **autorización** (la que se aprobó) | §1 de este documento |
| **Q-n** | **Pregunta abierta del diseño** (el diseño la llamó "D-V10-n"; se renombra Q-n solo aquí para distinguirla) | §2 de este documento y `V10-arquitectura-fisica.md` §8 |
| **P-n** (con guion) | Decisión de la **revisión previa a M3**, aprobada en la autorización de M3 | §3 de este documento y `V10-revision-post-M0-M2.md` §9 |
| **M0…M8** | Etapas de migración de V10 | `V10-arquitectura-fisica.md` §7 |
| **P3…P6** (sin guion) | **Etapas de Prisma** de la hoja de ruta (P5 = cambios de datos del esquema; P6 = RLS). **No** son las decisiones P-3…P-6 | `hoja-de-ruta.md` §5 |

> Ejemplo de la confusión posible: «P-5» es la decisión sobre `SectorView`; «P5» es la etapa Prisma de cambios de esquema. Cuando un documento histórico diga «cuando se autorice P5 (Prisma)» se refiere a la etapa Prisma.

## 1. Decisiones de la autorización (D-V10-1…9)

| Autorización (D) | Enunciado aprobado | Corresponde en el diseño a… |
|---|---|---|
| D-V10-1 | Sustituye a D-1; reorganización física incremental | Diseño D-V10-1 (igual) |
| D-V10-2 | Modelo de áreas, módulos y sectores | Diseño D-V10-2 (los nombres y el número de áreas: 9) y §2 |
| D-V10-3 | Reglas de dependencia entre áreas | Diseño §4 (en el diseño, "D-V10-3" era otra pregunta: Q-3) |
| D-V10-4 | Separación terminología / capacidades / procesos | Diseño §3 (en el diseño, "D-V10-4" era otra pregunta: Q-4) |
| D-V10-5 | Sector desconocido = general | Diseño D-V10-5 (igual) |
| D-V10-6 | Criterios crear/dividir/fusionar/reubicar/retirar | Diseño §5 (en el diseño, "D-V10-6" era el enum: Q-6) |
| D-V10-7 | Registro explícito de sectores | Diseño §3.4 y M2 (en el diseño, "D-V10-7" era presence/growth/benefits: Q-7) |
| D-V10-8 | Estructura física objetivo y migración incremental | Diseño §6–7 (en el diseño, "D-V10-8" eran las extensiones: Q-8) |
| D-V10-9 | Acceso a funciones de socios por módulo activo, respetando permisos | Diseño D-V10-9 (igual) |

Estado de las nueve:

| D | Aprobada | Implementada | Pendiente |
|---|---|---|---|
| D-V10-1 | Sí | Sí (M0 declara el cambio en `layers.json`; M1–M4 mueven archivos) | — |
| D-V10-2 | Sí | Sí (áreas por ruta, capas `domains` y `runtime`, M0). `platform` ya tiene archivos (M4) | `domains` ya tiene archivos (M5: `lib/domains/finance/`); completar `core` en sus etapas |
| D-V10-3 | Sí | Sí (verificador de reglas, M0) | — |
| D-V10-4 | Sí | Parcial: principio documentado y límites en `lexicon.ts` (M2) | Los procesos sectoriales llegan con M7 |
| D-V10-5 | Sí | Sí (M2) | — |
| D-V10-6 | Sí | Sí (se usaron en M1–M3; el reporte vive en `check-layers --report`) | — |
| D-V10-7 | Sí | Sí (registro y `runtime/sectors.ts`, M2) | Primera industria con definición propia (M7) |
| D-V10-8 | Sí | Parcial: M1–M5 | M6–M8 |
| D-V10-9 | **Sí, solo la dirección** | **No** | Implementación en M7, tras la comprobación de solo lectura sobre una copia (P-8) |

## 2. Preguntas abiertas del diseño (Q-n) y su resolución

Las resoluciones de esta tabla se tomaron al preparar M3 a partir de las recomendaciones del diseño y de las decisiones P ya aprobadas. Cuando una resolución es **propuesta** (no una aprobación textual), se marca así y se confirma al autorizar la etapa que la usa.

| Pregunta | Resolución | Estado | Se confirma / implementa |
|---|---|---|---|
| **Q-1 / Q-2** Sustituir D-1; nombre y número de áreas | Resueltas por D-V10-1 y D-V10-2 | Aprobada | Hecho |
| **Q-3** Anidación de `domains/finance` | **`lib/domains/finance/<módulo>`** (confirmada al autorizar M5, D5-1) | **Implementada en M5** | Hecho (`b667c5d`, `16755cf`, `68e8e37`, `f50f951`; ver `V10-M5-resultados.md`) |
| **Q-4** ¿`money-service` pasa a Finance? | **No.** Queda en `business/sales` | Aprobada (**P-2**) | Hecho (M3) |
| **Q-6** Enum `Vertical` | **Mantener el enum durante M7**; la opción B (texto + FK a `VerticalSetting`) es una dirección futura sujeta a la etapa Prisma | Aprobada (**P-6**) | Etapa Prisma P5 |
| **Q-7a** `presence`, `growth` | **Se quedan en `business`** | Propuesta (recomendación del diseño) | Se reabre solo si aparece un segundo módulo de análisis |
| **Q-7b** `benefits` | **`lib/platform/benefits/`** (ver §2.2) | **Implementada en M4**, con su prerrequisito (`withinLimit` → Foundation); **opción A confirmada por el dueño al cierre de M4** (§6) | Hecho (`e32f894`, `0de8609`) |
| **Q-8** `extensions/` | **No se introduce** | Propuesta (recomendación del diseño) | Se reabre con un requisito real de código externo o por negocio |

### 2.1 Q-3 — `domains/finance/<módulo>`: qué es y qué no es

> **Resuelta en M5 (2026-10-31).** El dueño autorizó M5 y aprobó D5-1: la anidación es `lib/domains/finance/{tax,accounting,receivables,payments}`. Lo que sigue es el texto previo a esa autorización, conservado como contexto; ya no es una propuesta.

- Es una **propuesta conceptual futura** sobre dónde terminarán `accounting`, `tax`, `receivables` y `payments` cuando se autorice M5. Sirve para que la regla «entre familias solo por contrato» tenga un lugar donde aplicarse.
- **No es una instrucción para crear directorios.** `lib/domains/` **no existe** y **no debe crearse vacío** ni antes de M5. No se crea ningún área, módulo ni carpeta por esta decisión.
- La capa `domains` de `layers.json` es una **entrada de configuración** sin archivos. Su descripción dice que `finance` «pasará aquí en M5»: es la intención documentada, **no una autorización**; M5 sigue pendiente. (No se modificó `layers.json` en esta revisión documental; si el texto se considera engañoso, se ajusta en la siguiente pasada de configuración.)
- Si al autorizar M5 se prefiere otra anidación (por ejemplo `finance/<módulo>` de tres niveles), se decide entonces; nada actual depende de ello.

### 2.2 Q-7b — `benefits`: ubicación prevista completa

**Qué es.** `lib/benefits` = 3 archivos, 906 líneas: `benefits.ts` (lógica pura de códigos, estado y textos), `benefits-db.ts` (acceso a datos: crear/canjear códigos, estado de acceso de un negocio, vencimiento de pruebas) y `benefit-cookie.ts` (cookie del código en el alta). Son los **códigos de acceso y promoción de Nexus** (tarjetas NFC/QR), un programa comercial de la plataforma, no una capacidad de operación de un negocio.

**Dónde está hoy.** `layers.json`: capa `business` (por decisión de E0). Sus archivos de producción solo importan Core y Foundation, así que no viola ninguna regla.

**Ubicación prevista:** **`lib/platform/benefits/`** (área `platform`).

**Evidencia (medida, solo lectura):**

| Dato | Hecho |
|---|---|
| Dependencias de producción | `benefits.ts`: ninguna. `benefits-db.ts`: `admin/db` (`createAdminDb`), `plans/*`, `capabilities/modules`, `core/sectors/verticals`, `prisma/db`. `benefit-cookie.ts`: `onboarding/types`, `next/headers`, y los dos archivos hermanos |
| Consumidores | 14 archivos: 11 en `app/` (alta/onboarding, canje `/c/[code]`, administración `/admin/beneficios`, layout y ajustes del negocio), 1 componente, y **2 en `lib/`**: `business/customers/customers-db.ts` y `data-exchange/exchange-db.ts` |
| Qué usan esos 2 de `lib/` | **Solo `withinLimit(limit, used)`**, una comparación genérica de una línea que está en `benefits.ts` por accidente; la usa también `app/[tenant]/(app)/crm/actions.ts` (H17 del diseño) |

**Por qué `platform` y no las alternativas:**

- *No `core/entitlements`:* `benefits-db` usa `createAdminDb`, la base de superadmin que V10 sitúa en `platform/admin` (M4). Un módulo de Core no puede importar `platform`, así que tendría que dividirse o quedaría en conflicto en cuanto `admin/db.ts` se mueva.
- *No seguir en `business`:* no es una capacidad de negocio reutilizable; el único contacto de Business con él es la función genérica `withinLimit`, que es lo que hay que sacar de ahí.
- *`platform` es compatible con sus consumidores:* la experiencia (`app/`, onboarding, ajustes del negocio) puede importar `platform` según la matriz; ningún módulo de `business` lo importaría una vez extraída `withinLimit`.

**Prerrequisito (resuelto en M4: `e32f894`).** Antes de mover `benefits`, extraer `withinLimit` a un lugar neutral — el diseño propone `foundation` (M6e) — y actualizar sus **3** usuarios (`customers-db`, `exchange-db`, `crm/actions`). Si no, `business → platform` violaría la matriz de áreas. Puede hacerse como un paso mínimo propio inmediatamente antes de M4.

**Puntos que se dejaron para M4 (resueltos en M4, ver «Resolución en M4» abajo):** (1) si `getTenantAccess` y `expireBenefitTrial`, que usan las pantallas del propio negocio, se quedan en `platform/benefits` (permitido: experiencia → platform) o se separan hacia Core como estado de acceso del negocio; (2) el destino definitivo de `benefit-cookie.ts` (hoy solo lo usan el alta y el canje).

**Qué NO hace esta decisión por sí sola:** no mueve nada. El movimiento lo ejecutó M4.

**Resolución en M4 (2026-10-31).**

| Componente | Destino | Razón (responsabilidad y consumidores reales) |
|---|---|---|
| `withinLimit` | **`lib/foundation/limits.ts`** | Comparación pura genérica; la usaban Business, data-exchange y una acción de CRM. Prerrequisito de mover `benefits` |
| `benefits.ts` | `platform/benefits/` | Lógica pura de los códigos de acceso de Nexus; consumida solo por puntos de entrada y por `benefits-db` |
| `benefits-db.ts` (canje, alta y edición de códigos) | `platform/benefits/` | Programa comercial de Nexus; usa `createAdminDb` para auditar el canje |
| `getTenantAccess` y `expireBenefitTrial` | **Se quedan en `benefits-db.ts`** | Dependen solo de Core, pero leen y escriben los datos de canje que el módulo posee, y todos sus consumidores (el layout y los ajustes del negocio, más la prueba) son puntos de entrada de la experiencia, que pueden importar platform. Separarlas exigiría partir `benefits-db.ts` y mover también `benefits.ts` a Core (necesitan `BenefitKind`/`normalizeBenefitKind`). Una prueba fija que `app/[tenant]` solo importa platform en esas tres referencias. **Opción A adoptada** por el dueño al cierre de M4 (§6): se mantienen las tres referencias y se aclara el criterio de aceptación del diseño. La alternativa de un módulo de acceso del negocio en Core queda **descartada por ahora y no planificada**; solo se reabre con una decisión nueva |
| `benefit-cookie.ts` | `platform/benefits/` | Cookie del alta y del canje (`/c/[code]`); depende de los dos archivos hermanos y solo lo usan esos dos flujos |

### 2.3 Q-7a y Q-8 — por qué no se crean áreas ni módulos

- `presence` (979 líneas) y `growth` (265) miden y activan la presencia en línea del negocio. Se quedan en `business` mientras no exista un segundo módulo de análisis que justifique una familia propia. Criterio para reabrir: ≥ 2 módulos de análisis con dependencias comunes (test de §4.3 del diseño).
- `extensions/` no pasa el test de área nueva: no existe hoy un requisito de código de terceros o por negocio. El registro de sectores (M2) ya permite que una industria aporte su definición. Se reabre con un requisito real y una decisión propia.

## 3. Decisiones P-1…P-13: aprobada / implementada / pendiente

Coinciden una a una con el texto de la autorización de M3 (P-1…P-13 son las mismas de [`V10-revision-post-M0-M2.md`](../internal/historico/v10-y-etapas/V10-revision-post-M0-M2.md) §9). No hay contradicción de numeración entre estos dos documentos.

| P | Decisión (tal como se aprobó) | Aprobada | Implementada | Pendiente |
|---|---|---|---|---|
| P-1 | Fusionar `documents` y `money` en `lib/business/sales/` | Sí | **Sí** (`de0b179`) | — |
| P-2 | Mantener `money-service` en `business/sales` | Sí | **Sí** (`de0b179`) | — |
| P-3 | `countries.ts` → Foundation; `inventory.ts` → Inventory, commits separados | Sí | **Sí** (`8cdc639`, `13c10b3`) | — |
| P-4 | Actualizar las tres pruebas de arquitectura sin cambiar sus aserciones | Sí | **Sí** (solo rutas) | — |
| P-5 | Aprobar el diseño de `SectorView`; no implementarlo ahora | Sí (solo el diseño) | **No** | Implementación en M7 |
| P-6 | Mantener el enum Prisma durante M7; opción B como dirección futura sujeta a la etapa Prisma | Sí | n/a (es no hacer cambios) | La opción B, en la etapa Prisma |
| P-7 | Permisos `members.*` conservando exactamente los roles actuales | Sí | **No** | Se implementan junto con D-V10-9 en M7 |
| P-8 | Aprobar la dirección de D-V10-9, condicionada a la comprobación de solo lectura sobre una copia antes de implementar | Sí, con condición | **No** | La comprobación y los cambios, en M7 |
| P-9 | M6c-a: no modificar los contratos de auditoría | Sí | n/a (es no hacer cambios) | — (vigente) |
| P-10 | Corregir la unidad huérfana y detectar unidades inexistentes | Sí | **Sí** (`8f640dc`) | — |
| P-11 | Posponer el movimiento de la composición de suscriptores | Sí (posponer) | n/a | El movimiento, cuando se autorice |
| P-12 | Actualizar la documentación antigua en una pasada documental independiente | Sí | **No** | La pasada documental (ver `V10-M3-resultados.md`) |
| P-13 | No integrar `integracion/local-revision` durante M3 | Sí | n/a (vigente) | Decidir su integración después |

## 4. Verificación de coherencia (revisión documental)

- Las 13 decisiones P de la tabla anterior se contrastaron con el texto de la autorización de M3: **sin diferencias de contenido ni de numeración**.
- La única fuente de ambigüedad es la numeración D/Q (§0–§1) y la coincidencia «P-5» / «P5» (§0), ya aclaradas. `V10-arquitectura-fisica.md` §8 lleva una nota que remite a este documento; el resto de informes históricos se conserva sin cambios.
- Ninguna decisión de este documento crea directorios, módulos ni áreas por sí misma.

## 5. Decisiones tomadas dentro del alcance autorizado de M4

Tomadas bajo la autorización de M4 (2026-10-31); ninguna cambia contratos públicos, comportamiento, datos ni una decisión ya aprobada. Detalle en [`V10-M4-resultados.md`](../internal/historico/v10-y-etapas/V10-M4-resultados.md).

| Decisión | Estado |
|---|---|
| `platform` queda con **nueve módulos** (`admin`, `benefits`, `team`, `billing`, `crm`, `support`, `inbox`, `accounts`, `presence`); el diseño preveía seis nombres (`billing`, `support`, `crm`, `inbox`, `team`, `health`) | **Implementada** |
| `todayBogota` (copia exacta de `bogotaDay`) se retira y sus 10 usos pasan a Foundation | **Implementada** (`d9f7c6a`) |
| `TenantAuditAction` (las 38 acciones `BIZ_*`) lo define Core y `AuditAction` lo compone; evita Core → Platform sin tocar los escritores (P-9) | **Implementada** (`6053359`) |
| `lib/admin/catalogs.ts` y `vertical-icons.ts` **permanecen** en `lib/admin/` (no son administración de la plataforma) | **Implementada**; su destino definitivo queda **pendiente** (slug → Core en M6d; íconos → experiencia) |
| `createAdminDb` se mantiene como infraestructura interna de `platform/admin` (incluida `createTenant`) | **Implementada**; mover el alta de negocios a Core es una **opción futura sin autorizar** |

## 6. Decisiones de cierre de M4 (2026-10-31)

Aprobadas por el dueño tras la auditoría final de M4 (solo lectura). Son **exclusivamente documentales**: no cambian código, configuración, pruebas, Prisma, migraciones ni `layers.json`, y no introducen excepciones en el verificador.

| # | Decisión | Estado | Dónde queda registrada |
|---|---|---|---|
| **C-1** | **Historial de commits.** Se conservan los nueve commits intermedios de M4 que no compilan por separado (`0de8609`, `a39abba`, `2473f99`, `f2393ed`, `d98f878`, `aded2bc`, `2491db3`, `b01c604`, `0116c51`) y `ac71d60` como corrección. **No se reescribe, reorganiza ni modifica el historial.** | **Aprobada y vigente** (no requiere implementación) | Limitación y consecuencias para `git bisect` y los `revert` individuales: [`V10-M4-resultados.md`](../internal/historico/v10-y-etapas/V10-M4-resultados.md) §14.1 |
| **C-2** | **Benefits: opción A.** Se mantienen las tres referencias de `app/[tenant]` a `platform/benefits/benefits-db`; no se mueven funciones ni se cambia comportamiento. Se **aclara el criterio de aceptación** de V10 para distinguir las dependencias entre módulos (prohibidas fuera de platform, experience y runtime) de las dependencias legítimas de Experience hacia Platform (puntos de entrada, lista cerrada fijada por prueba). | **Aprobada**; el criterio aclarado está **implementado en la documentación** | [`V10-arquitectura-fisica.md`](../internal/historico/v10-y-etapas/V10-arquitectura-fisica.md) §4.1 («Aclaración») y §7·M4 (fila «Aceptación») |
| **C-3** | **Aislamiento y seguridad.** Se mantiene la prueba `lib/tenant/tenant-scope.test.ts` tal como está, sin debilitarla. La **auditoría de aislamiento por negocio** y la **revisión de las guardas de `app/admin`** se registran como **trabajo independiente fuera de V10**. | **Aprobada como registro; el trabajo NO está iniciado** | [`hoja-de-ruta.md`](../wiki/02-producto/hoja-de-ruta.md) §4 y [`V10-M4-resultados.md`](../internal/historico/v10-y-etapas/V10-M4-resultados.md) §14.7 |

Alcance anotado para el trabajo independiente de C-3 (a definir y autorizar aparte): (a) los límites de la prueba actual, que solo ve consultas literales `.orm.public.<Modelo>.where({…})` y no las del constructor `.sql`, los filtros no literales ni las lecturas sin `where`; (b) las 54 consultas sin `tenantId` que la prueba excluye a propósito en seis módulos del panel; (c) las 14 páginas de `app/admin` que dependen de la guarda del layout y no tienen una propia. La explotabilidad de (c) **no se ha evaluado**.

## 7. Decisiones de M5 (2026-10-31)

Aprobadas por el dueño al autorizar M5 con las recomendaciones del diseño ([`V10-M5-diseno.md`](../internal/historico/v10-y-etapas/V10-M5-diseno.md) §9). Ninguna cambia contratos públicos, comportamiento, datos, Prisma ni migraciones, y no hay excepciones nuevas en el verificador. Detalle de la ejecución en [`V10-M5-resultados.md`](../internal/historico/v10-y-etapas/V10-M5-resultados.md).

| # | Decisión | Estado |
|---|---|---|
| **D5-1** | Anidación `lib/domains/finance/<módulo>` (cierra Q-3) | **Implementada** (M5.3 a M5.6) |
| **D5-2** | `finance/index.ts` → `foundation/kernel/payment-vocabulary.ts` y `finance/series.ts` → `foundation/kernel/finance-series.ts` | **Implementada** (M5.1, `dc3ef22`) |
| **D5-3** | `cop-amount` se queda en `foundation/kernel` (es puro; lo usan el servidor y la pantalla) | **Implementada** (M5.1) |
| **D5-4** | `keypad` y `payment-scan` en la unidad nueva `lib/payment-input` (Experience) | **Implementada** (M5.2, `3bad057`) |
| **D5-5** | Paso previo M5.0: reclasificar las unidades de `finance` como `domains` y retirar la capa `finance` | **Implementada** (M5.0, `259e684`) |
| **D5-6** | No tocar informes históricos ni documentación viva con rutas antiguas; los absorbe la pasada P-12 | **Vigente** (pendiente P-12) |
| **D5-7** | Verificación de integración con un contenedor Docker desechable propio, sin tocar `nexus-postgres` ni `nx-pg` | **Cumplida** en M5.1 a M5.6 |

**Pendiente de decisión, fuera de M5:** el movimiento físico de las carpetas de `core`, `business`, `integrations` y `experience` que hoy siguen en la raíz de `lib/` y que V10 (M0–M8) no programa mover (`V10-M5-resultados.md` §9.4). Requiere un diseño propio y la aprobación del dueño; no está iniciado.

## 8. Plan de cierre de V10 y etapas I y B (2026-10-31)

El dueño aprobó el plan de cierre ([`V10-plan-de-cierre.md`](../internal/historico/v10-y-etapas/V10-plan-de-cierre.md)): E-1 a E-9 con las recomendaciones, con la precisión de que la raíz de `lib/` tendrá **las nueve áreas y las dos excepciones documentadas `utils.ts` y `cn.ts`** (no «solo nueve directorios»). E-6: V10 es reorganización física sin cambios de comportamiento; M7 y M6c quedan fuera. Resultados de cada etapa en [`V10-cierre-resultados.md`](../internal/historico/v10-y-etapas/V10-cierre-resultados.md).

### 8.1 Excepción temporal y puntual: ciclo `inventory ⇄ sales` (decisión B-1)

Al unir `inventory` con `sales` bajo `lib/business/` (etapa B), la prueba «los módulos de business no forman ciclos entre sí» (P-1, M3) detectó un ciclo **entre módulos**. El dueño decidió aceptarlo como excepción **temporal, específica y documentada** (opción A), sin fusionar módulos ni alterar dependencias a mitad de la etapa.

**La dependencia real es esta (de valor y de tipo; no es solo un ciclo de tipos):**

| Sentido | Archivo → archivo | Clase |
|---|---|---|
| `inventory → sales` | `stock-docs-db.ts` → `money-service.ts` | valor |
| `inventory → sales` | `stock-service.ts` → `accounting-port.ts` | valor |
| `inventory → sales` | `stock-service.ts` → `money-service.ts` | tipo |
| `sales → inventory` | `money-service.ts` → `stock-service.ts` | valor |

- **A nivel de archivo** no hay ciclo de valores: el único ciclo es el de tipos `money-service ⇄ stock-service`, que ya cuenta en el tope de 3. **A nivel de módulo** el ciclo es de valor, porque `stock-docs-db` y `stock-service` (inventory) importan valores de `sales` y `money-service` (sales) importa un valor de `stock-service` (inventory).
- **Origen:** identificado en M3 (`V10-M3-resultados.md`, punto 4: «se conserva; resolverlo es una etapa propia»). Esa etapa **nunca se programó**.
- **Cómo está acotada:** `tests/architecture/v10-business.test.ts` permite **exclusivamente** el par `inventory ⇄ sales` y exige que sus dependencias sean exactamente las cuatro de la tabla (ni más ni menos). Cualquier otro ciclo entre módulos de `business` hace fallar la prueba, y una dependencia nueva entre estos dos módulos también. La regla general no se debilitó ni se tocó el verificador.
- **No es una solución definitiva.** Es **deuda arquitectónica pendiente**. Para saldarla hay que decidir, con su propio análisis, entre: mover `stock-docs-db` y la dependencia con `accounting-port` hacia `sales`, invertir una de las dependencias mediante un puerto, o fusionar `inventory` en `sales`. Ninguna se hizo ni se prejuzga aquí. Al saldarla se elimina la excepción de la prueba.
- **No se modificó código** (implementaciones, contratos ni dependencias) para ocultar el ciclo.

## 9. Decisiones del cierre de V10 (etapas F y Z)

| # | Decisión | Estado |
|---|---|---|
| **Z-1** | La raíz de `lib/` contiene exactamente las nueve áreas y `utils.ts` y `cn.ts`; lo fija `tests/architecture/v10-raiz-lib.test.ts` | **Implementada** |
| **Z-2** | `design/`, `seo/` y la prueba de patrones de Prisma pasan a `tests/` (antes «fuera de V10») | **Implementada** (movimientos de pruebas, sin cambios de comportamiento) |
| **Z-3** | `nav-types` → `core/capabilities`; el alta del negocio (`types`, `validation`, `presets`, `slug`) → `core/tenancy/onboarding`; `catalogs.ts` → `core/tenancy` | **Implementada** |
| **Z-4** | `onboarding-db` se queda en `experience/onboarding` porque importa Domains, que Core no puede importar. Ajusta el plan de cierre §10 | **Implementada** (informada al dueño en el cierre) |
| **Z-5** | `layers.json` se reduce a las unidades que la ruta no puede deducir (5) y se retira la capa `automation` | **Implementada** |
| **Z-6** | Documentación final: `guia-implementacion-lib.md` y `reglas-dependencias.md` | **Implementada** |
| **B-1** (vigente) | Excepción temporal y puntual `inventory ⇄ sales`; deuda arquitectónica pendiente | **Vigente** (§8.1) |

M7 y M6c quedan **fuera de V10** (E-6). Lo que sigue pendiente después del cierre está en [`V10-cierre-resultados.md`](../internal/historico/v10-y-etapas/V10-cierre-resultados.md) §8.4.

