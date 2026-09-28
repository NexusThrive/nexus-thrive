# Modelo de datos de Nexus — diccionario completo

> Qué hay en la base, qué significa cada tabla y **por qué está construida así**.
> Para leerlo antes de cambiar cualquier cosa. Verificado leyendo los 4 archivos
> `.prisma` y los seeds a 2026-09-28.
>
> Mapa del repo: `ARQUITECTURA.md` · Vocabulario: `GLOSARIO.md`

---

## 1. Qué es la base, en una frase

**Una sola base PostgreSQL con un solo schema de Prisma**, repartida en 4
archivos por convención: **12 tablas y 9 enums**.

```
packages/prisma/schema/
├── schema.prisma           → datasource, generator, 4 enums globales
├── core/
│   └── identidad.prisma    → EL NÚCLEO (6 tablas): organización, persona, catálogo
└── modulos/
    ├── clientes.prisma     → MÓDULO clientes (1 tabla)
    ├── planes.prisma       → MÓDULO planes (1 tabla)
    ├── pagos.prisma        → MÓDULO pagos (1 tabla)
    ├── gastos.prisma       → MÓDULO gastos (1 tabla)
    └── caja-menor.prisma   → MÓDULO caja-menor (2 tablas)
```

**Dos niveles, no cuatro archivos sueltos.** Cada archivo en `modulos/` es **un**
módulo del catálogo y su nombre es su `modules.slug`. Antes los 4 módulos de
`gym.prisma` convivían en un archivo con nombre de rubro, lo que hacía creer que
`clientes` era de un gimnasio: no lo era, y no lo es.

Migraciones versionadas en `packages/prisma/migrations/` (2: `baseline` +
`add_ruta_base_catalogo`). Seeds en `packages/prisma/src/`.

### 1.1 Verificado contra la base en vivo

Consultado en PostgreSQL local el 2026-09-28. **12 tablas y 9 enums, exactamente
lo que declara el schema: no hay drift.**

| Tabla | Filas | | Tabla | Filas |
|---|---|---|---|---|
| `organizations` | 11 | | `plantillas` | 1 |
| `members` | 24 | | `plantilla_modulos` | 4 |
| `modules` | 5 | | `clientes` | 88 |
| `organization_modules` | 19 | | `planes` | 6 |
| `caja_categorias` | 7 | | `pagos` | 738 |
| `movimientos_caja` | 3 | | `gastos` | 53 |

Lo que cuentan esos números:

- **1 sola plantilla** (`gym`) con **4 módulos miembros** → el catálogo ya agrupa
  (ver §8).
- **5 módulos en el catálogo** = `caja-menor` + los 4 de gym.
- **738 pagos contra 88 clientes** → ~8 pagos por socio. Es el módulo más usado.
- **11 organizaciones, 19 activaciones** → la mayoría tiene 1–2 módulos; el
  promedio es bajo porque los seeds de demo crean-orgs vacías.
- Los **88 clientes** son el padrón de `seed-demo-gym.ts` (`PADRON = 88`, elegido
  para que un gym de barrio sea creíble), en **una sola** organización.

> Con una sola plantilla y 738 pagos, **cualquier migración de Gym toca la tabla
> más poblada de la base.** Es el argumento de peso del §8.

---

## 2. El concepto que hay que entender antes que cualquier otro

### En la base de datos **no existen los módulos**.

`Module` y `OrganizationModule` son **filas de un catálogo**: dicen qué productos
existen y qué compró cada negocio. **No particionan el schema.** No hay un schema
de Postgres por módulo, ni una base por módulo, ni un `search_path` por módulo.

| | Qué es realmente | Qué NO es |
|---|---|---|
| Archivo `.prisma` | Una convención **de archivos** para separar el código | Un límite que la base imponga |
| `Module` | Una fila del catálogo de productos | Una tabla, un schema, una DB |
| `OrganizationModule` | Qué productos tiene contrata **esta** organización | Qué tablas existen |

