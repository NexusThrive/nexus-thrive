import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Ficha del cliente: identidad, resumen que abre su pestaña, «Añadir» hacia la edición, nota y eliminar con alternativa de archivar. */
test.describe("Ficha del cliente", () => {
  test("muestra identidad, resumen, datos e historial", async ({ page }) => {
    await openStory(page, "páginas-clientes-y-agenda-ficha-del-cliente--completa");
    await expect(page.getByRole("heading", { level: 1, name: "María Pérez" })).toBeVisible();
    await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/573001234567");
    await expect(page.getByRole("link", { name: /Facturado/ })).toHaveAttribute("href", /tab=facturas#historial$/);
    await expect(page.getByRole("link", { name: "Citas", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Pendiente")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("los datos que faltan llevan a la edición en ese campo", async ({ page }) => {
    await openStory(page, "páginas-clientes-y-agenda-ficha-del-cliente--recien-creada");
    await expect(page.getByRole("link", { name: "Añadir correo" })).toHaveAttribute("href", /editar=1&campo=email/);
    await expect(page.getByRole("link", { name: "Enviar correo" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Crear primera venta" })).toBeVisible();
  });

  test("registrar nota y eliminar con historial ofrece archivar", async ({ page }) => {
    await openStory(page, "páginas-clientes-y-agenda-ficha-del-cliente--completa");
    await page.getByRole("button", { name: "Registrar nota" }).click();
    await expect(page.getByLabel("Nota interna")).toBeFocused();
    await page.getByRole("button", { name: "Más acciones" }).click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByRole("dialog", { name: "No se puede eliminar" })).toBeVisible();
  });

  test("en 390 px no hay desplazamiento horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await openStory(page, "páginas-clientes-y-agenda-ficha-del-cliente--completa");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
