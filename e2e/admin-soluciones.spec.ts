import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** HU-transicion-01: el Operations Center revisa y fija la solución de cada negocio. */
test.describe("Soluciones por negocio", () => {
  test("los dudosos se explican y el filtro deja solo los que hay que revisar", async ({ page }) => {
    await openStory(page, "páginas-operations-center-soluciones--default");
    await expect(page.getByText("Su rubro puede ir en más de una solución").first()).toBeVisible();
    await expect(page.getByText("Usa una función que su solución no trae").first()).toBeVisible();
    await page.getByRole("button", { name: "Por revisar" }).click();
    await expect(page.getByText("Tienda Sol")).toHaveCount(0);
    await expect(page.getByText("Gym Norte").first()).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("cambiar la solución abre un diálogo y avisa el resultado", async ({ page }) => {
    await openStory(page, "páginas-operations-center-soluciones--default");
    await page.getByRole("button", { name: "Cambiar la solución de Café del Parque" }).first().click();
    const dialog = page.getByRole("dialog", { name: /Solución de Café del Parque/ });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(/Café del Parque/).last()).toBeVisible();
  });

  test("sin permiso de edición no hay botón Cambiar", async ({ page }) => {
    await openStory(page, "páginas-operations-center-soluciones--solo-lectura");
    await expect(page.getByRole("button", { name: /Cambiar la solución/ })).toHaveCount(0);
  });
});
