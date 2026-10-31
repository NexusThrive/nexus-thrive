# V10 — Correspondencia definitiva de decisiones

Reconcilia la numeración **D-V10-1…9 del diseño** ([`V10-arquitectura-fisica.md`](V10-arquitectura-fisica.md) §8) con la de **las autorizaciones** (2026-10-31) y con las decisiones **P-1…P-13** de [`V10-revision-post-M0-M2.md`](V10-revision-post-M0-M2.md) §9.
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
| D-V10-1 | Sí | Sí (M0 declara el cambio en `layers.json`; M1–M3 mueven archivos) | — |
| D-V10-2 | Sí | Sí (áreas por ruta, capas `domains` y `runtime`, M0) | Materializar las áreas que aún no tienen archivos (`domains`, `platform`, `core` completo) en sus etapas |
| D-V10-3 | Sí | Sí (verificador de reglas, M0) | — |
| D-V10-4 | Sí | Parcial: principio documentado y límites en `lexicon.ts` (M2) | Los procesos sectoriales llegan con M7 |
| D-V10-5 | Sí | Sí (M2) | — |
| D-V10-6 | Sí | Sí (se usaron en M1–M3; el reporte vive en `check-layers --report`) | — |
| D-V10-7 | Sí | Sí (registro y `runtime/sectors.ts`, M2) | Primera industria con definición propia (M7) |
| D-V10-8 | Sí | Parcial: M1–M3 | M4–M8 |
| D-V10-9 | **Sí, solo la dirección** | **No** | Implementación en M7, tras la comprobación de solo lectura sobre una copia (P-8) |

## 2. Preguntas abiertas del diseño (Q-n) y su resolución

Las resoluciones de esta tabla se tomaron al preparar M3 a partir de las recomendaciones del diseño y de las decisiones P ya aprobadas. Cuando una resolución es **propuesta** (no una aprobación textual), se marca así y se confirma al autorizar la etapa que la usa.

| Pregunta | Resolución | Estado | Se confirma / implementa |
|---|---|---|---|
| **Q-1 / Q-2** Sustituir D-1; nombre y número de áreas | Resueltas por D-V10-1 y D-V10-2 | Aprobada | Hecho |
| **Q-3** Anidación de `domains/finance` | **Propuesta conceptual futura:** cuando los módulos de Finanzas se muevan, quedarán en `domains/finance/<módulo>` | **Propuesta, no instrucción** | Al autorizar M5 |
| **Q-4** ¿`money-service` pasa a Finance? | **No.** Queda en `business/sales` | Aprobada (**P-2**) | Hecho (M3) |
| **Q-6** Enum `Vertical` | **Mantener el enum durante M7**; la opción B (texto + FK a `VerticalSetting`) es una dirección futura sujeta a la etapa Prisma | Aprobada (**P-6**) | Etapa Prisma P5 |
| **Q-7a** `presence`, `growth` | **Se quedan en `business`** | Propuesta (recomendación del diseño) | Se reabre solo si aparece un segundo módulo de análisis |
| **Q-7b** `benefits` | **Ubicación prevista: `lib/platform/benefits/`** (ver §2.2) | Propuesta con prerrequisito | Al autorizar M4 |
| **Q-8** `extensions/` | **No se introduce** | Propuesta (recomendación del diseño) | Se reabre con un requisito real de código externo o por negocio |

### 2.1 Q-3 — `domains/finance/<módulo>`: qué es y qué no es

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

**Prerrequisito (pendiente de autorización).** Antes de mover `benefits`, extraer `withinLimit` a un lugar neutral — el diseño propone `foundation` (M6e) — y actualizar sus **3** usuarios (`customers-db`, `exchange-db`, `crm/actions`). Si no, `business → platform` violaría la matriz de áreas. Puede hacerse como un paso mínimo propio inmediatamente antes de M4.

**Puntos que se confirman al autorizar M4 (no se resuelven ahora):** (1) si `getTenantAccess` y `expireBenefitTrial`, que usan las pantallas del propio negocio, se quedan en `platform/benefits` (permitido: experiencia → platform) o se separan hacia Core como estado de acceso del negocio; (2) el destino definitivo de `benefit-cookie.ts` (hoy solo lo usan el alta y el canje).

**Qué NO hace esta decisión:** no mueve nada, no crea `lib/platform/`, no cambia `layers.json`.

### 2.3 Q-7a y Q-8 — por qué no se crean áreas ni módulos

- `presence` (979 líneas) y `growth` (265) miden y activan la presencia en línea del negocio. Se quedan en `business` mientras no exista un segundo módulo de análisis que justifique una familia propia. Criterio para reabrir: ≥ 2 módulos de análisis con dependencias comunes (test de §4.3 del diseño).
- `extensions/` no pasa el test de área nueva: no existe hoy un requisito de código de terceros o por negocio. El registro de sectores (M2) ya permite que una industria aporte su definición. Se reabre con un requisito real y una decisión propia.

## 3. Decisiones P-1…P-13: aprobada / implementada / pendiente

Coinciden una a una con el texto de la autorización de M3 (P-1…P-13 son las mismas de [`V10-revision-post-M0-M2.md`](V10-revision-post-M0-M2.md) §9). No hay contradicción de numeración entre estos dos documentos.

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
