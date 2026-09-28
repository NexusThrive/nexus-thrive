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
├── schema.prisma       → datasource, generator, 4 enums globales
├── identidad.prisma    → EL NÚCLEO (6 tablas): organización, persona, catálogo
├── cajamenor.prisma    → MÓDULO CAPA (2 tablas)
└── gym.prisma          → MÓDULO VERTICAL (4 tablas)
```

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

**Consecuencia práctica:** mover un modelo de `gym.prisma` a `clientes.prisma`
**no cambia la base de datos en absoluto**. Prisa mult-archivo lee los 4 archivos
como un solo schema: se puede relacionar `gym.Plan` desde `clientes.prisma` sin
problema. El archivo es documentación, no barrera.

**Y la consecuencia inversa, que es la importante:** nada impide que un
`Cliente.organizacion` apunte a una `Organization` que no es. La separación entre
módulos es una promesa que el código cumple, no una que la base verifique.

---

## 3. Los tres bloques

```
┌──────────────────────────────────────────────────────────────┐
│ NÚCLEO — identidad.prisma                                      │
│   Organization · Member · Module · OrganizationModule          │
│   Plantilla · PlantillaModulo                                  │
│   Regla: no conoce ningún módulo. Ni "gym", ni "caja-menor".  │
└──────────────────────────────────────────────────────────────┘
              ▲ todas las tablas de módulo cuelgan de Organization
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ CAPA — cajamenor.prisma      │  │ VERTICAL — gym.prisma        │
│   CajaCategoria              │  │   Plan · Cliente             │
│   MovimientoCaja             │  │   Pago · Gasto               │
│   Sirve a cualquier negocio   │  │   Un rubro (gimnasio)        │
└──────────────────────────────┘  └──────────────────────────────┘
```

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
| `rutaBase` | String? | `/plantillas/gym`. **Los módulos miembros heredan esta ruta** |
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
El socio del gimnasio.

| Campo | Tipo | Notas |
|---|---|---|
| `orgId` | String | |
| `nombre` | String | |
| `documento` | String? | cédula, para búsqueda rápida |
| `telefono` / `email` / `fechaNacimiento` | String? / DateTime? | |
| `planId` | String? | → **`Plan` (FK global, sin org)** — ver §6 |
| `estado` | EstadoCliente | `ACTIVO` \| `CONGELADO` \| `VENCIDO` — **derivado**, se recalcula al cobrar |
| `periodoFin` | DateTime? | vencimiento de la membresía actual |
| `fechaIngreso` | DateTime | |
| `nota` | String? | alergias, lesiones, preferencias |

`@@index([orgId, estado])` · `@@index([orgId, nombre])`

#### `pagos`
Cobro de membresía. **Nunca se borra: se anula con motivo.**

`clienteId` → `Cliente` (`onDelete: Cascade`) · `monto` Decimal(12,2) · `metodo` MetodoPago ·
`concepto` · `periodoInicio` / `periodoFin` (qué período cubre) · `anulado` / `motivoAnulacion` · `pagadoEl`

`@@index([clienteId])` · `@@index([orgId, pagadoEl])`

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
| `EstadoCliente` | `ACTIVO` · `CONGELADO` (pausa) · `VENCIDO` (sin pago al día) | gym |
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
Ninguna tabla de negocio (`clientes`, `plans`, `pagos`, `gastos`,
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
| `clientes.planId → plans` | cliente de la org A con plan de la org B (**ya pasó**) |
| `pagos.clienteId → clientes` | pago de la org A a un socio de la org B |
| `movimientos_caja.categoriaId → caja_categorias` | movimiento de la org A con categoría de la org B |

La fuga de `planId` se corrigió **en el código** (escritura y lectura, con tests).
**La base sigue permitiendo la fila.** La solución de fondo sería una FK compuesta
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
| **La identidad es global**: `Member` es la persona, `Organization` es el negocio | Un humano trabaja para varios negocios sin registrarse otra vez. Un módulo nuevo **nunca** re-registra usuarios | ⚠️ `identidad.prisma:7` cita `PLAN-BASE-NEXUS 2026-09-12` — **ese archivo no existe** (§7.1) |
| **El catálogo es global, la activación es por org** | El módulo es un producto reutilizable; el negocio lo contrata. Permite vender y medir activación | comentario en `identidad.prisma` |
| **`rutaBase` vive en el catálogo** | La navegación lee la base, no un allowlist. Arregla de raíz la clase de bugs "todo módulo nuevo nace con un 404" | comentario en `Module.rutaBase` |
| **Los módulos miembros heredan la ruta de la plantilla** | Un cliente de gym no ve "4 módulos", ve "Gym". La unidad de venta y de navegación es la plantilla | `Plantilla.rutaBase` |
| **Las categorías de caja son tabla, las de gasto son enum** | En caja el rubro *decide* sus categorías; los gastos quedaron fijados a 6 universales | `cajamenor.prisma` vs `gym.prisma` |
| **El saldo y el estado se derivan, no se guardan** | Una sola fuente de verdad: los movimientos y los pagos. El saldo no se puede "descuadrar" porque no existe | comentarios en ambos schemas |
| **`Cliente.estado` sí se guarda** (contradicción consciente) | Es una caché para filtrar/listar rápido. **Se recalcula al cobrar** → puede desfasarse | `gym.prisma` |
| **Dinero siempre `Decimal(12,2)`** | Los `float` pierden centavos. Nunca `Float` para plata | todos los schemas |
| **Nada se borra, se anula** | Un presupuesto de obra o una contabilidad tienen que poder auditar qué pasó | ambos schemas |
| **`String[]` para `sugeridoPara`** | Evita una tabla de junctions para algo que es taxonomía interna. A cambio: **sin integridad referencial** | `identidad.prisma` |

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
| `identidad.prisma:7` | "DECISIÓN CLAVE (PLAN-BASE-NEXUS 2026-09-12)" — Member = la persona |
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
| **Catálogo** | ✅ Sí. El seed crea 4 filas de `Module`: `clientes`, `planes`, `pagos`, `gastos`; y una `Plantilla` `gym` que las agrupa |
| **Datos** | ✅ Sí. `lib/modulos/{clientes,planes,pagos,gastos}/` con sus consultas y acciones separadas + `lib/plantillas/gym/dashboard.ts` |
| **Schema** | ❌ No. Los 4 modelos viven en **un** archivo, `gym.prisma` |
| **Rutas** | ⚠️ A medias. `plantillas/gym/` tiene rutas propias para `clientes`, `pagos` y `gastos`, pero **`planes` no tiene ruta**: se maneja dentro del dashboard |
| **Naturaleza** | ⚠️ Los 4 están marcados **`VERTICAL`** y `sugeridoPara: ["gimnasio"]` → **no se pueden activar solos** fuera de un gym |

### La brecha real

**"4 módulos" existe en el catálogo y en el código, pero en la práctica un salón
de belleza, un consultorio o una clínica no pueden activar `clientes`**: está
marcado como vertical de gimnasio. Y `clientes` no es reutilizable ni por
accidente, porque **sus tablas están atadas a `Plan`**, que es concepto de
gimnasio.

### Tres ejes posibles (independientes entre sí)

**Eje A — la naturaleza de `clientes`:** ¿es un concepto de negocio genérico
("los clientes de mi negocio") o un concepto de gimnasio ("el socio con
membresía")?
→ **Si es genérico, debería ser `CAPA` y `sugeridoPara: []`.** Es exactamente lo
que el schema ya insinúa: el comentario de `Module.porDefecto` usa **"clientes"**
como ejemplo de módulo base.

**Eje B — el vínculo `Cliente → Plan`:** es la atadura que impide reutilizar
`clientes`. Hay dos caminos:

| Opción | Qué implica |
|---|---|
| **B) Sacar la membresía a su propia tabla** | `Cliente` queda limpio (nombre, documento, teléfono) y una tabla `Membresia { clienteId, planId, periodoFin, estado }` es lo gym-específico. **Es el modelo correcto** y además resuelve la fuga de §6.2 por construcción, si se le pone `orgId` |
| A) Mover `Plan` junto a `Cliente` | "planes de servicio" es reutilizable (un salón también tiene planes). Menos trabajo, pero sigue siendo gym-céntrico |

**Eje C — el archivo y la ruta:** `gym.prisma` → `clientes.prisma` +
`membresias.prisma` + `pagos.prisma` + `gastos.prisma`, y decidir si `clientes` se
navega en `/plantillas/gym/clientes` (heredando la ruta) o en
`/modulos/clientes` (suelto). Ojo: hoy la herencia de ruta está asumida en
`plantillas/gym/layout.tsx`.

### Mi lectura, sin decidir por vos

El **Eje A es el barato y el de mayor retorno**: cambiar `naturaleza` y
`sugeridoPara` en el seed es una línea, y ya abre la puerta a que otro rubro use
`clientes` sin tocar nada más. El **Eje B es el que cuesta y el que vale**: es la
diferencia entre "un módulo que dice clientes" y "clientes de verdad", y de paso
cierra la fuga cross-tenant en la base, no solo en el código.

### Antes de tocar nada, mirá estas cuatro cosas

1. **¿Cuánto pesa la migración?** **88 clientes y 738 pagos** (§1.1), y el padrón
   es **datos semilla, no producción real**: se puede tirar y regenerar con
   `seed-demo-gym.ts`. Eso hace que una migración de Gym sea barata **hoy** y
   carísima mañana. La ventana buena es ahora.
2. **`Pago` pertenece a `Cliente` o a `Membresia`?** Si `Membresia` existe, un
   pago de membresía debería colgar de la membresía, no del cliente. Hoy cuelga
   del cliente.
3. **`estado` y `periodoFin` se calculan en `pagos/acciones.ts`** — si se mueven
   a `Membresia`, hay que mover esa lógica y sus tests.
4. **Caja Menor no tiene clientes.** Si `clientes` fuera `CAPA`, caja podría
   registrar a quién se le entregó el efectivo. ¿Se quiere eso? Es una decisión de
   producto, no de base.

### El orden que yo seguiría (para discutir, no decidido)

| # | Paso | Costo | Por qué en ese orden |
|---|---|---|---|
| 1 | **Corregir la doc** (este doc + `DECISIONES.md`) | 0 | Antes de mover una tabla, que las razones estén escritas. Ya está la mitad (§7.1) |
| 2 | **Eje A**: `clientes` de `VERTICAL` → `CAPA`, `sugeridoPara: []` | **una línea de seed** | Es el paso de mayor retorno y el más barato. No toca el schema ni una sola fila |
| 3 | Cerrar la fuga de `planId` **en la base** (FK compuesta o trigger) | media | Ya está cerrada en el código con tests; en la base sigue abierta (§6.2) |
| 4 | **Eje B**: `Membresia` y `Cliente` genérico | alta | El que realmente libera a `clientes` para otros rubros. Toca la tabla más poblada |
| 5 | **Eje C**: partir `gym.prisma` en archivos + rutas | baja | Cosmético. **Al final a propósito**: no aporta nada mientras los datos sigan atados |

**El paso 2 es el que más rinde por lo que cuesta, y el 4 es el que importa de
verdad.** No hay que hacerlos juntos: el 2 no obliga al 4, y hacer el 4 primero
es hacer el trabajo difícil sin haber probado si el negocio lo quiere.

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
