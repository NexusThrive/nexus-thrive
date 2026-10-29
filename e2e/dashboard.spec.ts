import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Inicio personalizable (modo de edición) y primeros pasos de una cuenta nueva. */
test.describe("Dashboard personalizable", () => {
  const KEY = "nx:dashboard:storybook";
  /** En edición, un clic en el componente lo selecciona y muestra su barra y sus esquinas. */
  const select = (page: import("@playwright/test").Page, id: string) => page.locator(`[data-widget="${id}"]`).click({ position: { x: 8, y: 8 } });
  const metricas = (page: import("@playwright/test").Page) => page.locator('[data-widget="kpi-income"]');

  test("modo de edición: oculta, cambia el ancho, no guarda hasta «Guardar» y persiste", async ({ page }) => {
    await openStory(page, "organismos-customizabledashboard--default");
    await page.evaluate((k) => window.localStorage.removeItem(k), KEY);
    await page.reload();

    await expect(metricas(page)).toBeVisible();
    await page.getByRole("button", { name: "Editar diseño del inicio" }).click();
    const bar = page.getByRole("region", { name: "Modo de edición del inicio" });
    await expect(bar).toBeVisible();

    // Cambiar de ancho (solo desde lg): el selector propio.
    const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024;
    if (isDesktop) {
      await select(page, "chart");
      await page.getByRole("combobox", { name: "Ancho de Ingresos y gastos" }).click();
      await page.getByRole("option", { name: "La mitad" }).click();
    }
    await select(page, "kpi-income");
    await page.getByRole("switch", { name: "Mostrar Ingresos", exact: true }).click();

    // Cancelar descarta todo.
    await bar.getByRole("button", { name: "Cancelar" }).click();
    await expect(bar).toHaveCount(0);
    await expect(metricas(page)).toBeVisible();
    expect(await page.evaluate((k) => window.localStorage.getItem(k), KEY)).toBeNull();

    // Editar otra vez y guardar.
    await page.getByRole("button", { name: "Editar diseño del inicio" }).click();
    await select(page, "kpi-income");
    await page.getByRole("switch", { name: "Mostrar Ingresos", exact: true }).click();
    await select(page, "chart");
    await page.getByRole("button", { name: "Bajar Ingresos y gastos" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(metricas(page)).toHaveCount(0);
    const stored = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), KEY))!);
    expect(stored.v).toBe(4);
    expect(stored.hidden).toEqual(["kpi-income"]);

    await page.reload();
    await expect(metricas(page)).toHaveCount(0);

    // Restablecer y guardar devuelve el diseño por defecto.
    await page.getByRole("button", { name: "Editar diseño del inicio" }).click();
    await page.getByRole("button", { name: "Restablecer" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(metricas(page)).toBeVisible();
  });

  test("arrastrar con teclado reordena los bloques", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 700, "En móvil se usa Subir/Bajar");
    await openStory(page, "organismos-customizabledashboard--default");
    await page.evaluate((k) => window.localStorage.removeItem(k), KEY);
    await page.reload();
    await page.getByRole("button", { name: "Editar diseño del inicio" }).click();
    await page.getByRole("button", { name: "Arrastrar Ingresos", exact: true }).focus();
    await page.keyboard.press("Space");
    // dnd-kit engancha las flechas un instante después de tomar el bloque.
    await expect(page.getByRole("button", { name: "Arrastrar Ingresos", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowDown");
    // dnd-kit recalcula el destino en el siguiente cuadro.
    await expect(page.locator("#DndLiveRegion-0, [id^=DndLiveRegion]")).toContainText("sobre Socios activos");
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Guardar" }).click();
    const stored = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), KEY))!);
    expect(stored.order[0]).toBe("kpi-customers");
  });

  test("mantener presionado levanta el bloque, deja su hueco y después se puede ajustar otro", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024 || test.info().project.name === "movil", "Gesto de ratón en escritorio");
    await openStory(page, "organismos-customizabledashboard--default");
    await page.evaluate((k) => window.localStorage.removeItem(k), KEY);
    await page.reload();
    const box = async (id: string) => (await page.locator(`[data-widget="${id}"]`).boundingBox())!;
    const order = () => page.locator("[data-widget]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.widget));

    const from = await box("kpi-income");
    const to = await box("kpi-expenses");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(450);
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await page.waitForTimeout(600);
    await page.mouse.up();
    expect((await order()).indexOf("kpi-income")).toBeGreaterThan(1);

    // Otro bloque se selecciona: su barra queda a la vista (sobre el contenido) y su esquina ajusta el tamaño.
    const other = await box("kpi-customers");
    await page.mouse.click(other.x + 30, other.y + 60);
    await expect(page.getByRole("button", { name: "Subir Socios activos" })).toBeInViewport();
    const handle = (await page.getByRole("slider", { name: "Tamaño de Socios activos" }).boundingBox())!;
    const before = (await box("kpi-customers")).width;
    await page.mouse.move(handle.x + 8, handle.y + 8);
    await page.mouse.down();
    await page.mouse.move(handle.x + 220, handle.y + 8, { steps: 10 });
    await page.mouse.up();
    expect((await box("kpi-customers")).width).toBeGreaterThan(before);
  });

  test("la preferencia antigua (v1) se sigue leyendo", async ({ page }) => {
    await openStory(page, "organismos-customizabledashboard--default");
    await page.evaluate((k) => window.localStorage.setItem(k, JSON.stringify({ order: ["activity", "kpis", "chart"], hidden: ["chart"] })), KEY);
    await page.reload();
    await expect(metricas(page)).toBeVisible();
    await expect(page.getByText("Gráfico de ingresos y gastos (muestra)")).toHaveCount(0);
  });

  test("Agregar: el panel ofrece gráficos, «Lista de tareas» está desactivada y lo agregado se puede quitar", async ({ page }) => {
    await openStory(page, "organismos-customizabledashboard--con-graficos");
    await page.evaluate((k) => window.localStorage.removeItem(k), KEY);
    await page.reload();
    await expect(page.getByRole("button", { name: "Personalizar" })).toHaveCount(0);

    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    const panel = page.getByRole("dialog", { name: "Agregar al inicio" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Lista de tareas")).toBeVisible();
    await expect(panel.getByText("Pronto")).toBeVisible();
    await panel.getByRole("button", { name: /Ingresos por método de pago/ }).click();

    // Entra en edición con el gráfico nuevo al final; se puede quitar y «Cancelar» lo descarta.
    await expect(page.getByRole("region", { name: "Modo de edición del inicio" })).toBeVisible();
    await select(page, "donut-1");
    await page.getByRole("button", { name: "Quitar Ingresos por método de pago" }).click();
    await expect(page.getByRole("button", { name: "Quitar Ingresos por método de pago" })).toHaveCount(0);
  });

  test("sin violaciones axe en modo de edición", async ({ page }) => {
    await openStory(page, "organismos-customizabledashboard--default");
    await page.evaluate((k) => window.localStorage.removeItem(k), KEY);
    await page.reload();
    await page.getByRole("button", { name: "Editar diseño del inicio" }).click();
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
