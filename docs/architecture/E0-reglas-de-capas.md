# E0 — Reglas de dependencia entre capas

Estado: implementado en la rama local `chore/HU-esquema-prisma-modular-01`, sin push. Alcance aprobado:
`layers.json`, la regla de dependencias, el archivo de excepciones y esta carpeta. No toca `lib/`, Prisma, migraciones ni datos.

## Qué se agregó

| Archivo | Para qué |
|---|---|
| `docs/architecture/layers.json` | A qué capa pertenece cada carpeta o archivo de `lib/` y qué capas puede importar cada una |
| `docs/architecture/exceptions.json` | Las 64 excepciones que existen hoy, cada una justificada, con etapa y estado |
| `scripts/check-layers.mjs` | El verificador: lee los dos JSON, recorre los imports de `lib/` y falla ante lo no cubierto |
| `scripts/check-layers.test.mjs` | 18 pruebas, 8 de ellas negativas |

```bash
node scripts/check-layers.mjs            # comprueba; sale con 1 si hay problemas
node scripts/check-layers.mjs --report   # resumen del grafo
node --test scripts/check-layers.test.mjs
```

## Capas (D-1: la organización física no cambia)

| Capa | Puede importar | Carpetas de hoy |
|---|---|---|
| foundation | nada | `prisma/`, utilidades sueltas de `lib/` (`format`, `cn`, `rate-limit`, `qr`…) |
| core | foundation | `tenant`, `auth`, `admin`, `plans`, `usage`, `capabilities`, `operations`, `parties`, `files`, `events`, `vertical-terms.ts` |
| business | foundation, core | `business`, `catalog`, `inventory`, `purchasing`, `pos`, `store`, `benefits`, `growth`, `data-exchange`, `presence` |
| finance | foundation, core, business | `finance`, `accounting`, `tax`, `receivables`, `payments` |
| integrations | foundation, core, business, finance | `providers`, `einvoice`, `google`, `maps`, `api`, `mcp` |
| automation | foundation, core | `functions` |
| platform | todo lo anterior salvo industry y experience | `ops` |
| industry | foundation, core, business, finance, integrations, automation | `construction`; gimnasio y museo (archivos `gym*`, `memberships*`, `museum*` dentro de `lib/business/`) |
| experience | todas | `navigation`, `motion`, `design`, `hooks`, `site`, `seo`, `onboarding`, `dashboard`, `fonts.ts`, `app/`, `components/` |

Dos decisiones de clasificación, para tu revisión:
- `lib/events` está en **core** (outbox, despachador, webhooks): Business, Integrations y Core lo usan de forma legítima.
- `lib/presence` está en **business**: es una capacidad (pilares, madurez, avisos), no interfaz.

## Reglas

| Regla | Qué prohíbe |
|---|---|
| R1 | Que cualquier capa distinta de experience importe una industria |
| R2 | Que una industria importe otra |
| R3 | Que una capa importe una capa que no está en su lista `mayImport` |
| R4 | Comparar `vertical === "rubro"` con un rubro escrito a mano (regla F7 del #123) |
| — | Un archivo de `lib/` sin clasificar en `layers.json` también falla |

Las pruebas y los `.d.ts` no se evalúan. Los imports de tipo (`import type`) sí cuentan, y las excepciones indican si son solo de tipos.

## Cómo funcionan las excepciones

Cada excepción registra `origen`, `destino`, `regla`, `justificacion`, `etapa` (prevista de resolución), `estado` y `aprobacion`.
Hay tres garantías para que la lista solo pueda encogerse:

1. Una dependencia prohibida **nueva** falla (no está en la lista).
2. Una excepción que **ya no se necesita** falla hasta que se marque «resuelta» y se quite.
3. `maxAbiertas` es un tope: ampliarlo exige editarlo a la vista de la revisión, con justificación y tu aprobación.

Estado inicial: **64 abiertas** (58 dependencias + 6 rubros escritos a mano). Todas con aprobación «propuesta E0, pendiente de revisión».

| Etapa prevista | Excepciones | Qué resuelve |
|---|---|---|
| E1 | 12 | Core deja de importar rubros: `tenant/db.ts` compone los repositorios de obras y membresías |
| E2 | 13 | Reubicar lo mal clasificado: permisos, roles y equipo a Core; gimnasio y museo a `industry`; `escapeLike` a Foundation |
| E3 | 8 | Operaciones y suscriptores de eventos por dominio |
| E5 | 17 | Business→Finance por eventos de dominio (contabilización, impuestos, cartera, pagos) |
| E7 | 4 | Separar puertos de adaptadores (`providers`, `google`, `einvoice`) |
| E9 | 4 | Tipos de interfaz fuera de Core y Platform |
| V | 6 | Vocabulario y capacidades por rubro en `VERTICAL_RECIPES`, sin comparar rubros en código |

Por regla: R3 en 44, R1 en 13, R4 en 6 y R2 en 1.

## Las 11 comparaciones `vertical ===`

Solo las que comparan con un **rubro concreto** son dependencia sectorial (6 de 11). Las demás comparan dos valores entre sí.

| # | Archivo | Línea | Categoría | ¿Dependencia sectorial? |
|---|---|---|---|---|
| 1 | `app/onboarding/_components/adaptive-business-form.tsx` | 126 | Presentación | No: marca la tarjeta elegida |
| 2 | `app/admin/planes/actions.ts` | 60 | Configuración | No: busca la config del rubro recibido |
| 3 | `app/[tenant]/(app)/crm/[id]/page.tsx` | 102 | **Lógica de negocio** | **Sí** (`"gym"`): carga el estado de acceso del socio |
| 4 | `app/[tenant]/(app)/crm/[id]/page.tsx` | 148 | Presentación | **Sí** (`"gym"`): título «Datos físicos y objetivo» |
| 5 | `app/[tenant]/(app)/purchases/page.tsx` | 26 | Presentación | **Sí** (`"restaurant"`): título «Compras de insumos» |
| 6 | `lib/capabilities/registry.ts` | 262 | Navegación | **Sí** (`"restaurant"`): etiqueta del menú |
| 7 | `lib/capabilities/registry.ts` | 309 | Navegación | **Sí** (`"construction"`): «Obras»/«Proyectos» |
| 8 | `lib/onboarding/validation.ts` | 228 | Configuración | No: valida que el rubro esté habilitado |
| 9 | `lib/plans/pricing.ts` | 156 | Configuración | No: busca la config de precios |
| 10 | `lib/navigation/quick-create.ts` | 37 | Navegación | **Sí** (`"construction"`): «Nueva obra» |
| 11 | `lib/plans/validators.test.ts` | 18 | Prueba | No: dato de una prueba |

Solo la #3 es lógica de negocio real (decide qué datos cargar). Las demás son vocabulario o etiquetas que deberían salir de `VerticalTerms`/`VERTICAL_RECIPES`.
La clasificación completa está en `exceptions.json` (`comparacionesVertical`).

## Límites conocidos

- **No está conectado a `pnpm test` ni al CI.** `vitest` solo incluye `lib/**/*.test.ts` y el alcance excluye `lib/`, `package.json` y los workflows. Hasta que se conecte, la regla protege solo si alguien la ejecuta.
- El verificador analiza texto con expresiones regulares, no un árbol sintáctico: no ve imports construidos dinámicamente con variables.
- Solo se evalúan los imports de `lib/`. `app/` y `components/` son experience y pueden importar todo.
- La clasificación por archivo dentro de `lib/business/` (gimnasio, membresías, museo) depende de los nombres `gym*`, `memberships*`, `museum*`.
