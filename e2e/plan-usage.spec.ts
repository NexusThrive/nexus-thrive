import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Plan y consumo: el plan limita uso, no funciones. */
test.describe("Plan y consumo", () => {
  test("muestra el consumo con su barra y «sin límite» cuando no hay tope", async ({ page }) => {
    await openStory(page, "páginas-configuración-plan-y-consumo--default");
    await expect(page.getByText("Tu plan limita cuánto usas, no qué funciones tienes")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /Personas del equipo: 40 %/ })).toBeVisible();
    await expect(page.getByText(/Sin límite acordado/)).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("cerca del límite avisa", async ({ page }) => {
    await openStory(page, "páginas-configuración-plan-y-consumo--cerca-del-limite");
    await expect(page.getByText(/Personas del equipo: cerca del límite/)).toBeVisible();
    await expect(page.getByText(/Peticiones a la API y al MCP: cerca del límite/)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("límite alcanzado lo dice como alerta", async ({ page }) => {
    await openStory(page, "páginas-configuración-plan-y-consumo--limite-alcanzado");
    await expect(page.getByRole("alert")).toContainText("límite alcanzado");
    await expectNoAxeViolations(page);
  });
});
