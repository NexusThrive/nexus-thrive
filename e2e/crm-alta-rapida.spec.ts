import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** CRM etapa A1: el alta de cliente es rápida (nombre, WhatsApp, correo); el resto va en la ficha. */
test.describe("Alta rápida de cliente", () => {
  test("solo pide lo esencial y valida el nombre", async ({ page }) => {
    await openStory(page, "páginas-ventas-nuevo-cliente-alta-rápida--default");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const d = page.getByRole("dialog", { name: "Nuevo cliente" });
    await expect(d.getByLabel(/Nombre completo/)).toBeVisible();
    await expect(d.getByLabel(/WhatsApp/)).toBeVisible();
    await expect(d.getByLabel(/Correo/)).toBeVisible();
    // Nada de planes, cobros ni campos de otro rubro en el alta.
    await expect(d.getByText(/Plan con el que entra|Registrar y cobrar|Cobro/)).toHaveCount(0);
    await d.getByRole("button", { name: "Crear y abrir ficha" }).click();
    await expect(d.getByText("Escribe el nombre del cliente.")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("crear muestra confirmación y cierra", async ({ page }) => {
    await openStory(page, "páginas-ventas-nuevo-cliente-alta-rápida--default");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const d = page.getByRole("dialog", { name: "Nuevo cliente" });
    await d.getByLabel(/Nombre completo/).fill("Camila Torres");
    await d.getByRole("button", { name: "Crear y abrir ficha" }).click();
    await expect(page.getByText("Cliente guardado")).toBeVisible();
  });

  test("en 360 px el formulario entra sin desplazamiento horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await openStory(page, "páginas-ventas-nuevo-cliente-alta-rápida--default");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    await expect(page.getByRole("dialog", { name: "Nuevo cliente" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expectNoAxeViolations(page);
  });
});