**Consecuencia práctica:** mover un modelo de `modulos/gastos.prisma` a
`modulos/clientes.prisma` **no cambia la base de datos en absoluto**. Prisma
mult-archivo lee la carpeta `schema/` —incluidas sus subcarpetas `core/` y
`modulos/`— como un solo schema: se puede relacionar `Pago` desde
`clientes.prisma` sin problema. El archivo es documentación, no barrera.

> **Verificado 2026-09-28** (refactor `schema/modulos/`): el cambio se comprobó
> con `prisma migrate diff --from-schema-datamodel <viejo> --to-schema-datamodel
> <nuevo>` y dio **"This is an empty migration"** — el schema es idéntico, solo
> se movió de archivo. Cero migraciones nuevas. Ese diff es el control que hay
> que correr **siempre** que se parta un `.prisma`: sin él, un `@@map()` mal
> copiado renombra una tabla en silencio.

**Y la consecuencia inversa, que es la importante:** nada impide que un
`Cliente.organizacion` apunte a una `Organization` que no es. La separación entre
módulos es una promesa que el código cumple, no una que la base verifique.

---

## 3. Los dos bloques

```
┌──────────────────────────────────────────────────────────────┐
│ NÚCLEO — core/identidad.prisma                                │
│   Organization · Member · Module · OrganizationModule         │
│   Plantilla · PlantillaModulo                                 │
│   Regla: no conoce ningún módulo. Ni "clientes", ni "caja".   │
└──────────────────────────────────────────────────────────────┘
              ▲ todas las tablas de módulo cuelgan de Organization
┌──────────────────────────────────────────────────────────────┐
│ MÓDULOS — modulos/<slug>.prisma                               │
│   clientes · planes · pagos · gastos · caja-menor             │
│   Un archivo = un módulo del catálogo = un `modules.slug`     │
│   Todos con orgId: los datos son de la organización,         │
│   no del módulo ni del rubro.                                 │
└──────────────────────────────────────────────────────────────┘
```

**CAPA vs VERTICAL no es un bloque del schema.** Es metadata de la fila del
catálogo (`Module.naturaleza`): define cómo se *ofrece* el módulo, no dónde
viven sus tablas. `clientes` es el mismo archivo y las mismas tablas le sirvan a
un gym o a un museo; lo único que cambia es si el catálogo lo ofrece suelto
(CAPA) o dentro de un conjunto por rubro (VERTICAL).

---

## 4. Diccionario por tabla

### 4.1 NÚCLEO

#### `organizations`
El negocio del cliente. Es la raíz de todo.

| Campo | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | String | no | `cuid()` | PK |
| `nombre` | String | no | — | |
| `slug` | String | no | — | **único**; identidad en la URL (`zonarosa`) |
| `tipoNegocio` | String? | sí | — | `"gimnasio"` \| `"comercio"` … alimenta la recomendación de módulos |
| `moneda` | String | no | `"COP"` | define cómo se formatea el dinero (ver `format.ts`) |
| `pais` | String? | sí | — | ISO (`"CO"`) |
| `equipo` | String? | sí | — | `"solo-yo"` \| `"equipo"` (onboarding) |
| `dolor` | String? | sí | — | `"cobrar"` \| `"no-perder"` \| `"saber-flujo"` (onboarding) |
| `onboardingCompletadoAt` | DateTime? | sí | — | **null = el dueño aún no armó su negocio** |
| `logoUrl` | String? | sí | — | |
| `rolDefault` | Rol | no | `OPERADOR` | rol que reciben los miembros nuevos |
| `createdAt` / `updatedAt` | DateTime | no | `now()` / `@updatedAt` | |

