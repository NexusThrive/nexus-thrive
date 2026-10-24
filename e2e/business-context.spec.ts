import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Perfil del negocio: contexto, no restricción. */
test.describe("Perfil del negocio", () => {
  test("se ve el perfil general, el modelo comercial combinable y no hay violaciones de accesibilidad", async ({ page }) => {
    await openStory(page, "páginas-configuración-perfil-del-negocio--general");
    await expect(page.getByText("No limita nada")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Empresas \(B2B\)/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Personas \(B2C\)/ })).not.toBeChecked();
    await page.getByRole("checkbox", { name: /Personas \(B2C\)/ }).check(); // se pueden combinar
    await expect(page.getByRole("checkbox", { name: /Empresas \(B2B\)/ })).toBeChecked();
    await expectNoAxeViolations(page);
  });

  test("guarda y avisa que las funciones y los datos siguen igual; un error no se pierde", async ({ page }) => {
    await openStory(page, "páginas-configuración-perfil-del-negocio--general");
    await page.getByRole("button", { name: "Guardar perfil" }).click();
    await expect(page.getByText("Tus funciones y tus datos siguen igual.")).toBeVisible();
    await page.getByRole("textbox", { name: /Qué hace tu negocio/ }).fill("prueba error");
    await page.getByRole("button", { name: "Guardar perfil" }).click();
    await expect(page.getByText("No se pudo guardar (prueba de error).")).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Qué hace tu negocio/ })).toHaveValue("prueba error");
  });

  test("quien no es dueño ve el perfil sin poder cambiarlo", async ({ page }) => {
    await openStory(page, "páginas-configuración-perfil-del-negocio--solo-lectura");
    await expect(page.getByText("Solo el dueño del negocio cambia el perfil.")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Empresas \(B2B\)/ })).toBeDisabled();
    await expectNoAxeViolations(page);
  });
});
