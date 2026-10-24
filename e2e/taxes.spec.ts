import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Impuestos con vigencia y resoluciones de numeración. */
test.describe("Impuestos y numeración", () => {
  test("tarifas con su vigencia y estado", async ({ page }) => {
    await openStory(page, "páginas-finanzas-impuestos-y-numeración--default");
    const table = page.getByRole("table", { name: /Impuestos y retenciones con su vigencia/ });
    await expect(table).toBeVisible();
    await expect(table.getByRole("row", { name: /IVA 19 %.*Vigente hoy/ })).toBeVisible();
    await expect(table.getByRole("row", { name: /IVA 16 %.*Fuera de vigencia/ })).toBeVisible();
    await expect(table.getByRole("row", { name: /Impoconsumo.*Desactivada/ })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("sin tarifas ofrece cargar las habituales", async ({ page }) => {
    await openStory(page, "páginas-finanzas-impuestos-y-numeración--sin-tarifas");
    await expect(page.getByRole("button", { name: "Cargar tarifas habituales" })).toBeVisible();
    await page.getByRole("button", { name: "Cargar tarifas habituales" }).click();
    await expect(page.getByText("8 tarifas cargadas")).toBeVisible();
  });

  test("nueva tarifa: el choque de vigencia se explica y se conserva lo escrito", async ({ page }) => {
    await openStory(page, "páginas-finanzas-impuestos-y-numeración--default");
    await page.getByRole("button", { name: "Nueva tarifa" }).click();
    const dialog = page.getByRole("dialog", { name: "Nueva tarifa" });
    await dialog.getByLabel(/Nombre/).fill("IVA 19 % nuevo");
    await dialog.getByLabel(/Código/).fill("IVA_19");
    await dialog.getByLabel(/Tarifa/).fill("19");
    await dialog.getByRole("button", { name: "Crear tarifa" }).click();
    await expect(dialog.getByText(/Ya hay una tarifa IVA_19 vigente/)).toBeVisible();
    await expect(dialog.getByLabel(/Nombre/)).toHaveValue("IVA 19 % nuevo");
    await expectNoAxeViolations(page);
  });

  test("numeración: avisa poco cupo, vencimiento y rango agotado", async ({ page }) => {
    await openStory(page, "páginas-finanzas-impuestos-y-numeración--default");
    await page.getByRole("button", { name: /Numeración/ }).click();
    await expect(page.getByText("Quedan 16 números del rango.")).toBeVisible();
    await expect(page.getByText("La resolución vence en 20 días.")).toBeVisible();
    await expect(page.getByText(/Se agotó el rango 1–500/)).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /18760000001/ })).toHaveAttribute("aria-valuenow", "12");
    await expectNoAxeViolations(page);
  });

  test("nueva resolución valida el rango", async ({ page }) => {
    await openStory(page, "páginas-finanzas-impuestos-y-numeración--default");
    await page.getByRole("button", { name: /Numeración/ }).click();
    await page.getByRole("button", { name: "Nueva resolución" }).click();
    const dialog = page.getByRole("dialog", { name: "Nueva resolución" });
    await dialog.getByLabel(/Número de resolución/).fill("18760000009");
    await dialog.getByLabel(/Número inicial/).fill("500");
    await dialog.getByLabel(/Número final/).fill("100");
    await dialog.getByRole("button", { name: "Registrar resolución" }).click();
    await expect(dialog.getByText(/final debe ser mayor/)).toBeVisible();
  });
});
