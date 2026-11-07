import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Lista de Contactos (Clientes y agenda): panel de control, tabla compacta, selección con acciones y vacío. */
test.describe("Lista de Contactos", () => {
  test("panel de control, columnas de negocio y selección con «Acciones»", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await openStory(page, "páginas-clientes-y-agenda-contactos--con-clientes");
    await expect(page.getByRole("link", { name: "Nuevo" })).toHaveAttribute("href", "/demo/contactos/nuevo");
    await expect(page.getByRole("searchbox")).toBeVisible();
    await expect(page.getByText("1-8 / 8")).toBeVisible();
    await expect(page.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    for (const col of ["Correo electrónico", "Próxima cita", "Por cobrar", "Registrado"]) await expect(page.getByRole("columnheader", { name: new RegExp(col) })).toBeVisible();
    await page.getByLabel("Seleccionar a María Pérez").check();
    await expect(page.getByText("1 seleccionado")).toBeVisible();
    await page.getByRole("button", { name: "Acciones", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Archivar" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expectNoAxeViolations(page);
  });

  test("en 390 px no hay desplazamiento horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await openStory(page, "páginas-clientes-y-agenda-contactos--con-clientes");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("sin clientes muestra el mensaje y «Nuevo»", async ({ page }) => {
    await openStory(page, "páginas-clientes-y-agenda-contactos--sin-clientes");
    await expect(page.getByText("Aún no tienes clientes")).toBeVisible();
    await expectNoAxeViolations(page);
    // El vacío ocupa el alto que queda: centrado y sin scroll.
    expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(0);
  });
});
