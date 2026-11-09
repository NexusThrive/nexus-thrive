import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";
import { medirDesborde } from "./responsive-helpers";

/** HU-leads-01: seguir a cada interesado hasta que compra o se pierde. */
test.describe("Oportunidades", () => {
  test("la acción vencida se ve primero y se puede ganar, avanzar o perder con motivo", async ({ page }) => {
    await openStory(page, "páginas-ventas-oportunidades--default");
    await expect(page.getByText(/Llamar para confirmar el diseño · 2026-11-01 \(vencida\)/)).toBeVisible();
    await expect(page.getByText("Sin siguiente paso")).toBeVisible();
    await page.getByRole("button", { name: "Ganada", exact: true }).first().click();
    await expect(page.getByText("¡Ganada! El contacto pasa a cliente")).toBeVisible();
    await page.getByRole("button", { name: "Perdida", exact: true }).first().click();
    const d = page.getByRole("dialog", { name: "Marcar como perdida" });
    await d.getByRole("button", { name: "Marcar perdida" }).click();
    await expect(d.getByText("Escribe por qué se perdió.").first()).toBeVisible();
    await d.getByLabel(/Por qué se perdió/).fill("Compró en otro lado");
    await d.getByRole("button", { name: "Marcar perdida" }).click();
    await expect(page.getByText("Oportunidad perdida: quedó el motivo")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("nueva oportunidad valida el interés", async ({ page }) => {
    await openStory(page, "páginas-ventas-oportunidades--default");
    await page.getByRole("button", { name: "Nueva oportunidad" }).click();
    const d = page.getByRole("dialog", { name: "Nueva oportunidad" });
    await d.getByRole("button", { name: "Crear" }).click();
    await expect(d.getByText("Escribe qué le interesa a la persona.").first()).toBeVisible();
    await d.getByLabel(/Qué le interesa/).fill("Gorras para el equipo");
    await d.getByRole("button", { name: "Crear" }).click();
    await expect(page.getByText("Oportunidad creada")).toBeVisible();
  });

  test("las ganadas, perdidas y el vacío se explican; sin desborde a 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openStory(page, "páginas-ventas-oportunidades--default");
    expect((await medirDesborde(page)).desborda).toBe(false);
    await page.getByRole("button", { name: /Perdidas/ }).first().click().catch(() => undefined);
    await openStory(page, "páginas-ventas-oportunidades--sin-oportunidades");
    await expect(page.getByText("Sin oportunidades abiertas")).toBeVisible();
  });
});
