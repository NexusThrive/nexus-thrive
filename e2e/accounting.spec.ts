import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Contabilidad I: plan de cuentas, reglas, centros de costo y períodos. */
test.describe("Contabilidad", () => {
  test("plan de cuentas con búsqueda, naturaleza y cuentas que agrupan", async ({ page }) => {
    await openStory(page, "páginas-finanzas-contabilidad--default");
    const table = page.getByRole("table", { name: "Plan de cuentas" });
    await expect(table.getByRole("row", { name: /1105.*Caja.*Activo.*Débito/ })).toBeVisible();
    await expect(table.getByRole("row", { name: /2408.*IVA.*Pasivo.*Crédito/ })).toBeVisible();
    await page.getByLabel("Buscar cuenta").fill("proveedores");
    await expect(table.getByRole("row", { name: /2205/ })).toBeVisible();
    await expect(table.getByRole("row", { name: /1105/ })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("nueva cuenta: explica cuando no cuelga de una existente", async ({ page }) => {
    await openStory(page, "páginas-finanzas-contabilidad--default");
    await page.getByRole("button", { name: "Nueva cuenta" }).click();
    const dialog = page.getByRole("dialog", { name: "Nueva cuenta" });
    await dialog.getByLabel(/Código/).fill("199999");
    await dialog.getByLabel(/Nombre/).fill("Sin padre");
    await dialog.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(dialog.getByText(/colgar de una cuenta existente/).first()).toBeVisible();
    await dialog.getByLabel(/Código/).fill("110505");
    await dialog.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Cuenta creada")).toBeVisible();
  });

  test("las reglas muestran sus débitos y créditos y se desactivan", async ({ page }) => {
    await openStory(page, "páginas-finanzas-contabilidad--default");
    await page.getByRole("button", { name: /Reglas de asientos/ }).click();
    const sale = page.getByRole("listitem").filter({ hasText: "Costo de la venta" }).first();
    await expect(sale.getByText("Costo de ventas")).toBeVisible();
    await sale.getByRole("button", { name: /Desactivar la regla Costo de la venta/ }).click();
    await expect(page.getByText("Regla desactivada")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("períodos: cerrar en orden y reabrir pide motivo", async ({ page }) => {
    await openStory(page, "páginas-finanzas-contabilidad--default");
    await page.getByRole("button", { name: "Períodos" }).click();
    await page.getByRole("button", { name: /Cerrar julio de 2026/ }).click();
    await expect(page.getByText(/cierra 06\/2026/)).toBeVisible();
    await page.getByRole("button", { name: /Reabrir agosto de 2026/ }).click();
    const dialog = page.getByRole("dialog", { name: "Reabrir mes" });
    await dialog.getByLabel(/Motivo/).fill("x");
    await dialog.getByRole("button", { name: "Reabrir mes" }).click();
    await expect(dialog.getByText(/Escribe el motivo/).first()).toBeVisible();
  });

  test("sin plan ofrece cargar el PUC", async ({ page }) => {
    await openStory(page, "páginas-finanzas-contabilidad--sin-plan");
    await page.getByRole("button", { name: "Cargar el PUC" }).click();
    await expect(page.getByText(/cuentas y 8 reglas cargadas/)).toBeVisible();
  });
});
