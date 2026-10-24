import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Punto de venta: turno, venta con pago mixto y arqueo. */
test.describe("Punto de venta", () => {
  test("sin turno: elige terminal libre y abre", async ({ page }) => {
    await openStory(page, "páginas-dinero-punto-de-venta--sin-turno");
    await expect(page.getByRole("option", { name: /Sede norte \(en uso\)/ })).toBeDisabled();
    await page.getByRole("button", { name: "Abrir turno" }).click();
    await expect(page.getByText("Turno abierto")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("sin terminales explica qué hacer", async ({ page }) => {
    await openStory(page, "páginas-dinero-punto-de-venta--sin-terminales");
    await expect(page.getByText(/Aún no hay terminales/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Nueva terminal" })).toBeVisible();
  });

  test("vender 3 líneas con descuento, propina y pago mixto con cambio", async ({ page }) => {
    await openStory(page, "páginas-dinero-punto-de-venta--vendiendo");
    await page.getByRole("button", { name: /^Proteína whey 2 lb/ }).click();
    await page.getByRole("button", { name: /^Barra de proteína/ }).click();
    await page.getByRole("button", { name: "Más Barra de proteína" }).click();
    await expect(page.getByRole("button", { name: /^Shaker/ })).toBeDisabled(); // sin existencias
    await page.getByLabel("Descuento de Proteína whey 2 lb").fill("10");
    await page.getByLabel("Propina %").fill("10");
    // 90.000 + 10.000 = 100.000 (+19 % de 90.000 = 17.100) → 117.100 + propina 10.000
    await expect(page.getByText(/Total a cobrar/).locator("..")).toContainText("127.100");
    await page.getByLabel("Valor del pago 1").fill("100000");
    await expect(page.getByRole("button", { name: "Cobrar" })).toBeDisabled();
    await page.getByRole("button", { name: "Agregar otro pago" }).click();
    await page.getByLabel("Valor del pago 2").fill("30000");
    await page.getByLabel("Medio de pago 2").selectOption("CASH");
    await expect(page.getByText(/Cambio: .*2\.900/)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Cobrar" }).click();
    await expect(page.getByText(/Venta N\.º 42/).first()).toBeVisible();
  });

  test("cerrar turno pide el efectivo contado y muestra la diferencia", async ({ page }) => {
    await openStory(page, "páginas-dinero-punto-de-venta--vendiendo");
    await page.getByRole("button", { name: "Cerrar turno" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Cerrar turno" });
    await dialog.getByRole("button", { name: "Cerrar turno" }).click();
    await expect(dialog.getByText("Escribe el efectivo contado.")).toBeVisible();
    await dialog.getByLabel(/Efectivo contado/).fill("196000");
    await dialog.getByRole("button", { name: "Cerrar turno" }).click();
    await expect(page.getByText(/Faltan 200/)).toBeVisible();
  });
});