#### `members`
La **persona**. Un email es global; una persona puede estar en varias organizaciones.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String | PK |
| `orgId` | String | → `Organization` (**con** relación, sin cascade) |
| `nombre` | String | |
| `email` | String | **login**. No es único solo: `@@unique([email, orgId])` |
| `passwordHash` | String? | bcrypt. **null = invitación pendiente**: todavía no definió clave |
| `rol` | Rol | `ADMIN` \| `OPERADOR` \| `AUDITOR` |
| `scope` | UserScope | `USER` \| `CEO` (consola global, futuro) |
| `activo` | Boolean | **desactivar ≠ borrar** (decisión: la identidad nunca se borra) |
| `onboardingCompletadoAt` | DateTime? | null = todavía no completó su guía |

Índices: `@@index([orgId])` · `@@unique([email, orgId])`

#### `modules`
El **catálogo global de productos**. No es de ninguna organización.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String | PK |
| `slug` | String | **único** (`clientes`, `caja-menor`) |
| `nombre` / `descripcion` | String | lo que ve el cliente |
| `campo` | CampoModulo | taxonomía **interna** (Finance/Services/Productivity). Invisible al cliente |
| `naturaleza` | NaturalezaModulo | `CAPA` (horizontal) \| `VERTICAL` (de un rubro) |
| `icono` | String? | slug de ícono lucide |
| `porDefecto` | Boolean | se activa **sola** en toda organización nueva y no se puede apagar. El comentario del schema pone el ejemplo: **"clientes"** |
| `sugeridoPara` | String[] | array de tipos de negocio. **Sin FK**: nada valida que existan |
| `rutaBase` | String? | **la navegación lee la ruta de acá**, no de un allowlist en código. Antes vivía hardcodeado y todo módulo nuevo nacía con un 404 |
| `activo` / `orden` | Boolean / Int | |

#### `organization_modules`
Qué productos tiene activados **una** organización.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String | PK |
| `orgId` | String | → `Organization`, **`onDelete: Cascade`** |
| `moduleId` | String | → `Module` |
| `estado` | EstadoModuloOrg | `SOLICITADO` (pedido) \| `ACTIVO` (en uso) |
| `activadoAt` | DateTime? | |

`@@unique([orgId, moduleId])` — un módulo no se activa dos veces en la misma org.

#### `plantillas`
Un rubro completo, armado como **conjunto de módulos**.

| Campo | Tipo | Notas |
|---|---|---|
| `slug` | String | **único** (`gym`) |
| `nombre` | String | "Gym" |
| `rubro` | String | `"gimnasio"` — el onboarding matchea por acá |
| `rutaBase` | String? | `/plantillas/gym` (plantilla) o `/modulos/<slug>` (módulo). La navegación lee **la ruta de acá**, no de un allowlist en código. Antes vivía hardcodeado y todo módulo nuevo nacía con un 404 |
| `campo` / `icono` / `activo` / `orden` | — | igual que en `modules` |

#### `plantilla_modulos`
N:N entre plantilla y módulo, con orden.

`@@unique([plantillaId, moduleId])` · `onDelete: Cascade` desde la plantilla.

### 4.2 MÓDULO CAPA — Caja Menor

#### `caja_categorias`
**Tabla configurable por organización**, no enum. El rubro decide qué usa
(mercado, transporte, papelería…).

`nombre` (String) · `activo` (Boolean) · `@@unique([orgId, nombre])` · `@@index([orgId, activo])`

#### `movimientos_caja`
Entrada o salida de efectivo. **El monto es siempre positivo**; el signo lo da `tipo`.

| Campo | Tipo | Notas |
|---|---|---|
| `orgId` | String | |
| `tipo` | TipoMovimientoCaja | `INGRESO` \| `EGRESO` |
| `monto` | Decimal(12,2) | **siempre positivo** |
| `categoriaId` | String? | → `CajaCategoria` (opcional) |
| `fecha` | DateTime | |
| `descripcion` | String? | |
| `anulado` / `motivoAnulacion` | Boolean / String? | **un movimiento nunca se borra: se anula con motivo** |

El **saldo es derivado**: sumatoria de movimientos no anulados. Que un egreso no
deje el saldo negativo se valida en el server action, **no en la base**.

