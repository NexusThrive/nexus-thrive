import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Gráfica de ingresos y gastos: estados de los días, teclado y hoja de movimientos. */
test.describe("Gráfica de ingresos y gastos", () => {
  test("con teclado se recorre y anuncia cada punto, y distingue sin datos de sin movimientos", async ({ page }) => {
    await openStory(page, "organismos-finanzas-incomechart--sin-datos-y-sin-movimientos");
    const chart = page.getByRole("group", { name: /Gráfico de ingresos y gastos/ });
    await chart.focus();
    const live = page.getByRole("status").filter({ hasText: /./ });
    await expect(live).toContainText("ingresos"); // el último punto
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("status")).toContainText("sin movimientos");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("status")).toContainText("sin datos");
    await expectNoAxeViolations(page);
  });

  test("la hoja de movimientos tiene sus estados y pasa axe", async ({ page }) => {
    for (const id of ["cargando", "con-movimientos", "vacio", "con-error"]) {
      // La hoja se abre sola y no deja nada en la raíz: no se espera a que la raíz sea visible.
      await page.goto(`/iframe.html?id=organismos-finanzas-daymovementssheet--${id}&viewMode=story`);
      await expect(page.getByRole("dialog", { name: "Lunes 12 oct." })).toBeVisible();
      await expect(page.getByRole("link", { name: /Ver en Finanzas/ })).toHaveAttribute("href", "/gym-norte/finance");
      await expectNoAxeViolations(page);
    }
  });
});
