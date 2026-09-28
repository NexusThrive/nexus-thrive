# Arquitectura de Nexus

> Mapa del repo para quien va a **dirigir** el producto y no todos los días tocar
> código. Dice dónde vive cada cosa, en qué orden se tocan las piezas y qué reglas
> no se pueden romper. Verificado leyendo el código a 2026-09-28.
>
> Vocabulario: `GLOSARIO.md` (nomenclatura congelada, un solo significado por
> término). Esto explica **dónde vive** cada término; el glosario explica **qué
> significa**.

---

## 1. Qué es este repo

Monorepo (**pnpm workspaces + Turborepo**) con **una sola app**: el portal de
Nexus. Todo lo demás son paquetes compartidos.

```
Nexus/
├── apps/
│   └── nexus-core/portal/          ← la app. Next.js 14 (App Router). Lo que ve el cliente
├── packages/
│   ├── prisma/                    ← capa de datos: schemas + cliente + seeds
│   ├── ui/                        ← componentes de UI compartidos
│   ├── utils/                     ← helpers tipados (Zod, schemas base)
│   └── config/                    ← presets compartidos
├── tooling/
│   ├── eslint-config/             ← config base de ESLint (la usan portal y ui)
│   └── tsconfig/                  ← tsconfig base estricto
├── docs/                          ← este doc + GLOSARIO.md
├── docker-compose.yml             ← PostgreSQL 16 local
└── turbo.json                     ← orquestación de tareas (build, lint, type-check, test)
```

**Regla de oro del monorepo:** lo reutilizable va en `packages/`, lo que pertenece
a la app vive en `apps/`. Un módulo **no** es una app: es un módulo (pantallas +
datos) dentro del portal.

> El README y el CLAUDE.md todavía dicen *"una app por módulo validado"* y
> mencionan `apps/nexus-finance`. Eso quedó atrás: las verticales antiguas se
> borraron y hoy todo vive en el portal.

---

## 2. Las 4 capas y hacia dónde pueden mirar

```
        ┌─────────────────────────────────────────────┐
   1.   │  PRESENTACIÓN   app/ (rutas) + components/    │  lo que ve el cliente
        ├─────────────────────────────────────────────┤
   2.   │  LÓGICA         lib/ (acciones + consultas)   │  reglas de negocio
        ├─────────────────────────────────────────────┤
   3.   │  DATOS          packages/prisma/schema/*.prisma│  tablas
        ├─────────────────────────────────────────────┤
   4.   │  INFRA          packages/config, tooling,     │  presets, lint, TS
        │                 docker-compose, turbo.json    │
        └─────────────────────────────────────────────┘
```

**Flechas permitidas:** 1 → 2 → 3 → 4. **Nunca al revés.**
Lo que está prohibido hoy: que un `.prisma` de módulo importe de lógica, o que el
núcleo (capa 3) conozca un módulo concreto. Ver §4.

---

## 3. El recorrido de un usuario (para ubicarse en el mapa)

| # | Ruta | Carpeta | Qué pasa |
|---|---|---|---|
| 1 | `/registro` | `app/(auth)/registro` | Crea `Member` + `Organization` (org queda sin onboarding) |
| 2 | `/login` | `app/(auth)/login` | NextAuth; la sesión es el **email** (identidad global) |
| 3 | `/onboarding` | `app/(onboarding)/onboarding` | Perfil del negocio: nombre, **moneda**, **país**, rubro → activa plantilla/módulos |
| 4 | `/` (panel) | `app/(protected)/page.tsx` | Muestra lo que la org tiene activo, según su onboarding |
| 5 | `/plantillas/gym` (dashboard) o `/modulos/<slug>` | `app/(protected)/…` | La pantalla del producto contratado: cada módulo vive en SU ruta, la plantilla solo tiene su panel |

Los grupos entre paréntesis `(auth)`, `(onboarding)`, `(protected)` son **rutas
virtuales** de Next: no existen como carpetas en la URL, solo organizan el
código y aplican el mismo `layout.tsx` (que exige sesión).

---

## 4. El núcleo no conoce los módulos (la regla más importante)

`packages/prisma/schema/` tiene **dos niveles**: el núcleo y los módulos. Cada
archivo en `modulos/` es **un** módulo del catálogo y su nombre es su
`modules.slug`.

```
schema/
├── schema.prisma            → datasource, generator, enums globales
├── core/
│   └── identidad.prisma     → EL NÚCLEO (6 tablas)
└── modulos/
    ├── clientes.prisma      → Cliente
    ├── membresias.prisma    → Membresia + EstadoMembresia (Eje B — pertenece
    │                          al módulo clientes, NO es un módulo del catálogo)
    ├── planes.prisma        → Plan
    ├── pagos.prisma         → Pago
    ├── gastos.prisma        → Gasto
    └── caja-menor.prisma    → CajaCategoria, MovimientoCaja
```

