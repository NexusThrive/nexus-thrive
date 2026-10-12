# Prisma 8 — Guía de consultas verificadas (lane ORM + lane SQL)

> Verificado contra `@prisma/orm-postgres` **8.0.0-rc.14** con el target **postgres** y el
> contrato de este repo (`prisma/contract.prisma` → `prisma/contract.d.ts`).
> Cada patrón tiene una prueba corta en `lib/prisma8-query-patterns.integration.test.ts`
> (9 pruebas, incluidas por `pnpm test:integration`).
>
> Regla de oro: **no adivines la API**. Los nombres de método y sus restricciones están en
> `node_modules/.pnpm/@prisma+orm-family-sql*/node_modules/@prisma/orm-family-sql/dist/orm-client.d.mts`
> (lane ORM) y `.../db-DLjWu9-f-*.d.mts` (lane SQL). El target postgres añade operadores propios
> en `@prisma/orm-target-postgres/dist/operation-types-*.d.mts`.

## Dos lanes

| Lane | Superficie | Para qué |
| --- | --- | --- |
| **ORM** | `db.orm.<ns>.<Model>` | Consultas tipadas: `where/orderBy/limit/offset/include/select/aggregate/groupBy/distinct`. Es el camino por defecto. |
| **SQL** | `db.sql.<ns>.<Model>` | SQL por tabla: `select/insert/update/delete` + joins (`innerJoin/outerLeftJoin/...`), devuelve un *plan* que se ejecuta con `db.runtime().execute(plan)`. |
| **Cruda** | `db.raw.sql\`…\`` | Sentencia completa como template tag; `.returnsRow(spec)` / `.affectedCount()`. |

Terminales de lectura: `.all()`, `.first()`, `.aggregate(...)`, `.groupBy(...).aggregate(...)`, `.prepared`.
Cada builder devuelve una colección nueva (inmutable); **encadená y terminá** para ejecutar.

---

## 1. Filtro — `where` (+ AND encadenado)

```ts
// Objeto shorthand (igualdad):
await db.orm.public.ApuItem.where({ tenantId }).all();

// Callback con operadores de columna:
await db.orm.public.ApuItem
  .where({ tenantId })
  .where((item) => item.category.eq("EQUIPO"))
  .all();

// Varios `where` se combinan con AND. También `or(...)` importado del runtime.
await db.orm.public.ApuItem
  .where({ tenantId })
  .where((i) => or(i.name.ilike(p), i.code.ilike(p)))  // p = "%texto%"
  .all();
```

Operadores por columna (`ComparisonMethodFns`): `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `like`,
`in`, `notIn`, `isNull`, `isNotNull`, `asc`, `desc`.
**Extra del target postgres**: `ilike` y búsqueda full-text (`fullTextMatches`, `fullTextRank`,
`fullTextHeadline`, `websearchToTsquery` | `toTsquery` | `plaintoTsquery` | `phrasetoTsquery`).

> `in` recibe un array; `isNull()` **no** recibe argumento.

## 2. Contains insensible a mayúsculas — `ilike('%…%')`

**No existe** `contains` ni la opción `mode: 'insensitive'`. `like` es *case-sensitive*; el target
postgres agrega **`ilike`** (ILIKE). Para "contiene" se envuelve el texto en `%…%`, y **hay que
escapar los comodines** (`%`, `_`, `\`) para que la búsqueda sea literal:

```ts
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}
const pattern = `%${escapeLike(texto)}%`;
await db.orm.public.ApuItem
  .where({ tenantId })
  .where((item) => or(item.name.ilike(pattern), item.code.ilike(pattern)))
  .all();
```

Gotcha: en Postgres el escape por defecto de `LIKE`/`ILIKE` es `\`, así que `\%` y `\_` matchean
literal. Sin escapar, `%_%` matchea **todas** las filas con ≥1 carácter (probado).

## 3. `orderBy`

```ts
await db.orm.public.ApuItem
  .where({ tenantId })
  .orderBy((item) => item.unitPrice.desc())
  .all();

// Nulls explícitos + múltiples claves (array, orden izquierda→derecha):
await db.orm.public.ApuItem
  .orderBy([(i) => i.code.desc({ nulls: "last" }), (i) => i.name.asc()])
  .all();
```

`OrderByNulls = 'first' | 'last'`. Llamar a `orderBy` **habilita** `cursor(...)` y `distinctOn(...)`.

## 4. Paginación — `limit`/`offset` (no hay `skip`/`take`)

**No existen `skip` ni `take`.** Se usan `limit(n)` / `offset(n)`, y **ambos exigen un `orderBy`
previo** (el tipo los bloquea con `HasOrderBy extends true`, porque "las primeras n filas" no está
definido sin orden).

```ts
const filas = await db.orm.public.ApuItem
  .where({ tenantId })
  .orderBy((item) => item.name.asc())
  .limit(10)                                  // ← requiere orderBy antes
  .offset((page - 1) * 10)
  .all();
```

Paginación por keyset: `.orderBy(...).cursor({ createdAt: ultimo })`.

## 5. `count` y agregados — `aggregate`

```ts
const { total } = await db.orm.public.ApuItem
  .where({ tenantId })
  .aggregate((aggregate) => ({ total: aggregate.count() }));

// Otros: aggregate.sum("campo"), .avg("campo"), .min("campo"), .max("campo")
```

`aggregate` agrega **en la base** (no trae filas). Para leer el conteo de la misma consulta paginada
sin duplicar filtros, construí la colección filtrada **una vez** y derivá `.all()` y `.aggregate()`
en paralelo (`Promise.all`), como hace `apu.listItems`.

## 6. `select` (proyección) e `include` (relaciones)

```ts
// Proyección de columnas:
await db.orm.public.ApuItem.select("id", "name").where({ tenantId }).all();