### 4.3 MÓDULO VERTICAL — Gym

#### `plans`
Plan de membresía.

`nombre` · `precio` Decimal(12,2) · `duracionDias` Int (30) · `activo` Boolean · `@@index([orgId])`

#### `clients` → tabla `clientes`
El socio del gimnasio. **Genérico desde el Eje B: no sabe qué es un plan.**

| Campo | Tipo | Notas |
|---|---|---|
| `orgId` | String | |
| `nombre` | String | |
| `documento` | String? | cédula, para búsqueda rápida |
| `telefono` / `email` / `fechaNacimiento` | String? / DateTime? | |
| `fechaIngreso` | DateTime | |
| `nota` | String? | alergias, lesiones, preferencias |

`@@index([orgId, nombre])`

#### `membresias` (Eje B, 2026-09-28)
Lo gym-específico: `Cliente` × `Plan` (o **"mes libre"**, que es una membresía
sin plan — por eso `planId` es nullable y quitar el plan a un cliente NO borra
la membresía, solo la deja sin plan).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String | **= `clienteId`** (relación 1:1; el seed y el backfill son idempotentes) |
| `orgId` | String | |
| `clienteId` | String (`@unique`) | → `Cliente` (`onDelete: Cascade`) — el `@unique` es lo que Prisma exige para una relación 1:1 |
| `planId` | String? | → **`Plan` (FK global, sin org)** — ver §6.2 |
| `estado` | EstadoMembresia | `ACTIVO` \| `CONGELADO` \| `VENCIDO` — **caché derivada**, se recalcula al cobrar/anular |
| `periodoFin` | DateTime? | vencimiento de la membresía actual (`null` = sin pago vivo) |

`@@index([orgId, estado])` · relación `pagos Pago[]`

#### `pagos`
Cobro de membresía. **Nunca se borra: se anula con motivo.**

`membresiaId` → `Membresia` (`onDelete: Cascade`) · `monto` Decimal(12,2) · `metodo` MetodoPago ·
`concepto` · `periodoInicio` / `periodoFin` (qué período cubre) · `anulado` / `motivoAnulacion` · `pagadoEl`

`@@index([membresiaId])` · `@@index([orgId, pagadoEl])`

#### `gastos`
`categoria` **enum fijo** (ARRIENDO, NOMINA, SERVICIOS, MANTENIMIENTO, PUBLICIDAD, OTROS) ·
`monto` · `fecha` · `anulado` / `motivoAnulacion` · `@@index([orgId, fecha])`

> ⚠️ **Inconsistencia que hay que ver:** `caja_categorias` es una **tabla
> configurable** y `gastos.categoria` es un **enum fijo**. Son el mismo concepto
> ("categorizar plata que sale") implementado de dos formas distintas, en dos
> módulos. Un gimnasio no puede crear la categoría "Equipos" sin que alguien
> agregue un valor al enum y despliegue. Es la misma decisión que vas a tener que
> tomar en el módulo de construcción (¿los 34 capítulos del pack son enum, tabla
> o catálogo?).

---

## 5. Los enums

| Enum | Valores | Dónde |
|---|---|---|
| `Rol` | `ADMIN` (dueño) · `OPERADOR` (tareas diarias) · `AUDITOR` (revisar) | núcleo |
| `CampoModulo` | `CORE` · `FINANCE` · `SERVICES` · `PRODUCTIVITY` — **nunca visible al cliente** | núcleo |
| `EstadoModuloOrg` | `SOLICITADO` · `ACTIVO` | núcleo |
| `UserScope` | `USER` · `CEO` (consola global, futuro) | núcleo |
| `NaturalezaModulo` | `CAPA` · `VERTICAL` | núcleo |
| `TipoMovimientoCaja` | `INGRESO` · `EGRESO` | caja |
| `EstadoMembresia` | `ACTIVO` · `CONGELADO` (pausa) · `VENCIDO` (sin pago al día) | gym |
| `MetodoPago` | `EFECTIVO` · `TARJETA` · `TRANSFERENCIA` · `NEQUI` · `OTRO` | gym |
| `CategoriaGasto` | `ARRIENDO` · `NOMINA` · `SERVICIOS` · `MANTENIMIENTO` · `PUBLICIDAD` · `OTROS` | gym |

