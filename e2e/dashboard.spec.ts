import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Inicio personalizable (modo de edición) y primeros pasos de una cuenta nueva. */
test.describe("Dashboard personalizable", () => {
  const KEY = "nx:dashboard:storybook";
  const metricas = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Métricas del negocio" });

  test("modo de edición: oculta, cambia el ancho, no guarda hasta «Guardar» y persiste", async ({ page }) => {
    await openStory(page, "organismos-customizabledashboard--default");
    await page.evaluate((k) => window.localStorage.removeItem(k), KEY);
    await page.reload();

    await expect(metricas(page)).toBeVisible();
    await page.getByRole("button", { name: "Personalizar" }).click();
    const bar = page.getByRole("region", { name: "Modo de edición del inicio" });
    await expect(bar).toBeVisible();

    // Cambiar de ancho (solo desde lg): el selector propio.
    const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024;
    if (isDesktop) {
      await page.getByRole("combobox", { name: "Ancho de Ingresos y gastos" }).click();
      await page.getByRole("option", { name: "La mitad" }).click();
    }
    await page.getByRole("switch", { name: "Mostrar Métricas" }).click();

    // Cancelar descarta todo.
    await bar.getByRole("button", { name: "Cancelar" }).click();
    await expect(bar).toHaveCount(0);
    await expect(metricas(page)).toBeVisible();
    expect(await page.evaluate((k) => window.localStorage.getItem(k), KEY)).toBeNull();

    // Editar otra vez y guardar.
    await page.getByRole("button", { name: "Personalizar" }).click();
    await page.getByRole("switch", { name: "Mostrar Métricas" }).click();
    await page.getByRole("button", { name: "Bajar Ingresos y gastos" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(metricas(page)).toHaveCount(0);
    const stored = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), KEY))!);
    expect(stored.v).toBe(2);
    expect(stored.hidden).toEqual(["kpis"]);

    await page.reload();
    await expect(metricas(page)).toHaveCount(0);

    // Restablecer y guardar devuelve el diseño por defecto.
    await page.getByRole("button", { name: "Personalizar" }).click();
    await page.getByRole("button", { name: "Restablecer" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(metricas(page)).toBeVisible();
  });

  test("arrastrar con teclado reordena los bloques", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 700, "En móvil se usa Subir/Bajar");
    await openStory(page, "organismos-customizabledashboard--default");
    await page.evaluate((k) => window.localStorage.removeItem(k), KEY);
    await page.reload();
    await page.getByRole("button", { name: "Personalizar" }).click();
    await page.getByRole("button", { name: "Arrastrar Métricas" }).focus();
    await page.keyboard.press("Space");
    // dnd-kit engancha las flechas un instante después de tomar el bloque.
    await expect(page.getByRole("button", { name: "Arrastrar Métricas" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowDown");
    // dnd-kit recalcula el destino en el siguiente cuadro.
    await expect(page.locator("#DndLiveRegion-0, [id^=DndLiveRegion]")).toContainText("sobre Ingresos y gastos");
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Guardar" }).click();
    const stored = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), KEY))!);
    expect(stored.order[0]).toBe("chart");
  });

  test("la preferencia antigua (v1) se sigue leyendo", async ({ page }) => {
    await openStory(page, "organismos-customizabledashboard--default");
    await page.evaluate((k) => window.localStorage.setItem(k, JSON.stringify({ order: ["activity", "kpis", "chart"], hidden: ["chart"] })), KEY);
    await page.reload();
    await expect(metricas(page)).toBeVisible();
    await expect(page.getByText("Gráfico de ingresos y gastos (muestra)")).toHaveCount(0);
  });

  test("sin violaciones axe en modo de edición", async ({ page }) => {
    await openStory(page, "organismos-customizabledashboard--default");
    await page.evaluate((k) => window.localStorage.removeItem(k), KEY);
    await page.reload();
    await page.getByRole("button", { name: "Personalizar" }).click();
    await page.getByRole("region", { name: "Modo de edición del inicio" }).waitFor();
    await expectNoAxeViolations(page);
  });
});

test.describe("Primeros pasos (cuenta nueva)", () => {
  test("muestra el avance, cambia de paso, enlaza y se oculta para siempre", async ({ page }) => {
    await openStory(page, "organismos-welcomechecklist--new-account");
    await page.evaluate(() => window.localStorage.removeItem("nx:welcome:storybook-welcome"));
    await page.reload();

    await expect(page.getByText("0 de 4 pasos completados")).toBeVisible();
    await expect(page.getByRole("link", { name: /Nuevo socio/ })).toHaveAttribute("href", "/gym-norte/crm");

    await page.getByRole("button", { name: "Agrega tus gastos" }).click();
    await expect(page.getByRole("heading", { name: "Agrega tus gastos" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Registrar gasto/ })).toBeVisible();

    await page.getByRole("button", { name: "Ocultar primeros pasos" }).click();
    await expect(page.getByRole("heading", { name: "Primeros pasos" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Primeros pasos" })).toHaveCount(0);
  });

  test("los pasos hechos cuentan en el avance y pasan axe", async ({ page }) => {
    await openStory(page, "organismos-welcomechecklist--in-progress");
    await page.evaluate(() => window.localStorage.removeItem("nx:welcome:storybook-welcome"));
    await page.reload();
    await expect(page.getByText("2 de 4 pasos completados")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    await expectNoAxeViolations(page);
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expectNoAxeViolations(page);
  });
});