| Archivo | Qué contiene | Regla |
|---|---|---|
| `schema.prisma` | datasource, generator y **enums globales** (`Rol`, `CampoModulo`, `EstadoModuloOrg`, `UserScope`) | — |
| `core/identidad.prisma` | `Organization`, `Member`, `Module`, `OrganizationModule`, `Plantilla`, `PlantillaModulo` | **Núcleo puro.** Nada de clientes, nada de caja |
| `modulos/<slug>.prisma` | los modelos de **un** módulo, siempre con `orgId` | nombre = `modules.slug` |
| `modulos/membresias.prisma` | `Membresia` + `EstadoMembresia` (Eje B) | **excepción**: archivo extra del módulo `clientes`; no es módulo del catálogo ni tiene slug propio |

**Por qué:** un módulo nuevo (construcción, odontología, lo que sea) se agrega
**sin tocar el núcleo**. El núcleo solo sabe que existe un catálogo (`Module`) y
que una organización lo activó (`OrganizationModule`).

**Un módulo NO es de un rubro.** Es un producto que un negocio contrata. Lo que
es "de un rubro" vive en configuración, nunca en el schema: `Plantilla.rubro`
(a qué rubro se le ofrece el conjunto), `plantilla_modulos` (qué trae el
conjunto y cómo se llama en el menú) y `Module.sugeridoPara` (a quién se le
recomienda). Por eso `clientes` le sirve a un museo igual que a un gimnasio: son
las mismas tablas con filas distintas por `orgId`.

**Cómo se comprueba:** si mañana hay que agregar el módulo de presupuesto de
obras, `core/identidad.prisma` **no se toca**. Ese es el test mental de si la
arquitectura está sana.

**El invariante del slug** — el mismo identificador en los cuatro lugares:

```
schema/modulos/clientes.prisma  ·  modules.slug = "clientes"
lib/modulos/clientes/            ·  /modulos/clientes
```

Si un módulo nuevo rompe el invariante, es más fácil que alguien crea un
archivo "de gimnasio" con tablas globales — que fue exactamente lo que pasó
con `gym.prisma` (4 módulos en un archivo con nombre de rubro).

---

## 5. Anatomía de un módulo (las 5 piezas, siempre las 5)

Para que un módulo exista hacen falta estas piezas, en este orden. Los módulos
que ya están sirven de plantilla: **clientes** = CAPA (base del producto),
**Caja Menor** = CAPA, **Gym** = plantilla de VERTICALES.

### 1. Catálogo — ¿existe el módulo?
`Module` en el catálogo (`lib/core/modulos.ts` lo lee; el seed lo crea).
Ahí viven `slug`, `nombre`, `rutaBase` (la URL desde la que cuelga todo).

### 2. Activación — ¿esta organización lo tiene?
`OrganizationModule` con `estado: SOLICITADO | ACTIVO`. El onboarding decide;
el navbar muestra lo activo.

### 3. Datos — ¿dónde viven sus tablas?
Un `.prisma` propio. **Toda tabla cuelga de `Organization`**: cada modelo de
módulo lleva `orgId` y se consulta filtrando por él (ver §6).

### 4. Gate — ¿puede este usuario verlo y tocarlo?
`lib/core/requiere-modulo.ts` — **una sola decisión** para todo el portal
(`moduloActivoEnOrg` para datos, `requiereModuloActivo` para el guard con
sesión y redirect). Las rutas usan `components/core/GuardModulo.tsx` y los
layouts llaman a `requiereModuloActivo` directo. Solo `requireModuloCajaMenor`
(acciones del módulo) queda como delgado que delega a esa función; la
envoltura `gymHabilitado` del dashboard de Gym se eliminó en el Eje A.

### 5. Interfaz — ¿dónde está?
- Ruta: `app/(protected)/modulos/<slug>/` (suelto) o `app/(protected)/plantillas/<slug>/` (por rubro)
- Lógica: `lib/modulos/<slug>/` (acciones) + `lib/plantillas/<slug>/` (dashboard)
- Piezas de UI: `components/`

### Checklist para un módulo nuevo

```
[ ] 1. schema/modulos/<slug>.prisma  — modelos con orgId
[ ] 2. migración                      — pnpm --filter @nexus/prisma migrate dev
[ ] 3. seed del catálogo              — Module (+ Plantilla si es vertical)
[ ] 4. rutas + lib/modulos/<slug>/    — pantallas y acciones
[ ] 5. gate: usar requiere-modulo     — sin copies
[ ] 6. docs/README.md del módulo      — qué hace y cómo se prueba
```