---

## 6. Las tres invariantes, y su estado real

Son la columna vertebral del diseño. Importa saber **cuál la sostiene la base y
cuál la sostiene el código**.

### 6.1 "Todo dato de negocio pertenece a una organización"

**Estado: la sostiene el código, no la base.** Los modelos de módulo tienen el
campo `orgId`, pero **casi ninguno declara la relación a `Organization`**: es un
`String` suelto, sin foreign key. En todo el schema, la relación `org
Organization` aparece **solo dos veces**: en `Member` y en `OrganizationModule`.
Ninguna tabla de negocio (`clientes`, `membresias`, `plans`, `pagos`, `gastos`,
`movimientos_caja`, `caja_categorias`) tiene FK a `organizations`.

Efectos: un `orgId` mal escrito crea filas huérfanas sin que nadie lo note, y
borrar una organización **no** cascadea a los clientes, pagos ni movimientos (solo
a `organization_modules` y a los `members`, que usa `Restrict`).

**Decisión pendiente:** ¿se agrega la FK con cascade, o se deja suelta a
propósito? Hoy no está documentada en ningún lado, y esa es parte de por qué nadie
sabe si fue decisión o descuido.

### 6.2 "Ningún dato cruza organizaciones"

**Estado: no la sostiene la base.** Las relaciones entre tablas de negocio son FKs
normales, sin organización:

| Relación | Qué permite si se manipula |
|---|---|
| `membresias.planId → plans` | membresía de la org A con plan de la org B (**ya pasó, y se volvió a blindar en el Eje B**) |
| `pagos.membresiaId → membresias` | pago de la org A contra una membresía de la org B |
| `movimientos_caja.categoriaId → caja_categorias` | movimiento de la org A con categoría de la org B |

La fuga del plan se corrigió **en el código** (escritura y lectura, con tests).
Con el **Eje B** la defensa se reforzó: el plan se valida contra la org al
escribir (`resolverPlanDeOrg`) y al leer solo se resuelve con un Map de los
planes **de la org** (listado, ficha y por-vencer) — una membresía envenenada se
ve como "sin membresía", nunca con el nombre/precio ajeno. **La base sigue
permitiendo la fila manipulada:** la solución de fondo sería una FK compuesta
`(orgId, planId)`, que Postgres sí soporta y Prisma todavía no expone de forma
cómoda; o una extensión de cliente que inyecte el filtro.

### 6.3 "Nunca se borra lo que es dinero"

**Estado: la sostiene el schema.** `anulado` + `motivoAnulacion` en `pagos`,
`gastos` y `movimientos_caja`. No hay columna `deletedAt` global: cada dominio
decide. Es una decisión consciente, no una omisión.

---

## 7. Por qué está construida así (las decisiones)

