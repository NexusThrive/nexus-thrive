import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Actividad reciente: filtros por tipo con conteo, enlaces a cada registro y estado vacío por filtro. */
test.describe("Actividad reciente", () => {
  test("filtra por tipo, enlaza a cada registro y explica los filtros vacíos", async ({ page }) => {
    await openStory(page, "organismos-recentactivity--con-filtros");
    const group = page.getByRole("group", { name: "Filtrar actividad" });
    await expect(group.getByRole("button", { name: /Todo/ })).toHaveAttribute("aria-pressed", "true");

    await group.getByRole("button", { name: /Pendientes/ }).click();
    await expect(page.getByRole("link", { name: /Inversiones Sabana/ })).toHaveAttribute("href", "/gym-norte/cartera");
    await expect(page.getByRole("link", { name: "Ver la cartera" })).toBeVisible();
    await expect(page.getByText("Laura Méndez")).toHaveCount(0);

    await group.getByRole("button", { name: /Socios/ }).click();
    await expect(page.getByRole("link", { name: /Andrés Gómez/ })).toHaveAttribute("href", "/gym-norte/crm/abc");
    await expectNoAxeViolations(page);
  });

  test("un filtro sin datos dice por qué está vacío", async ({ page }) => {
    await openStory(page, "organismos-recentactivity--filtro-vacio");
    await page.getByRole("group", { name: "Filtrar actividad" }).getByRole("button", { name: /Vencimientos/ }).click();
    await expect(page.getByText("Nada por vencer")).toBeVisible();
  });
});
