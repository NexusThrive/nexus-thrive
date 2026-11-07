import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** HU-entregables-01: el negocio envía y el cliente aprueba o pide cambios con un enlace. */
test.describe("Entregables", () => {
  test("estados, enviar muestra el enlace una sola vez y se puede copiar", async ({ page }) => {
    await openStory(page, "páginas-ventas-entregables--default");
    await expect(page.getByText("En revisión del cliente")).toBeVisible();
    await expect(page.getByText(/Aprobado por/)).toBeVisible();
    await expect(page.getByText("pidió cambios")).toBeVisible();
    await page.getByRole("listitem").filter({ hasText: "Logo final" }).getByRole("button", { name: "Enviar al cliente" }).click();
    await expect(page.getByText(/Enlace para el cliente: Logo final/)).toBeVisible();
    await expect(page.getByText(/entregable\/AbCdEf/)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("nuevo entregable valida el nombre", async ({ page }) => {
    await openStory(page, "páginas-ventas-entregables--default");
    await page.getByRole("button", { name: "Nuevo entregable" }).click();
    const d = page.getByRole("dialog", { name: "Nuevo entregable" });
    await d.getByLabel(/Nombre/).fill("ab");
    await d.getByRole("button", { name: "Crear" }).click();
    await expect(d.getByText("Ponle un nombre al entregable.").first()).toBeVisible();
  });

  test("sin entregables explica qué hacer", async ({ page }) => {
    await openStory(page, "páginas-ventas-entregables--sin-entregables");
    await expect(page.getByText("Aún no hay entregables")).toBeVisible();
  });

  test("el cliente: pedir cambios exige el motivo y aprobar exige el nombre (360 px)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openStory(page, "páginas-públicas-revisión-de-entregable--default");
    await page.getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByText("Escribe tu nombre para dejar constancia.").first()).toBeVisible();
    await page.getByLabel(/Tu nombre/).fill("Camila");
    await page.getByRole("button", { name: "Pedir cambios" }).click();
    await expect(page.getByText("Cuéntanos qué hay que cambiar.").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expectNoAxeViolations(page);
  });
});
