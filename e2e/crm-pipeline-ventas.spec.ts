import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** App CRM (pantallas 8 y 9): tablero, creación rápida con el contacto, mover sin arrastrar, lista y detalle. */
test.describe("CRM · pipeline", () => {
  test("tablero con etapas, totales y Perdidos plegada", async ({ page }) => {
    await openStory(page, "páginas-crm-pipeline--tablero");
    for (const stage of ["Nuevo", "Calificado", "Propuesta", "Ganado"]) await expect(page.getByRole("heading", { level: 2, name: stage, exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Nuevo" })).toContainText("$9,6 M");
    await expect(page.getByRole("button", { name: "Ver oportunidades perdidas" })).toBeVisible();
    await expect(page.getByText("Pedido creado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tablero" })).toHaveAttribute("aria-pressed", "true");
    await expectNoAxeViolations(page);
  });

  test("creación rápida: elegir un cliente existente llena correo y teléfono; también se puede crear uno nuevo", async ({ page }) => {
    await openStory(page, "páginas-crm-pipeline--creacion-rapida");
    const contact = page.getByRole("combobox", { name: "Contacto" });
    await expect(contact).toBeFocused();
    await contact.fill("Ma");
    await expect(page.getByRole("option", { name: /María Pérez/ })).toBeVisible();
    await expect(page.getByRole("option", { name: "Crear «Ma» como cliente nuevo" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Correo")).toHaveValue("maria@gmail.com");
    await expect(page.getByLabel("Teléfono")).toHaveValue("323 835 7780");
    await expect(page.getByLabel("Nombre de la oportunidad")).toBeFocused();
    // Solo el nombre es obligatorio.
    await page.getByRole("button", { name: "Añadir" }).click();
    await expect(page.getByText("Escribe el nombre de la oportunidad")).toBeVisible();
    await page.getByLabel("Nombre de la oportunidad").fill("Uniformes de invierno");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Oportunidad creada")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("N abre la creación rápida y Esc la cierra", async ({ page }) => {
    await openStory(page, "páginas-crm-pipeline--tablero");
    await page.locator("body").press("n");
    await expect(page.getByRole("form", { name: "Nueva oportunidad" })).toBeVisible();
    await page.getByLabel("Nombre de la oportunidad").focus();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("form", { name: "Nueva oportunidad" })).toHaveCount(0);
  });

  test("mover de etapa sin arrastrar, con el menú de la tarjeta", async ({ page, isMobile }) => {
    test.skip(isMobile, "El menú aparece al pasar el cursor o con el foco");
    await openStory(page, "páginas-crm-pipeline--tablero");
    await page.getByRole("button", { name: "Opciones de Uniformes · 200 camisetas" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Propuesta" }).click();
    await expect(page.getByRole("region", { name: "Propuesta" })).toContainText("Uniformes · 200 camisetas");
  });

  test("la lista conserva las columnas pedidas y el tablero vacío invita a crear", async ({ page }) => {
    await openStory(page, "páginas-crm-pipeline--lista");
    for (const col of ["Oportunidad", "Cliente", "Etapa", "Valor", "Probabilidad", "Próxima actividad", "Responsable"]) await expect(page.locator("th", { hasText: col }).first()).toBeAttached();
    await openStory(page, "páginas-crm-pipeline--sin-oportunidades");
    await expect(page.getByRole("heading", { name: "Crea tu primera oportunidad" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Importar contactos" })).toBeVisible();
  });

  test("detalle: etapas a un clic, perder pide motivo y no hay scroll horizontal en móvil", async ({ page }) => {
    await openStory(page, "páginas-crm-oportunidad--detalle");
    await expect(page.getByRole("heading", { level: 1, name: "Uniformes · 200 camisetas" })).toBeVisible();
    await expect(page.getByRole("button", { name: /1 · Nuevo \(etapa actual\)/ })).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("button", { name: "2 · Mover a Calificado" })).toBeEnabled();
    await expect(page.getByRole("link", { name: "Ver ficha" })).toHaveAttribute("href", "/demo/contactos/c1");
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Perdido" }).click();
    await expect(page.getByRole("dialog", { name: "Marcar como perdida" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("crear etapa: + Etapa abre la columna con el foco en el nombre; valida, Enter crea y Esc cancela", async ({ page }) => {
    await openStory(page, "páginas-crm-pipeline--tablero");
    await page.getByRole("button", { name: "+ Etapa" }).click();
    const nombre = page.getByLabel("Nombre de la etapa");
    await expect(nombre).toBeFocused();
    await expect(page.getByText("Ganado siempre queda al final.", { exact: false })).toBeVisible();
    await expectNoAxeViolations(page);
    // Vacío o repetido no se crea.
    await page.keyboard.press("Enter");
    await expect(page.getByText("Escribe el nombre de la etapa.")).toBeVisible();
    await nombre.fill("propuesta");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Ya hay una etapa con ese nombre.")).toBeVisible();
    await nombre.fill("Negociación");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Etapa creada")).toBeVisible();
    await expect(page.getByRole("region", { name: "Nueva etapa", exact: true })).toHaveCount(0);
    // Esc cancela sin guardar.
    await page.getByRole("button", { name: "+ Etapa" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: "Nueva etapa", exact: true })).toHaveCount(0);
  });

  test("renombrar una etapa con doble clic en su nombre", async ({ page, isMobile }) => {
    test.skip(isMobile, "Doble clic: escritorio");
    await openStory(page, "páginas-crm-pipeline--tablero");
    await page.getByRole("button", { name: "Calificado", exact: true }).dblclick();
    const input = page.getByLabel("Nuevo nombre de la etapa Calificado");
    await expect(input).toBeFocused();
    await input.fill("Interesado");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Etapa renombrada")).toBeVisible();
  });
});
