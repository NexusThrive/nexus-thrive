import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Usuarios del Operations Center: negocios por persona, límite y creación. */
test.describe("Usuarios (Operations Center)", () => {
  test("muestra cuántos negocios tiene cada persona y marca a quien llegó a su límite", async ({ page }) => {
    await openStory(page, "operations-center-usuarios--lista");
    await expect(page.getByText("2 negocios propios · límite 2")).toBeVisible();
    await expect(page.getByText("1 negocio propio · sin límite")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear negocio para ana@ejemplo.com" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Crear negocio para luis@ejemplo.com" })).toBeEnabled();
    await expectNoAxeViolations(page);
  });

  test("fija el límite y valida lo que se escribe", async ({ page }) => {
    await openStory(page, "operations-center-usuarios--lista");
    await page.getByRole("button", { name: "Límite de luis@ejemplo.com" }).click();
    const d = page.getByRole("dialog", { name: /Límite de negocios/ });
    await d.getByLabel(/Máximo de negocios/).fill("abc");
    await d.getByRole("button", { name: "Guardar límite" }).click();
    await expect(d.getByText(/número entero/).first()).toBeVisible();
    await d.getByLabel(/Máximo de negocios/).fill("4");
    await d.getByRole("button", { name: "Guardar límite" }).click();
    await expect(page.getByText("Límite fijado en 4")).toBeVisible();
  });

  test("crea un negocio para la persona", async ({ page }) => {
    await openStory(page, "operations-center-usuarios--lista");
    await page.getByRole("button", { name: "Crear negocio para luis@ejemplo.com" }).click();
    const d = page.getByRole("dialog", { name: /Crear un negocio para luis/ });
    await d.getByRole("button", { name: "Crear negocio" }).click();
    await expect(d.getByText(/mínimo 3 letras/).first()).toBeVisible();
    await d.getByLabel(/Nombre del negocio/).fill("Obras Pardo Sur");
    await d.getByRole("button", { name: "Crear negocio" }).click();
    await expect(page.getByText(/Obras Pardo Sur/)).toBeVisible();
  });

  test("solo lectura: sin botones de cambio", async ({ page }) => {
    await openStory(page, "operations-center-usuarios--solo-lectura");
    await expect(page.getByRole("button", { name: /^Límite de/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Crear negocio para/ })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
});
