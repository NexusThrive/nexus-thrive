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

test.describe("Punto de venta · código de barras, tiquete y devoluciones", () => {
  test("escanear un código agrega la línea y uno desconocido avisa", async ({ page }) => {
    await openStory(page, "páginas-dinero-punto-de-venta--vendiendo");
    const box = page.getByLabel("Buscar producto o escanear código");
    await box.fill("7701234567890");
    await box.press("Enter");
    await expect(page.getByRole("button", { name: /Más Barra de proteína/ })).toBeVisible();
    await box.fill("1111111111");
    await box.press("Enter");
    await expect(page.getByText("No hay un producto con ese código.")).toBeVisible();
  });

  test("tras cobrar ofrece imprimir el tiquete", async ({ page }) => {
    await openStory(page, "páginas-dinero-punto-de-venta--vendiendo");
    await page.getByRole("button", { name: /^Barra de proteína/ }).click();
    await page.getByLabel("Valor del pago 1").fill("5000");
    await page.getByRole("button", { name: "Cobrar" }).click();
    await expect(page.getByRole("link", { name: "Imprimir tiquete" })).toHaveAttribute("href", "/demo/pos/receipt/d1");
  });

  test("devolución: busca la venta, no deja devolver lo ya devuelto y registra", async ({ page }) => {
    await openStory(page, "páginas-dinero-punto-de-venta--vendiendo");
    await page.getByRole("button", { name: "Devolución" }).click();
    const dialog = page.getByRole("dialog", { name: "Devolución" });
    await dialog.getByLabel(/N\.º de la venta/).fill("7");
    await dialog.getByRole("button", { name: "Buscar" }).click();
    await expect(dialog.getByText("No se encontró esa venta.")).toBeVisible();
    await dialog.getByLabel(/N\.º de la venta/).fill("42");
    await dialog.getByRole("button", { name: "Buscar" }).click();
    await expect(dialog.getByLabel("Devolver de Barra de proteína")).toBeDisabled();
    await dialog.getByLabel("Devolver de Proteína whey 2 lb").fill("1");
    await dialog.getByLabel(/Motivo/).fill("Sello roto");
    await dialog.getByRole("button", { name: "Registrar devolución" }).click();
    await expect(page.getByText(/nota crédito N\.º 5/)).toBeVisible();
  });
});
