import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Configuración · Mi cuenta: lectura primero, edición con guardar y cancelar. */
test.describe("Mi cuenta", () => {
  test("se lee como información, sin campos abiertos", async ({ page }) => {
    await openStory(page, "páginas-configuración-mi-cuenta--default");
    await expect(page.getByText("Ana Gómez")).toBeVisible();
    await expect(page.getByText("ana@ejemplo.com")).toBeVisible();
    await expect(page.getByLabel(/Nombre/)).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("cancelar descarta lo escrito y guardar valida y confirma", async ({ page }) => {
    await openStory(page, "páginas-configuración-mi-cuenta--default");
    await page.getByRole("button", { name: /Modificar tus datos/ }).click();
    const d = page.getByRole("dialog", { name: "Modificar tus datos" });
    await d.getByLabel(/Nombre/).fill("Nombre descartado");
    await d.getByRole("button", { name: "Cancelar" }).click();
    // Con cambios sin guardar, cancelar pregunta antes de descartar.
    await page.getByRole("dialog", { name: "¿Guardar los cambios?" }).getByRole("button", { name: "Descartar" }).click();
    await expect(page.getByText("Nombre descartado")).toHaveCount(0);
    await expect(page.getByText("Ana Gómez")).toBeVisible();

    await page.getByRole("button", { name: /Modificar tus datos/ }).click();
    await d.getByLabel(/Nombre/).fill("A");
    await d.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(d.getByText("Escribe tu nombre.").first()).toBeVisible();
    await d.getByLabel(/Nombre/).fill("Ana María Gómez");
    await d.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Tu perfil se actualizó")).toBeVisible();
    await expect(page.getByText("Ana María Gómez")).toBeVisible();
  });

  test("lo que no se ha completado lo dice", async ({ page }) => {
    await openStory(page, "páginas-configuración-mi-cuenta--sin-completar");
    await expect(page.getByText("Sin completar").first()).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("Navegación de Configuración por propósito", () => {
  test("los grupos se rotulan en escritorio", async ({ page, isMobile }) => {
    test.skip(isMobile, "En el celular son píldoras sin rótulos de grupo");
    await page.setViewportSize({ width: 1280, height: 800 });
    await openStory(page, "moléculas-sectionnav--ajustes");
    for (const g of ["Organización", "Personas", "Preferencias personales"]) await expect(page.getByText(g, { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
