import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";
import { medirDesborde } from "./responsive-helpers";

/** HU-actividades-01: «mis tareas» y «vencidas» funcionan en el celular y avisan las vencidas. */
test.describe("Tareas", () => {
  test("avisa las vencidas, completa una tarea y cambia entre vistas", async ({ page }) => {
    await openStory(page, "páginas-ventas-tareas--default");
    await expect(page.getByText("Tienes 1 tarea vencida.")).toBeVisible();
    await expect(page.getByText(/Vencida · 2026-11-03/)).toBeVisible();
    await expect(page.getByText("Hoy", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Completar: Enviar la cotización de las gorras" }).click();
    await expect(page.getByText("Tarea completada")).toBeVisible();
    await page.getByRole("button", { name: /Vencidas/ }).click();
    await expect(page.getByText("Cobrar el saldo del pedido P-0040")).toBeVisible();
    await expect(page.getByRole("listitem").getByText(/Ana Ruiz/)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("nueva tarea valida el título", async ({ page }) => {
    await openStory(page, "páginas-ventas-tareas--default");
    await page.getByRole("button", { name: "Nueva tarea" }).click();
    const d = page.getByRole("dialog", { name: "Nueva tarea" });
    await d.getByRole("button", { name: "Crear" }).click();
    await expect(d.getByText("Escribe qué hay que hacer.").first()).toBeVisible();
    await d.getByLabel(/Qué hay que hacer/).fill("Llamar a Laura");
    await d.getByRole("button", { name: "Crear" }).click();
    await expect(page.getByText("Tarea creada")).toBeVisible();
  });

  for (const ancho of [320, 360]) {
    test(`a ${ancho} px no hay desplazamiento horizontal y el vacío se explica`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      await openStory(page, "páginas-ventas-tareas--default");
      expect((await medirDesborde(page)).desborda).toBe(false);
      await openStory(page, "páginas-ventas-tareas--sin-tareas");
      await expect(page.getByText("No tienes tareas asignadas")).toBeVisible();
    });
  }
});

test.describe("Tareas de proyecto", () => {
  test("filtrar por proyecto y por persona en el celular, sin desbordar", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openStory(page, "páginas-ventas-tareas--default");
    await page.getByRole("button", { name: /^Todas/ }).or(page.getByRole("radio", { name: /^Todas/ })).first().click();
    await expect(page.getByText("Proyecto Campaña de marca")).toBeVisible();
    await page.getByLabel("Filtrar por proyecto").click();
    await page.getByRole("option", { name: "Campaña de marca" }).click();
    await expect(page.getByText("Cobrar el saldo del pedido P-0040")).toHaveCount(0);
    await expect(page.getByText("Enviar la cotización de las gorras")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expectNoAxeViolations(page);
  });
});