| Decisión | Motivo | Dónde está escrita |
|---|---|---|
| **La identidad es global**: `Member` es la persona, `Organization` es el negocio | Un humano trabaja para varios negocios sin registrarse otra vez. Un módulo nuevo **nunca** re-registra usuarios | ⚠️ `core/identidad.prisma` cita `PLAN-BASE-NEXUS 2026-09-12` — **ese archivo no existe** (§7.1) |
| **El catálogo es global, la activación es por org** | El módulo es un producto reutilizable; el negocio lo contrata. Permite vender y medir activación | comentario en `core/identidad.prisma` |
| **`rutaBase` vive en el catálogo** | La navegación lee la base, no un allowlist. Arregla de raíz la clase de bugs "todo módulo nuevo nace con un 404" | comentario en `Module.rutaBase` |
| **Los módulos miembros heredan la ruta de la plantilla** | Un cliente de gym no ve "4 módulos", ve "Gym". La unidad de venta y de navegación es la plantilla | `Plantilla.rutaBase` |
| **Las categorías de caja son tabla, las de gasto son enum** | En caja el rubro *decide* sus categorías; los gastos quedaron fijados a 6 universales | `modulos/caja-menor.prisma` vs `modulos/gastos.prisma` |
| **El saldo y el estado se derivan, no se guardan** | Una sola fuente de verdad: los movimientos y los pagos. El saldo no se puede "descuadrar" porque no existe | comentarios en ambos schemas |
| **`Membresia.estado`/`periodoFin` sí se guardan** (contradicción consciente) | Son una caché para filtrar/listar rápido. **Se recalculan al cobrar/anular** → pueden desfasarse | `modulos/membresias.prisma` |
| **Dinero siempre `Decimal(12,2)`** | Los `float` pierden centavos. Nunca `Float` para plata | todos los schemas |
| **Nada se borra, se anula** | Un presupuesto de obra o una contabilidad tienen que poder auditar qué pasó | ambos schemas |
| **`String[]` para `sugeridoPara`** | Evita una tabla de junctions para algo que es taxonomía interna. A cambio: **sin integridad referencial** | `core/identidad.prisma` |

### 7.1 La deuda de fondo: `PLAN-BASE-NEXUS.md` no existe

El documento base de Nexus —el que dice **por qué** Member y Organization están
separados, por qué el catálogo es global, por qué nada se borra— se llamaba
`PLAN-BASE-NEXUS.md` (11.3K). Verificado hoy:

- **Nunca estuvo en git.** No aparece en ningún commit, ni siquiera borrado.
  Existió solo como archivo local sin commitear.
- **Hoy no está en ninguna parte.** Ni en el repo, ni en el historial.
- **Y el código lo cita como autoridad en 6 lugares:**

| Cita | Qué dice |
|---|---|
| `schema.prisma:11` | "DECISIÓN (PLAN-BASE-NEXUS 2026-09-12): NEXUS es la marca, el Campo…" |
| `core/identidad.prisma` | "DECISIÓN CLAVE (PLAN-BASE-NEXUS 2026-09-12)" — Member = la persona |
| `src/lib/core/acciones.ts:7` | "Decisión (PLAN-BASE-NEXUS §6): el registro crea la cuenta de la…" |
| `src/lib/shared/rango.ts:5` | "regla §9 PLAN-BASE-NEXUS: no abstraer antes de 2 casos reales" |
| `packages/prisma/src/seed.ts:16` | "regla §9 PLAN-BASE-NEXUS: un módulo nace de un dolor validado" |

**Lo que queda es el porqué pegado en el código, sin el documento que lo
sostiene.** Los comentarios son buenos (esta doc se pudo escribir), pero
nadie puede leer el §6 ni el §9 completos: no existen. Cuando alguien pregunte
"¿por qué el registro crea la org y el member a la vez?", la respuesta está en
un archivo perdido, y la única pista es un comentario que remite a un §6
inexistente.

**Ese es el trabajo de `docs/DECISIONES.md`**, y no es opcional: es la diferencia
entre un repo que se puede mantener y uno donde cada decisión importante depende
de que alguien recuerde.

---

## 8. La pregunta que trajiste: ¿reestructurar Gym?

Tu intuición es correcta y, contra lo que parece, **el catálogo ya la sigue**. La
discrepancia está en otro lado.

### Lo que YA está separado