> Los issues #22 y #15 del repo son exactamente esto: falta el README de cada
> módulo y falta el reporte mensual de caja.

---

## 6. Multitenancy: la regla que se rompe sola

`Organization` es el negocio del cliente. `Member` es la persona (email global,
puede estar en varias orgs). La **org activa** se elige en el navbar (cookie
`nexus-org-activa`) y se resuelve en `lib/core/org.ts` (`getOrgActiva()`).

**Regla:** toda query de datos de negocio filtra por `orgId` de la org activa.

**Estado real de esa regla (honesto):** hoy la sostienen la revisión de código y
44 tests. **No hay nada que la haga cumplir.** Ya se escapó una vez:
`Cliente.planId` era un FK global sin org, y un `planId` manipulado guardaba un
cliente de una org apuntando a un plan de otra (fuga de nombre y precio). Se
corrigió en escritura y en lectura, y quedó con tests
(`lib/modulos/clientes/consultas.test.ts`). Con el **Eje B** (2026-09-28) el
plan vive en `Membresia.planId` y la defensa se reforzó: al leer solo se
resuelve con un Map de los planes **de la org** (una membresía envenenada se ve
como "sin membresía").

**Trabajo pendiente de robustez:** una extensión de Prisma o una regla de lint
que obligue a pasar `orgId`. Es la diferencia entre "nos acordamos" y "no se
puede romper".

---

## 7. La capa de datos en la práctica

```bash
docker compose up -d                                    # PostgreSQL 16 local
pnpm --filter @nexus/prisma generate                    # genera el cliente
pnpm --filter @nexus/prisma migrate dev                 # crea/aplica migración
pnpm --filter @nexus/prisma studio                      # inspector visual
```

- **Migraciones:** `packages/prisma/migrations/` (versionadas, en el repo).
- **Seeds:** `packages/prisma/src/seed.ts` (estructural: catálogo + plantilla) y
  `seed-demo.ts` / `seed-demo-gym.ts` (datos de demostración, **idempotentes**:
  correrlos dos veces no duplica).
- **Cliente:** el portal importa `@prisma/client` **directo** desde
  `lib/core/prisma.ts` (singleton), no el wrapper de `@nexus/prisma`. A
  propósito: así el runtime queda fuera del bundle y Node encuentra el engine.
- **Multi-archivo:** Prisma con `prismaSchemaFolder`, por eso los `.prisma` viven
  en `schema/` y no en `prisma/`.

---

## 8. Verificación: qué corre hoy

| Comando | Qué hace | Estado |
|---|---|---|
| `pnpm dev` | levanta el portal (`:3005` en esta máquina) | ✅ |
| `pnpm type-check` | TypeScript estricto en todo el workspace | ✅ 3/3 |
| `pnpm lint` | ESLint (portal con `next/core-web-vitals`, ui con la config base) | ✅ 2/2, 0 errores, 1 warning |
| `pnpm test` | **Vitest en el portal** — 23 tests (formato, gate, multi-tenant) | ✅ 23/23 |
| `pnpm build` | build de producción | ✅ |
| CI en GitHub | — | ❌ **no existe** (issue #20) |

**Los tests viven junto al código** (`*.test.ts` al lado del archivo que prueban)
y usan Vitest con el alias `@/` (`apps/nexus-core/portal/vitest.config.ts`).

**Regla del repo:** un PR se considera terminado cuando `type-check`, `lint` y
`test` pasan. No hay CI que lo exija todavía — por eso el #20 importa.

---

## 9. Deuda documental conocida (2026-09-28)

| Qué | Estado |
|---|---|
| `docs/BASE-NEXUS.md` y `PLAN-BASE-NEXUS.md` | **No existen** y nadie los referenciaba: los 3 archivos que los citaban apuntaban a la nada. Ya no hay referencias rotas |
| `CLAUDE.md` decía que `Plantilla`/`PlantillaModulo` no existían | **Falso** desde el PR #25 — corregido |
| `CLAUDE.md` hablaba de la rama `core/base` | **No existe** (se borró al mergear) — corregido |
| README de cada módulo | No existe (issue #22) |
| Diagrama de decisión al agregar un módulo | Hay checklist en §5, falta diagrama |
| Diccionario de datos por tabla | No existe → es el siguiente trabajo |

Este documento cubre las capas, el mapa y las reglas. Lo que sigue es el
**diccionario de datos** (qué significa y quién escribe cada tabla), que es lo
que hace falta antes de meter el catálogo de APU.
