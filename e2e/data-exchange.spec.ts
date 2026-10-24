import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Importar y exportar: revisar antes de guardar, errores por fila y descargas. */
test.describe("Importar y exportar", () => {
  const file = (name: string) => ({ name, mimeType: "text/csv", buffer: Buffer.from("Nombre,Precio\nCafé,1000\n") });
  const card = (page: import("@playwright/test").Page, title: string) => page.getByRole("region", { name: title }).or(page.locator(`section[aria-labelledby="data-${title === "Clientes" ? "customers" : "products"}"]`)).first();

  test("las dos tarjetas ofrecen plantilla y exportación", async ({ page }) => {
    await openStory(page, "páginas-sistema-importar-y-exportar--default");
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Plantilla" })).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Exportar" }).first()).toHaveAttribute("href", "/demo/data/export/customers");
    await expect(page.getByRole("button", { name: "Revisar archivo" }).first()).toBeDisabled();
    await expectNoAxeViolations(page);
  });

  test("revisa el archivo, muestra los errores por fila y luego importa", async ({ page }) => {
    await openStory(page, "páginas-sistema-importar-y-exportar--default");
    const c = card(page, "Catálogo");
    await c.getByLabel(/Archivo a importar/).setInputFiles(file("catalogo.csv"));
    await c.getByRole("button", { name: "Revisar archivo" }).click();
    await expect(c.getByText("38 nuevos")).toBeVisible();
    await expect(c.getByText("3 con error")).toBeVisible();
    await expect(c.getByRole("cell", { name: "Precio inválido: «barato»." })).toBeVisible();
    await expect(c.getByRole("cell", { name: "19", exact: true })).toBeVisible();
    await expectNoAxeViolations(page);
    await c.getByRole("button", { name: "Importar 44 filas" }).click();
    await expect(c.getByText(/38 nuevos, 6 actualizados, 5 sin cambios y 3 filas con error/)).toBeVisible();
    await c.getByRole("button", { name: "Importar otro archivo" }).click();
    await expect(c.getByLabel(/Archivo a importar/)).toBeVisible();
  });

  test("un archivo sin columnas obligatorias dice qué falta", async ({ page }) => {
    await openStory(page, "páginas-sistema-importar-y-exportar--default");
    const c = card(page, "Clientes");
    await c.getByLabel(/Archivo a importar/).setInputFiles(file("malo.csv"));
    await c.getByRole("button", { name: "Revisar archivo" }).click();
    await expect(c.getByText(/le falta la columna/)).toBeVisible();
    await expect(c.getByRole("button", { name: /Importar/ })).toHaveCount(0);
  });

  test("cancelar descarta el archivo elegido", async ({ page }) => {
    await openStory(page, "páginas-sistema-importar-y-exportar--default");
    const c = card(page, "Clientes");
    await c.getByLabel(/Archivo a importar/).setInputFiles(file("limpio.csv"));
    await c.getByRole("button", { name: "Cancelar" }).click();
    await expect(c.getByRole("button", { name: "Revisar archivo" })).toBeDisabled();
  });
});