// Relación a uno / a muchos, con refinamiento:
await db.orm.public.ApuActivity
  .where({ id, tenantId })
  .include("compositions", (c) =>
    c.include("item", (item) => item.select("id", "name", "unit")),
  )
  .first();
```

Un `include` con callback admite: `.where`, `.orderBy`, `.limit`, `.select`, `.count()`,
`.sum()/.avg()/…`, y `.combine({ recientes: c.limit(3), total: c.count() })` para varias sub-vistas
escalares en un solo `include`.
`select(...)` preserva las relaciones ya incluidas; sólo recorta columnas escalares.

## 7. Agrupación y valores distintos

```ts
const porUnidad = await db.orm.public.ApuItem
  .where({ tenantId })
  .groupBy("unit")
  .aggregate((a) => ({ total: a.count() }));
// → [{ unit: "HORA", total: 3 }, ...]  (la clave del grupo viene incluida)

// Filtro post-agrupación y paginación de grupos (esta última requiere orderBy):
await db.orm.public.ApuItem
  .where({ tenantId })
  .groupBy("category")
  .having((h) => h.total.gte(2))
  .orderBy((m) => m.category.asc())
  .limit(5)
  .aggregate((a) => ({ total: a.count() }));

// Valores distintos:
await db.orm.public.ApuItem.where({ tenantId }).distinct("unit").all();
await db.orm.public.ApuItem.orderBy((i) => i.createdAt.desc()).distinctOn("category", "name").all();
```

`groupBy(...)` devuelve `GroupedCollection` (no una colección normal). `distinctOn` (DISTINCT ON de
Postgres) **requiere `orderBy` previo**; `distinct` no.

## 8. Transacciones

```ts
const actividad = await db.transaction(async (tx) => {
  const creada = await tx.orm.public.ApuActivity.create({ ...datos, tenantId });
  for (const c of composiciones) {
    await tx.orm.public.ApuActivityComposition.create({ activityId: creada.id, ...c });
  }
  return creada;
});
```

Commit atómico al retornar; **rollback** si el callback lanza. Dentro de la transacción usá `tx.orm`
(y `tx.sql`); **nunca** el `db` global, o la escritura queda fuera de la transacción.

## 9. "leftJoin" — relaciones con `include` (o la lane SQL si hace falta SQL real)

La lane ORM **no tiene `join`**: las relaciones se cargan con `include`, y una relación a-uno se
mapea a **objeto o `null`** (semántica LEFT JOIN), mientras que a-muchos se mapea a **array**:

```ts
const comp = await db.orm.public.ApuActivityComposition
  .where({ activityId })
  .include("item", (i) => i.select("id", "name", "unitPrice"))  // item! puede ser null
  .all();
```

Si de verdad necesitás un JOIN SQL (columnas combinadas, proyecciones cruzadas), usá la **lane SQL**,
que sí expone: `innerJoin`, **`outerLeftJoin`**, `outerRightJoin`, `outerFullJoin`, `lateralJoin`,
`outerLateralJoin`. Preferí siempre `include` salvo que el JOIN deba hacerse en una sola consulta.

## 10. SQL cruda — lane SQL y `db.raw.sql`

**Lane SQL por tabla** (devuelve un *plan*; se ejecuta con `db.runtime()`):

```ts
const plan = db.sql.public.ApuItem
  .delete()
  .where((field, fns) => fns.and(fns.eq(field.tenantId, tenantId), fns.eq(field.active, false)))
  .build();
const { affectedRows } = await db.runtime().execute(plan);
```

Métodos de tabla: `.select(...)`, `.insert(rows)`, `.update(set | cb)`, `.delete()`, `.as(alias)`,
`.columns`, y los joins del punto 9. `insert`/`update`/`delete` admiten `.returning(...)` cuando el
target lo soporta (capability `sql.returning`).

**Sentencia completa cruda**: `db.raw.sql` (template tag) con `.returnsRow(spec)` o
`.affectedCount()`. Usalo sólo cuando la lane ORM o la lane SQL no alcancen, y siempre con valores
*bound* (interpolación), nunca concatenando strings.

---

## Otras operaciones de escritura (ORM)

`create`, `createAll`, `createAndCount`, `update`, `updateAll`, `updateAndCount`, `delete`,
`deleteAll`, `deleteAndCount`, `upsert`. Para "insertar y saltar duplicados":
`.create(rows, { onConflict: "skip", conflictOn: ["tenantId", "code"] })`.

```ts
db.orm.public.ApuItem.where({ id, tenantId }).update(datos);          // una fila
db.orm.public.ApuActivityComposition.where({ activityId }).deleteAll(); // lote
```

## Gotchas verificados (resumen)

1. `limit`/`offset`/`cursor`/`distinctOn` **requieren `orderBy` previo**.
2. No hay `skip`/`take` (`limit`/`offset`), ni `contains`/`startsWith`/`mode: 'insensitive'` (`ilike('%…%')`).
3. Escapá `%` y `_` con `escapeLike` para búsquedas literales.
4. Enums son `text` + CHECK (Prisma 8 no crea tipos ENUM de Postgres).
5. Decimal → string al leer (`String(row.unitPrice)`); al escribir se acepta string.
6. `aggregate` corre en la base; usalo para conteos en vez de traer filas.
7. Dentro de `db.transaction` usá `tx`, no `db`.

## Cómo reproducir

```bash
# base aparte migrada a HEAD, luego:
TEST_DATABASE_URL="$TESTDB" DATABASE_URL="$TESTDB" pnpm test:integration
# → 29 (tenant-db) + 9 (patrones de consulta) = 38 pruebas
```
