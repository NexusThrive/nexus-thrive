import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";
import { medirDesborde } from "./responsive-helpers";

/** HU-lead-capture-01: recibir interesados desde cualquier web sin exponer nada privado. */
test.describe("Formularios web", () => {
  test("lista los formularios con sus dominios y muestra el código para pegar", async ({ page }) => {
    await openStory(page, "páginas-ventas-formularios-web--default");
    await expect(page.getByText("Landing de camisetas")).toBeVisible();
    await expect(page.getByText(/Dominios: https:\/\/mitienda.com, https:\/\/www.mitienda.com/)).toBeVisible();
    await expect(page.getByText("Apagado")).toBeVisible();
    await page.getByRole("button", { name: "Ver código" }).first().click();
    const code = page.getByRole("dialog", { name: "Código para tu web" }).getByLabel("Código del formulario");
    await expect(code).toHaveValue(/api\/lead-capture\/lf_0123456789abcdef0123456789abcdef/);
    await expect(code).toHaveValue(/name="website"/);
    await expectNoAxeViolations(page);
  });

  test("crear valida el nombre y los dominios", async ({ page }) => {
    await openStory(page, "páginas-ventas-formularios-web--default");
    await page.getByRole("button", { name: "Nuevo formulario" }).click();
    const d = page.getByRole("dialog", { name: "Nuevo formulario" });
    await d.getByRole("button", { name: "Crear" }).click();
    await expect(d.getByText(/Ponle un nombre al formulario/).first()).toBeVisible();
    await d.getByLabel(/^Nombre/).fill("Landing nueva");
    await d.getByLabel(/Dominios permitidos/).fill("mitienda");
    await d.getByRole("button", { name: "Crear" }).click();
    await expect(d.getByText(/no es un dominio válido/).first()).toBeVisible();
    await d.getByLabel(/Dominios permitidos/).fill("https://mitienda.com");
    await d.getByRole("button", { name: "Crear" }).click();
    await expect(page.getByText(/Formulario creado/)).toBeVisible();
  });

  test("cambiar la clave pide confirmar; sin formularios se explica; sin desborde a 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openStory(page, "páginas-ventas-formularios-web--default");
    expect((await medirDesborde(page)).desborda).toBe(false);
    await page.getByRole("button", { name: "Cambiar clave" }).first().click();
    const c = page.getByRole("dialog", { name: "¿Cambiar la clave?" });
    await expect(c).toBeVisible();
    await c.getByRole("button", { name: "Cambiar clave" }).click();
    await expect(page.getByText(/Clave cambiada/)).toBeVisible();
    await openStory(page, "páginas-ventas-formularios-web--sin-formularios");
    await expect(page.getByText("Aún no tienes formularios")).toBeVisible();
  });
});