| Capa | ¿Está separado? |
|---|---|
| **Catálogo** | ✅ Sí. El seed crea las filas de `Module`: `clientes` (CAPA + `porDefecto`) y `planes`, `pagos`, `gastos` (VERTICAL, miembros de la `Plantilla` `gym`); y `caja-menor` (CAPA) |
| **Datos** | ✅ Sí. `lib/modulos/{clientes,planes,pagos,gastos,caja-menor}/` con sus consultas y acciones separadas + `lib/plantillas/gym/dashboard.ts` |
| **Schema** | ✅ Sí (2026-09-28). Los modelos viven en `schema/modulos/`, uno por módulo. Partirlo fue cosmético: cero migraciones (`migrate diff` dio *"empty migration"*) |
| **Rutas** | ✅ Sí (Eje A, 2026-09-28). Cada módulo en `/modulos/<slug>` (clientes, pagos, gastos, caja-menor); `/plantillas/gym` es solo el dashboard de la plantilla. `planes` sigue sin pantalla propia: se gestiona desde Pagos |
| **Naturaleza** | ✅ Sí (Eje A, 2026-09-28). `clientes` es **`CAPA` + `porDefecto` + `sugeridoPara: []`**: se activa en toda organización (con backfill para las existentes). `planes`/`pagos`/`gastos` siguen **`VERTICAL`** de gym |

### La brecha real (cerrada con el Eje B)

**Antes:** `clientes` ya era reutilizable (Eje A), pero su tabla seguía atada a
`Plan`, que es concepto de gimnasio. Un salón de belleza podía activar
`clientes` y lo usaba, pero pagaba el precio de cargar los "planes de membresía"
del gym en un negocio que quizá no tiene membresías.

**Hoy (2026-09-28):** la atadura `Cliente → Plan` se sacó a la tabla
`membresias` (migración `20260928_000001_eje_b_membresia`). `cliente` es un
cliente genérico — cualquier rubro lo usa sin saber qué es un plan.

### Tres ejes posibles (independientes entre sí)

**Eje A — la naturaleza de `clientes`:** **✅ hecho (2026-09-28).** `clientes` es
`CAPA`, `porDefecto: true`, `sugeridoPara: []`. Los módulos base se activan al
crear la organización (`activarModulosPorDefecto`), y una migración de datos
idempotente (`20260928_000000_backfill_clientes_capa`) pone a las
organizaciones existentes en la misma situación. El comentario del schema
(`Module.porDefecto` usa "clientes" como ejemplo) ahora se cumple.

**Eje B — el vínculo `Cliente → Plan`:** **✅ hecho (2026-09-28).** Se eligió la
opción B (sacar la membresía a su propia tabla), que era la correcta y la que
resuelve la fuga de §6.2 por construcción:

| Opción | Qué implica | Estado |
|---|---|---|
| **B) Sacar la membresía a su propia tabla** | `Cliente` queda limpio (nombre, documento, teléfono) y una tabla `Membresia { clienteId, planId, periodoFin, estado }` es lo gym-específico. **Es el modelo correcto** y además resuelve la fuga de §6.2 por construcción, si se le pone `orgId` | **✅ aplicada** — además `Pago` cuelga de `Membresia` y `EstadoCliente` se renombró a `EstadoMembresia` |
| A) Mover `Plan` junto a `Cliente` | "planes de servicio" es reutilizable (un salón también tiene planes). Menos trabajo, pero sigue siendo gym-céntrico | no elegida — `Plan` sigue siendo de módulo |

