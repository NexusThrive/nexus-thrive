import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

test.describe("Informes del comercio", () => {
  test("turnos: cifras, estado del cuadre y vacío", async ({ page }) => {
    await openStory(page, "páginas-dinero-turnos-de-caja--con-turnos");
    await expect(page.getByText("Cuadraron")).toBeVisible();
    await expect(page.getByText(/Falta/).first()).toBeVisible();
    await expectNoAxeViolations(page);
    await openStory(page, "páginas-dinero-turnos-de-caja--sin-turnos");
    await expect(page.getByText("Aún no hay turnos")).toBeVisible();
  });
  test("valorización: por categoría y lo que más vale, y vacío", async ({ page }) => {
    await openStory(page, "páginas-inventario-valorización--con-inventario");
    await expect(page.getByRole("heading", { name: "Por categoría" })).toBeVisible();
    await expectNoAxeViolations(page);
    await openStory(page, "páginas-inventario-valorización--sin-inventario");
    await expect(page.getByText("Aún no hay inventario que valorar")).toBeVisible();
  });
  test("kardex: movimientos con saldo y estados vacíos", async ({ page }) => {
    await openStory(page, "páginas-inventario-kardex--con-movimientos");
    await expect(page.getByText("Compra OC-0004")).toBeVisible();
    await expectNoAxeViolations(page);
    await openStory(page, "páginas-inventario-kardex--sin-elegir-producto");
    await expect(page.getByText("Elige un producto").last()).toBeVisible();
  });
  test("lista de precios: un escalón inválido se explica", async ({ page }) => {
    await openStory(page, "páginas-ventas-lista-de-precios--escalon-invalido");
    await expect(page.getByRole("alert").getByText(/2 o más/)).toBeVisible();
  });
});
