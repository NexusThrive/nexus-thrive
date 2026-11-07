import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";
import { medirDesborde } from "./responsive-helpers";

/** HU-vista-financiera-01: el dueño responde «¿dónde está mi dinero?» desde el celular, sin desplazamiento horizontal. */
test.describe("¿Dónde está mi dinero?", () => {
  test("muestra lo cobrado, lo que te deben, lo que viene en camino y lo pendiente", async ({ page }) => {
    await openStory(page, "páginas-dinero-dónde-está-mi-dinero--default");
    await expect(page.getByText("Cobrado · 30 días")).toBeVisible();
    await expect(page.getByText("Te deben")).toBeVisible();
    await expect(page.getByText("En camino a tu banco")).toBeVisible();
    await expect(page.getByText("2 transferencias por verificar")).toBeVisible();
    await expect(page.getByText("3 movimientos del banco con propuesta por confirmar")).toBeVisible();
    await expect(page.getByText("2 deudas vencidas")).toBeVisible();
    await expect(page.getByText("Wompi (tarjeta, PSE)")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("todo al día no muestra la lista de pendientes; sin movimientos explica qué falta", async ({ page }) => {
    await openStory(page, "páginas-dinero-dónde-está-mi-dinero--todo-al-dia");
    await expect(page.getByText("Por revisar")).toHaveCount(0);
    await openStory(page, "páginas-dinero-dónde-está-mi-dinero--sin-movimientos");
    await expect(page.getByText("Aún no hay movimientos de dinero")).toBeVisible();
  });

  for (const ancho of [320, 360, 412]) {
    test(`a ${ancho} px no hay desplazamiento horizontal, ni con nombres largos`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      for (const story of ["default", "nombres-largos"]) {
        await openStory(page, `páginas-dinero-dónde-está-mi-dinero--${story}`);
        const d = await medirDesborde(page);
        expect(d.desborda, `${story}: scrollWidth ${d.scroll} > viewport ${d.viewport}`).toBe(false);
      }
    });
  }
});
