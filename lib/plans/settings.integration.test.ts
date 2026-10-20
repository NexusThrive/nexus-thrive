import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { ensureCatalogSeeded, loadPricingConfig } from "@/lib/plans/settings";

/**
 * Siembra del catálogo comercial (planes, módulos, rubros y tramos).
 *
 * El sembrado NO puede romper la app cuando dos peticiones llegan a la vez
 * sobre una base recién vacía: leer y después insertar deja una ventana en la
 * que la otra petición inserta la misma fila y la primera recibe "duplicate
 * key value". Es lo que pasaba en el CI (varios workers en paralelo) y lo que
 * le pasaría a dos negocios que se registran al mismo tiempo.
 *
 * Exige una base aparte (`TEST_DATABASE_URL`); se salta sin ella.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("siembra del catálogo (integración)", () => {
  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
    // Base limpia: sin catálogo.
    await db.orm.public.PlanSetting.all().then((rows) =>
      Promise.all(rows.map((r) => db.orm.public.PlanSetting.where({ key: r.key }).delete())),
    );
    await db.orm.public.ModuleSetting.all().then((rows) =>
      Promise.all(rows.map((r) => db.orm.public.ModuleSetting.where({ module: r.module }).delete())),
    );
    await db.orm.public.VerticalSetting.all().then((rows) =>
      Promise.all(rows.map((r) => db.orm.public.VerticalSetting.where({ vertical: r.vertical }).delete())),
    );
    await db.orm.public.CustomerTierSetting.all().then((rows) =>
      Promise.all(rows.map((r) => db.orm.public.CustomerTierSetting.where({ id: r.id }).delete())),
    );
  });

  afterAll(async () => {
    await db.close();
  });

  test("siembra en paralelo no rompe con claves duplicadas", async () => {
    // Cinco siembras a la vez, como cinco peticiones simultáneas.
    await Promise.all([
      ensureCatalogSeeded(),
      ensureCatalogSeeded(),
      ensureCatalogSeeded(),
      ensureCatalogSeeded(),
      ensureCatalogSeeded(),
    ]);

    const [plans, modules, verticals, tiers] = await Promise.all([
      db.orm.public.PlanSetting.all(),
      db.orm.public.ModuleSetting.all(),
      db.orm.public.VerticalSetting.all(),
      db.orm.public.CustomerTierSetting.all(),
    ]);
    expect(plans.length).toBe(3);
    expect(modules.length).toBeGreaterThan(0);
    expect(verticals.length).toBeGreaterThan(0);
    expect(tiers.length).toBeGreaterThan(0);
  });

  test("el catálogo queda completo y la configuración se puede leer", async () => {
    const config = await loadPricingConfig();
    expect(config.plans.map((p) => p.key).sort()).toEqual(["ELITE", "ESSENTIAL", "SIGNATURE"]);
    expect(config.verticals.length).toBeGreaterThan(0);
    expect(config.modules.length).toBeGreaterThan(0);
    expect(config.tiers.length).toBeGreaterThan(0);
  });

  test("volver a sembrar no cambia lo que el panel ya editó", async () => {
    await db.orm.public.PlanSetting.where({ key: "ELITE" }).update({ name: "Elite Editado" });
    await ensureCatalogSeeded();
    const plan = await db.orm.public.PlanSetting.where({ key: "ELITE" }).first();
    expect(plan?.name).toBe("Elite Editado");
  });
});
