import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Cartera por cobrar y por pagar. */
test.describe("Cartera", () => {
  test("por cobrar: total por antigüedad, mora y saldo", async ({ page }) => {
    await openStory(page, "páginas-finanzas-cartera--default");
    const table = page.getByRole("table", { name: /Cuentas por cobrar/ });
    await expect(table.getByRole("row", { name: /Gimnasio Atlas.*115 días de mora/ })).toBeVisible();
    await expect(table.getByRole("row", { name: /María Pérez.*600\.000/ })).toBeVisible();
    await expect(page.getByRole("region", { name: /Antigüedad de la cartera por cobrar/ }).getByText("Más de 90 días")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("abono: no deja pasar del saldo y confirma al guardar", async ({ page }) => {
    await openStory(page, "páginas-finanzas-cartera--default");
    await page.getByRole("button", { name: /Registrar abono · María Pérez/ }).click();
    const dialog = page.getByRole("dialog", { name: "Registrar abono" });
    await expect(dialog.getByText(/saldo \$\s?600\.000/)).toBeVisible();
    await dialog.getByLabel(/Valor/).fill("700000");
    await dialog.getByRole("button", { name: "Registrar abono" }).click();
    await expect(dialog.getByText("No puede ser mayor que el saldo.")).toBeVisible();
    await dialog.getByLabel(/Valor/).fill("200000");
    await dialog.getByRole("button", { name: "Registrar abono" }).click();
    await expect(page.getByText(/Abono registrado · R-000045/)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("por pagar: pestaña propia y el error del servidor no cierra el diálogo", async ({ page }) => {
    await openStory(page, "páginas-finanzas-cartera--default");
    await page.getByRole("button", { name: /Por pagar/ }).click();
    await expect(page.getByRole("table", { name: /Cuentas por pagar/ }).getByText("Distribuidora Sur")).toBeVisible();
    await page.getByRole("button", { name: /Pagar · Distribuidora Sur/ }).click();
    const dialog = page.getByRole("dialog", { name: "Registrar pago" });
    await dialog.getByLabel(/Valor/).fill("13");
    await dialog.getByRole("button", { name: "Registrar pago" }).click();
    await expect(dialog.getByText(/cambió mientras pagabas/)).toBeVisible();
    await expect(dialog.getByLabel(/Valor/)).toHaveValue("13");
  });

  test("sin permiso de pagar proveedores solo ve lo por cobrar; vacío se explica", async ({ page }) => {
    await openStory(page, "páginas-finanzas-cartera--solo-por-cobrar");
    await expect(page.getByRole("button", { name: /Por pagar/ })).toHaveCount(0);
    await openStory(page, "páginas-finanzas-cartera--sin-cartera");
    await expect(page.getByText("Nadie te debe")).toBeVisible();
  });
});
