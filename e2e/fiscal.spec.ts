import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Factura electrónica por puerto: cola, envío, rechazo legible y reintento. */
test.describe("Factura electrónica", () => {
  test("lista con estados, causa del rechazo y CUFE", async ({ page }) => {
    await openStory(page, "páginas-finanzas-factura-electrónica--default");
    const table = page.getByRole("table", { name: /Documentos fiscales con su estado/ });
    await expect(table.getByRole("row", { name: /V-000042.*Aceptado/ })).toBeVisible();
    await expect(table.getByRole("row", { name: /V-000043.*Rechazado.*número de documento/ })).toBeVisible();
    await expect(table.getByRole("row", { name: /DS-CUENTA-55.*Documento soporte.*En cola/ })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("enviar los pendientes y reintentar un rechazado", async ({ page }) => {
    await openStory(page, "páginas-finanzas-factura-electrónica--default");
    await page.getByRole("button", { name: "Enviar los pendientes" }).click();
    await expect(page.getByText(/3 enviados · 2 aceptados · 1 rechazados/)).toBeVisible();
    await page.getByRole("button", { name: "Reintentar V-000043" }).click();
    await expect(page.getByText("Vuelve a la cola con los datos al día")).toBeVisible();
  });

  test("filtra por estado", async ({ page }) => {
    await openStory(page, "páginas-finanzas-factura-electrónica--default");
    await page.getByRole("button", { name: "Rechazado", exact: true }).click();
    await expect(page.getByRole("row", { name: /V-000042/ })).toHaveCount(0);
    await expect(page.getByRole("row", { name: /V-000043/ })).toBeVisible();
  });

  test("sin proveedor ofrece conectar el de prueba; desactivada explica qué hacer", async ({ page }) => {
    await openStory(page, "páginas-finanzas-factura-electrónica--sin-proveedor");
    await expect(page.getByRole("button", { name: "Conectar proveedor de prueba" })).toBeVisible();
    await openStory(page, "páginas-finanzas-factura-electrónica--desactivada");
    await expect(page.getByText("Sin documentos fiscales")).toBeVisible();
    await expect(page.getByText(/Activa la factura electrónica/)).toBeVisible();
  });
});
