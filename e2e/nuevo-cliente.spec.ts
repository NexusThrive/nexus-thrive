import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Vista «Nuevo cliente»: nombre obligatorio, vista previa en vivo, aviso de duplicado y confirmación al salir con cambios. */
test.describe("Nuevo cliente", () => {
  test("sin nombre no guarda y lo explica con texto", async ({ page }) => {
    await openStory(page, "páginas-clientes-y-agenda-nuevo-cliente--vacio");
    await page.getByRole("button", { name: "Guardar", exact: true }).first().click();
    await expect(page.getByText("Escribe el nombre del cliente")).toBeVisible();
    await expect(page.getByLabel(/Nombre completo/)).toHaveAttribute("aria-invalid", "true");
    await expectNoAxeViolations(page);
  });

  test("la vista previa se actualiza y avisa de un duplicado sin bloquear", async ({ page }) => {
    await openStory(page, "páginas-clientes-y-agenda-nuevo-cliente--vacio");
    await page.getByLabel(/Nombre completo/).fill("María Pérez");
    await expect(page.getByText("MP", { exact: true })).toBeVisible();
    await page.getByLabel("Teléfono").fill("300 123 4567");
    await page.getByLabel(/Correo electrónico/).click();
    await expect(page.getByText("+57 300 123 4567")).toBeVisible();
    await expect(page.getByText(/Ya existe/)).toBeVisible();
    await expect(page.getByText("Sin guardar")).toBeVisible();
    await page.getByRole("button", { name: "Guardar", exact: true }).first().click();
    await expect(page.getByText("Cliente guardado")).toBeVisible();
  });

  test("salir con cambios pide confirmación", async ({ page }) => {
    await openStory(page, "páginas-clientes-y-agenda-nuevo-cliente--vacio");
    await page.getByLabel(/Nombre completo/).fill("Ana");
    await page.getByRole("button", { name: "Descartar" }).click();
    await expect(page.getByRole("dialog", { name: "¿Descartar este cliente?" })).toBeVisible();
  });

  test("en 390 px no hay desplazamiento horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await openStory(page, "páginas-clientes-y-agenda-nuevo-cliente--vacio");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
