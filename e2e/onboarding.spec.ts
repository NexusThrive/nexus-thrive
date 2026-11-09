import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

test.describe("Registro: tu negocio y tu operación", () => {
  test("el rubro es una lista con Comercio, Gimnasio y Restaurante; el NIT ocupa todo el ancho", async ({ page }) => {
    await openStory(page, "páginas-onboarding-tu-negocio--vacio");
    await page.getByRole("combobox", { name: /Rubro principal/ }).click();
    await expect(page.getByRole("option")).toHaveText(["Elige tu rubro", "Comercio", "Gimnasio", "Restaurante"]);
    await page.keyboard.press("Escape");
    const nit = await page.getByLabel(/NIT/).boundingBox();
    const nombre = await page.getByLabel(/Nombre comercial/).boundingBox();
    // En pantalla ancha el nombre ocupa media fila y el NIT la fila entera; en celular ambos van a todo el ancho.
    const ancho = (page.viewportSize()?.width ?? 0) >= 640;
    expect(nit!.width).toBeGreaterThanOrEqual(nombre!.width * (ancho ? 1.9 : 0.99));
    await expectNoAxeViolations(page);
  });
  test("elegir un rubro y marcar lo que vende se refleja", async ({ page }) => {
    await openStory(page, "páginas-onboarding-tu-negocio--elegir-rubro");
    await expect(page.getByRole("combobox", { name: /Rubro principal/ })).toContainText("Comercio");
    await openStory(page, "páginas-onboarding-tu-operación--en-funcionamiento");
    const mostrador = page.getByRole("button", { name: /Vendo en mostrador/ });
    await mostrador.click();
    await expect(mostrador).toHaveAttribute("aria-pressed", "true");
    await expectNoAxeViolations(page);
  });
});
