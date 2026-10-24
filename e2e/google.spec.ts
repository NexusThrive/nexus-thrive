import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Ficha de Google Business: conectar, sincronizar y comparar. */
test.describe("Ficha de Google", () => {
  test("compara tus datos con los de Google y marca lo que no coincide", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-ficha-de-google--sincronizada");
    await expect(page.getByText("4.6")).toBeVisible();
    await expect(page.getByText("128 reseñas en Google")).toBeVisible();
    const t = page.getByRole("table", { name: /frente a lo que muestra Google/ });
    await expect(t.getByRole("row", { name: /Teléfono.*Corrige uno de los dos/ })).toBeVisible();
    await expect(t.getByRole("row", { name: /Nombre.*Coincide/ })).toBeVisible();
    await expect(page.getByText(/3 de 4/)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Sincronizar ahora" }).click();
    await expect(page.getByText("Ficha sincronizada")).toBeVisible();
  });

  test("conectar valida el ID de lugar", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-ficha-de-google--sin-conectar");
    await page.getByRole("button", { name: "Conectar mi ficha" }).click();
    const dialog = page.getByRole("dialog", { name: "Conectar tu ficha de Google" });
    await dialog.getByLabel(/ID de lugar/).fill("abc");
    await dialog.getByLabel(/Llave de API/).fill("llave-larga-de-google-123");
    await dialog.getByRole("button", { name: "Conectar y sincronizar" }).click();
    await expect(dialog.getByText(/empieza por «ChIJ»/).first()).toBeVisible();
    await dialog.getByLabel(/ID de lugar/).fill("ChIJN1t_tDeuEmsRUsoyG83frY4");
    await dialog.getByRole("button", { name: "Conectar y sincronizar" }).click();
    await expect(page.getByText("Ficha conectada y sincronizada")).toBeVisible();
  });

  test("un error de Google se explica", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-ficha-de-google--con-error");
    await expect(page.getByText(/Places API \(New\)/)).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
