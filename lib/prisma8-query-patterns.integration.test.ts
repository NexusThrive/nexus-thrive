import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";

/**
 * Prisma 8 — patrones de consulta verificados (integración).
 *
 * Una prueba corta por patrón documentado en `docs/construction/prisma8-queries.md`.
 * NO toca la base de desarrollo: se salta salvo que exista `TEST_DATABASE_URL`,
 * y exige que `DATABASE_URL` apunte a esa misma base (igual que
 * `tenant-db.integration.test.ts`).
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

/** Escapa comodines de LIKE para búsqueda literal (mismo helper que tenant-db). */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

describe.skipIf(!enabled)("Prisma 8 — patrones de consulta (integración)", () => {
  const slug = `test-qp-${Date.now().toString(36)}`;
  let tenantId = "";
  let itemCemento = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }

    const tenant = await db.orm.public.Tenant.create({
      name: "Tenant de prueba — patrones de consulta",
      slug,
      vertical: "construction",
    });
    tenantId = tenant.id;

    // Fixture: categorías/unidades/nombres distintos para poder agrupar,
    // ordenar, buscar por patrón y filtrar.
    const cemento = await db.orm.public.ApuItem.create({
      tenantId,
      code: "MAT-001",
      name: "Cemento Portland",
      unit: "BOLSA",
      category: "MATERIAL",
      unitPrice: "28000",
    });
    itemCemento = cemento.id;
    await db.orm.public.ApuItem.create({
      tenantId,
      code: "MAT-002",
      name: "Arena fina",
      unit: "M3",
      category: "MATERIAL",
      unitPrice: "45000",
    });
    await db.orm.public.ApuItem.create({
      tenantId,
      code: "MO-001",
      name: "Oficial albañil",
      unit: "HORA",
      category: "MANO_DE_OBRA",
      unitPrice: "12500",
    });
    await db.orm.public.ApuItem.create({
      tenantId,
      code: "EQ-001",
      name: "Mezcladora",
      unit: "HORA",
      category: "EQUIPO",
      unitPrice: "8000",
    });
    await db.orm.public.ApuItem.create({
      tenantId,
      code: "EQ-002",
      name: "Vibrador",
      unit: "HORA",
      category: "EQUIPO",
      unitPrice: "6000",
      active: false,
    });
    // `code` nulo + guion bajo literal (para probar escapeLike y nulls last).
    await db.orm.public.ApuItem.create({
      tenantId,
      name: "Perfil _especial",
      unit: "UN",
      category: "MATERIAL",
      unitPrice: "1000",
    });
  });

  afterAll(async () => {
    if (tenantId) {
      await db.orm.public.Tenant.where({ id: tenantId }).delete();
    }
  });

  test("filtro (eq / in / boolean) — where y AND encadenados", async () => {
    const equipos = await db.orm.public.ApuItem
      .where({ tenantId })
      .where((item) => item.category.eq("EQUIPO"))
      .all();
    expect(equipos).toHaveLength(2);

    const inactivos = await db.orm.public.ApuItem
      .where({ tenantId })
      .where((item) => item.active.eq(false))
      .all();
    expect(inactivos).toHaveLength(1);

    const dos = await db.orm.public.ApuItem
      .where({ tenantId })
      .where((item) => item.id.in([itemCemento, inactivos[0]!.id]))
      .all();
    expect(dos).toHaveLength(2);
  });

  test("contains insensible a mayúsculas — ilike('%…%') con escapeLike", async () => {
    const pattern = `%${escapeLike("ceMENTO")}%`;
    const filas = await db.orm.public.ApuItem
      .where({ tenantId })
      .where((item) => item.name.ilike(pattern))
      .all();
    expect(filas.map((f) => f.name)).toEqual(["Cemento Portland"]);

    // Sin escapar, `_` es comodín (matchea el guion bajo literal Y cualquier char).
    const sinEscapar = await db.orm.public.ApuItem
      .where({ tenantId })
      .where((item) => item.name.ilike("%_%"))
      .all();
    expect(sinEscapar.length).toBe(6);

    // Escapado, `_` es literal: solo "Perfil _especial".
    const escapado = await db.orm.public.ApuItem
      .where({ tenantId })
      .where((item) => item.name.ilike(`%${escapeLike("_")}%`))
      .all();
    expect(escapado.map((f) => f.name)).toEqual(["Perfil _especial"]);
  });

  test("orderBy (asc/desc y nulls last)", async () => {
    const porPrecio = await db.orm.public.ApuItem
      .where({ tenantId })
      .orderBy((item) => item.unitPrice.desc())
      .all();
    expect(String(porPrecio[0]!.unitPrice)).toBe("45000");

    const porCodigo = await db.orm.public.ApuItem
      .where({ tenantId })
      .orderBy((item) => item.code.desc({ nulls: "last" }))
      .all();
    expect(porCodigo[porCodigo.length - 1]!.code).toBeNull();
  });

  test("paginación (limit/offset) — requiere orderBy previo", async () => {
    const pagina2 = await db.orm.public.ApuItem
      .where({ tenantId })
      .orderBy((item) => item.name.asc())
      .limit(2)
      .offset(2)
      .all();
    expect(pagina2).toHaveLength(2);
    const completa = await db.orm.public.ApuItem
      .where({ tenantId })
      .orderBy((item) => item.name.asc())
      .all();
    expect(pagina2.map((f) => f.name)).toEqual(
      completa.slice(2, 4).map((f) => f.name),
    );
  });

  test("count (aggregate) — agrégase solo, sin traer filas", async () => {
    const { total } = await db.orm.public.ApuItem
      .where({ tenantId })
      .aggregate((aggregate) => ({ total: aggregate.count() }));
    expect(total).toBe(6);
  });

  test("select (proyección) e include (relación + proyección anidada)", async () => {
    const resumen = await db.orm.public.ApuItem
      .where({ tenantId })
      .select("id", "name")
      .orderBy((item) => item.name.asc())
      .first();
    expect(Object.keys(resumen!).sort()).toEqual(["id", "name"]);

    const actividad = await db.orm.public.ApuActivity.create({
      tenantId,
      code: "A-001",
      name: "Muro de ladrillo",
      unit: "M2",
      description: "Fixture",
    });
    await db.orm.public.ApuActivityComposition.create({
      activityId: actividad.id,
      itemId: itemCemento,
      consumption: "7",
      wastePercent: "5",
    });

    const detalle = await db.orm.public.ApuActivity
      .where({ id: actividad.id, tenantId })
      .include("compositions", (compositions) =>
        compositions.include("item", (item) => item.select("id", "name", "unit")),
      )
      .first();
    expect(detalle!.compositions).toHaveLength(1);
    expect(detalle!.compositions[0]!.item!.name).toBe("Cemento Portland");
  });

  test("agrupación y valores distintos (groupBy / distinct por unidad)", async () => {
    const porUnidad = await db.orm.public.ApuItem
      .where({ tenantId })
      .groupBy("unit")
      .aggregate((aggregate) => ({ total: aggregate.count() }));
    expect(porUnidad.map((g) => g.unit).sort()).toEqual(["BOLSA", "HORA", "M3", "UN"]);
    expect(porUnidad.find((g) => g.unit === "HORA")!.total).toBe(3);

    const unidades = await db.orm.public.ApuItem
      .where({ tenantId })
      .distinct("unit")
      .all();
    expect(unidades.map((u) => u.unit).sort()).toEqual(["BOLSA", "HORA", "M3", "UN"]);
  });

  test("transacción — commit atómico y rollback ante error", async () => {
    const creada = await db.transaction(async (tx) => {
      const actividad = await tx.orm.public.ApuActivity.create({
        tenantId,
        name: "Actividad transaccional",
        unit: "UN",
      });
      for (const itemId of [itemCemento]) {
        await tx.orm.public.ApuActivityComposition.create({
          activityId: actividad.id,
          itemId,
          consumption: "1",
          wastePercent: "0",
        });
      }
      return actividad;
    });
    const composiciones = await db.orm.public.ApuActivityComposition
      .where({ activityId: creada.id })
      .aggregate((aggregate) => ({ total: aggregate.count() }));
    expect(composiciones.total).toBe(1);

    // El rollback no debe dejar rastro.
    const nombreFallido = "Actividad que revierte";
    await expect(
      db.transaction(async (tx) => {
        await tx.orm.public.ApuActivity.create({ tenantId, name: nombreFallido, unit: "UN" });
        throw new Error("falla deliberada");
      }),
    ).rejects.toThrow("falla deliberada");
    const restos = await db.orm.public.ApuActivity
      .where({ tenantId })
      .where((a) => a.name.eq(nombreFallido))
      .aggregate((aggregate) => ({ total: aggregate.count() }));
    expect(restos.total).toBe(0);
  });

  test("SQL lane (cruda) — db.sql.<ns>.<Model> + db.runtime().execute", async () => {
    // Equivalente a un batch delete: el `.delete()` del ORM borra una fila;
    // la SQL lane devuelve `affectedRows` de toda la sentencia.
    const plan = db.sql.public.ApuItem
      .delete()
      .where((field, fns) =>
        fns.and(
          fns.eq(field.tenantId, tenantId),
          fns.eq(field.active, false),
        ),
      )
      .build();
    const { affectedRows } = await db.runtime().execute(plan);
    expect(affectedRows).toBe(1);

    const { total } = await db.orm.public.ApuItem
      .where({ tenantId })
      .aggregate((aggregate) => ({ total: aggregate.count() }));
    expect(total).toBe(5);
  });
});
