import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";
import { medirDesborde } from "./responsive-helpers";

/** HU-cotizacion-01: cotizar con el catálogo y convertir sin reescribir. */
test.describe("Cotizaciones comerciales", () => {
  test("aprobar crea el pedido con su anticipo; una vencida no se aprueba", async ({ page }) => {
    await openStory(page, "páginas-ventas-cotizaciones--default");
    await expect(page.getByText("COT-0003")).toBeVisible();
    await expect(page.getByText("Vencida", { exact: true })).toBeVisible();
    // La vencida (borrador de octubre) no se puede aprobar.
    const rows = page.getByRole("listitem");
    await expect(rows.filter({ hasText: "Gorras bordadas" }).getByRole("button", { name: "Aprobar" })).toBeDisabled();
    await rows.filter({ hasText: "Camisetas con logo" }).getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByText(/nació el pedido con un anticipo de/)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("rechazar pide el motivo", async ({ page }) => {
    await openStory(page, "páginas-ventas-cotizaciones--default");
    await page.getByRole("listitem").filter({ hasText: "Camisetas con logo" }).getByRole("button", { name: "Rechazar" }).click();
    const d = page.getByRole("dialog", { name: "Rechazar cotización" });
    await d.getByRole("button", { name: "Rechazar" }).click();
    await expect(d.getByText("Escribe por qué la rechazó el cliente.").first()).toBeVisible();
    await d.getByLabel(/Por qué la rechazó/).fill("Pidió otro proveedor");
    await d.getByRole("button", { name: "Rechazar" }).click();
    await expect(page.getByText("Cotización rechazada")).toBeVisible();
  });

  test("armar la cotización muestra el anticipo y el saldo, valida el título y no desborda a 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openStory(page, "páginas-ventas-cotizaciones--default");
    expect((await medirDesborde(page)).desborda).toBe(false);
    await page.getByRole("button", { name: "Nueva cotización" }).click();
    const d = page.getByRole("dialog", { name: "Nueva cotización" });
    await expect(d.getByText(/Anticipo \$\s?20\.000 · saldo \$\s?20\.000/)).toBeVisible();
    await d.getByRole("button", { name: "Crear cotización" }).click();
    await expect(d.getByText("Escribe de qué trata la cotización.").first()).toBeVisible();
    await d.getByLabel(/De qué trata/).fill("Gorras para el equipo");
    await d.getByRole("button", { name: "Crear cotización" }).click();
    await expect(page.getByText(/creada/)).toBeVisible();
  });
});
