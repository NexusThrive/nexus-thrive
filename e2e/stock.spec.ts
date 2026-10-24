import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Existencias: por bodega, traslados, conteos y reposición. */
test.describe("Existencias", () => {
  const tab = (page: import("@playwright/test").Page, name: RegExp) => page.getByRole("button", { name, pressed: false }).first().click();

  test("existencias por bodega con su costo y valor", async ({ page }) => {
    await openStory(page, "páginas-inventario-existencias--default");
    await expect(page.getByRole("table", { name: /Existencias por producto y bodega/ })).toBeVisible();
    await expect(page.getByText("Valor del inventario")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("una sola bodega: no se puede trasladar y lo explica", async ({ page }) => {
    await openStory(page, "páginas-inventario-existencias--una-sola-bodega");
    await tab(page, /Traslados/);
    await expect(page.getByRole("button", { name: "Nuevo traslado" })).toBeDisabled();
    await expect(page.getByText(/al menos dos bodegas/)).toBeVisible();
  });

  test("traslados: lista con origen y destino", async ({ page }) => {
    await openStory(page, "páginas-inventario-existencias--default");
    await tab(page, /Traslados/);
    await expect(page.getByText("Principal → Norte")).toBeVisible();
    await expect(page.getByText("TR-0002")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("nuevo traslado: avisa lo que falta y no deja pasar de lo que hay", async ({ page }) => {
    await openStory(page, "páginas-inventario-existencias--nuevo-traslado");
    const dialog = page.getByRole("dialog", { name: "Nuevo traslado" });
    await expect(dialog.getByText("Elige el producto.", { exact: false })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Trasladar" })).toBeDisabled();
    await expectNoAxeViolations(page);
  });

  test("conteo abierto: la diferencia se calcula en vivo y cerrar exige el motivo", async ({ page }) => {
    await openStory(page, "páginas-inventario-existencias--conteo-abierto");
    const dialog = page.getByRole("dialog", { name: "Conteo CT-0004" });
    await expect(dialog.getByLabel("Contado de Barra de proteína")).toBeVisible();
    await dialog.getByLabel("Contado de Barra de proteína").fill("38"); // −2
    await dialog.getByLabel("Contado de Shaker").fill("16"); // +1
    await expect(dialog.getByText("−2").or(dialog.getByText("-2"))).toBeVisible();
    await expect(dialog.getByText("+1")).toBeVisible();
    await expect(dialog.getByText(/2 con diferencia · sobran 1 · faltan 2/)).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Cerrar y ajustar" }).click();
    const confirmDialog = page.getByRole("alertdialog").or(page.getByRole("dialog", { name: /¿Cerrar CT-0004\?/ }));
    await expect(confirmDialog).toContainText("Se ajustarán 2 productos");
    await confirmDialog.getByRole("button", { name: "Cerrar y ajustar" }).click();
    await expect(page.getByText("Explica el motivo de las diferencias para poder ajustar.")).toBeVisible(); // sin motivo no se cierra
    await dialog.getByRole("textbox", { name: /Motivo/ }).fill("Conteo de fin de mes");
    await dialog.getByRole("button", { name: "Cerrar y ajustar" }).click();
    await page.getByRole("dialog", { name: /¿Cerrar CT-0004\?/ }).getByRole("button", { name: "Cerrar y ajustar" }).click();
    await expect(page.getByText(/Conteo cerrado: 2 ajustes/)).toBeVisible();
  });

  test("un conteo cerrado se ve sin poder editarse", async ({ page }) => {
    await openStory(page, "páginas-inventario-existencias--conteo-cerrado");
    const dialog = page.getByRole("dialog", { name: "Conteo CT-0004" });
    await expect(dialog.getByText("Cerrado")).toBeVisible();
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
    await expect(dialog.getByText("Motivo: Conteo de fin de mes")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Cerrar y ajustar|Cancelar conteo/ })).toHaveCount(0);
  });

  test("reposición: marca lo que hay que pedir y valida los niveles", async ({ page }) => {
    await openStory(page, "páginas-inventario-existencias--default");
    await tab(page, /Reposición/);
    await expect(page.getByText("Reponer 16")).toBeVisible();
    await expect(page.getByRole("link", { name: "Pedir" })).toHaveCount(1);
    await page.getByLabel("Máximo de Proteína whey 2 lb").fill("3");
    await page.getByRole("button", { name: "Guardar niveles de Proteína whey 2 lb" }).click();
    await expect(page.getByText("El máximo no puede ser menor")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("sin compras activas la reposición lo dice y no ofrece «Pedir»", async ({ page }) => {
    await openStory(page, "páginas-inventario-existencias--sin-compras-activas");
    await tab(page, /Reposición/);
    await expect(page.getByRole("link", { name: "Pedir" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Funciones" })).toBeVisible();
  });

  test("bodegas y estados vacíos", async ({ page }) => {
    await openStory(page, "páginas-inventario-existencias--default");
    await tab(page, /Bodegas/);
    await expect(page.getByText("Principal", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Nueva bodega" }).click();
    await page.getByRole("dialog", { name: "Nueva bodega" }).getByRole("button", { name: "Crear bodega" }).click();
    await expect(page.getByText("Ponle un nombre a la bodega.")).toBeVisible();
    await openStory(page, "páginas-inventario-existencias--sin-movimientos");
    await expect(page.getByText("Aún no hay existencias")).toBeVisible();
  });
});