**Eje C — el archivo y la ruta:** **✅ hecho (2026-09-28).** Los archivos ya
están partidos por módulo y cada módulo vive en `/modulos/<slug>`. Se hizo
antes que el Eje B a propósito: la herencia de ruta ("un miembro de plantilla
hereda la ruta de su plantilla") era del modelo viejo de rutas anidadas y se
descartó; hoy cada módulo tiene su ruta propia, y la plantilla su dashboard.

> Nota sobre el nombre (cumplida): el archivo del modelo es
> **`membresias.prisma`**, no `planes.prisma`. El **slug del catálogo sigue
> siendo `planes`** (renombrarlo rompería `OrganizationModule`/`plantilla_modulos`);
> el archivo es del módulo, el slug es del catálogo, y no tienen que coincidir.
> La ruta de `planes` no existe (se gestiona dentro de Pagos), así que el modelo
> nuevo no rompe ningún path.

### Mi lectura

Los **tres ejes están hechos** (2026-09-28): `clientes` es `CAPA` por defecto
(Eje A), la membresía vive en su tabla y el plan se resuelve solo dentro de la
org (Eje B), y los archivos/rutas están partidos (Eje C). El Eje B era el que
valía: es la diferencia entre "un módulo que dice clientes" y "clientes de
verdad", y de paso blindó la fuga cross-tenant en el código, no solo en la base.

### Las cuatro cosas que se miraron antes de mover la tabla

1. **¿Cuánto pesa la migración?** **88 clientes y 738 pagos** (§1.1), y el padrón
   es **datos semilla, no producción real**: se puede tirar y regenerar con
   `seed-demo-gym.ts`. La migración se hizo **ahora** (barata); mañana habría sido
   carísima. El backfill (`membresia.id = cliente.id`) la hace idempotente.
2. **`Pago` pertenece a `Cliente` o a `Membresia`?** **Resuelto: cuelga de
   `Membresia`** (`Pago.membresiaId NOT NULL`, `onDelete: Cascade`). El pago es
   el evento que renueva la membresía, y la anulación vuelve a calcular su estado.
3. **`estado` y `periodoFin` se calculan** en `lib/modulos/clientes/estado.ts`
   — **resuelto: la lógica se movió a `Membresia`** (`recalcularMembresia` +
   `derivarEstadosMembresias`, CONGELADO nunca se pisa solo) con sus tests.
4. **Caja Menor no tiene clientes.** Sigue pendiente: es una decisión de
   producto, no de base. Ahora que `clientes` es `CAPA` y genérico, caja podría
   registrar a quién se le entregó el efectivo — si el negocio lo quiere.

### El orden que se siguió

| # | Paso | Estado |
|---|---|---|
| 1 | **Corregir la doc** (este doc + `DECISIONES.md`) | ✅ este doc; `DECISIONES.md` pendiente de crear (§7.1) |
| 2 | **Eje A**: `clientes` de `VERTICAL` → `CAPA`, `sugeridoPara: []` | **✅ hecho (2026-09-28)** |
| 3 | Cerrar la fuga de `planId` **en la base** (FK compuesta o trigger) | ⏳ sigue pendiente — el código ya la cierra con tests y el Eje B la reforzó; la base aún la permite (§6.2) |
| 4 | **Eje B**: `Membresia` y `Cliente` genérico | **✅ hecho (2026-09-28)** — migración `20260928_000001_eje_b_membresia` aplicada a datos reales (88 membresías, 738 pagos): backfill, `pagos.membresiaId`, DROP de columnas viejas, `EstadoCliente` → `EstadoMembresia` |
| 5 | **Eje C**: partir `gym.prisma` en archivos + rutas | **✅ hecho (2026-09-28)** |

> **Estado al 2026-09-28:** Ejes A, B y C completos y verificados
> (`type-check` + 44 tests + `lint` + `build`; seed demo idempotente sobre la
> base migrada). Queda pendiente: `docs/DECISIONES.md` (§7.1) y la FK compuesta
> en la base (paso 3).

---

## 9. Checklist para cambiar el schema sin romper nada

```
[ ] 1. Cambiar SOLO el .prisma (nada de migraciones a ciegas)
[ ] 2. pnpm --filter @nexus/prisma migrate dev  → revisá el SQL que genera
[ ] 3. pnpm --filter @nexus/prisma generate
[ ] 4. pnpm type-check  → los tipos rotos te dicen dónde tocar
[ ] 5. pnpm test         → los tests de multi-tenant son la red
[ ] 6. pnpm --filter @nexus/prisma studio  → mirar los datos antes y después
[ ] 7. Seed SIEMPRE idempotente (ver seed.ts: borra y recrea, no acumula)
```

**Nunca** `prisma migrate reset` sobre datos que importen, y nunca una
migración que reescriba datos de negocio sin copia previa.
