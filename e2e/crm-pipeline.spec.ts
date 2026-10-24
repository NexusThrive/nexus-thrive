import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Tablero de leads del Operations Center: arrastrar, teclado, alternativas y errores. */
test.describe("Pipeline de leads arrastrable", () => {
  test.skip(({ isMobile }) => isMobile, "El tablero es de escritorio; en móvil se usa el menú «Mover a»");

  const column = (page: import("@playwright/test").Page, name: string) => page.getByRole("region", { name, exact: true });

  test("con teclado: Espacio, flecha, Espacio mueve el lead de columna y lo anuncia", async ({ page }) => {
    await openStory(page, "páginas-crm-comercial-leadboard--default");
    await expect(column(page, "Lead nuevo").getByText("Gimnasio Norte")).toBeVisible();
    await page.getByRole("button", { name: "Arrastrar Gimnasio Norte" }).focus();
    await page.keyboard.press("Space");
    // dnd-kit engancha las flechas un instante después de tomar la tarjeta.
    await expect(page.getByRole("button", { name: "Arrastrar Gimnasio Norte" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowRight");
    // dnd-kit recalcula el destino en el siguiente cuadro: se espera su anuncio antes de soltar.
    await expect(page.locator("[id^=DndLiveRegion]")).toContainText("sobre Primer contacto");
    await page.keyboard.press("Space");
    await expect(column(page, "Primer contacto").getByText("Gimnasio Norte")).toBeVisible();
    await expect(column(page, "Lead nuevo").getByText("Gimnasio Norte")).toHaveCount(0);
  });

  test("con mouse: arrastrar a otra etapa resalta el destino y mueve el lead", async ({ page }) => {
    await openStory(page, "páginas-crm-comercial-leadboard--default");
    const handle = page.getByRole("button", { name: "Arrastrar Spa Centro" });
    const target = column(page, "Calificado");
    const from = (await handle.boundingBox())!;
    const to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + 60, to.y + 80, { steps: 12 });
    await expect(target).toHaveAttribute("data-over", "");
    await page.mouse.up();
    await expect(target.getByText("Spa Centro")).toBeVisible();
  });

  test("el menú «Mover a» es la alternativa sin arrastrar", async ({ page }) => {
    await openStory(page, "páginas-crm-comercial-leadboard--default");
    await page.getByRole("button", { name: "Mover Constructora Andina" }).click();
    await page.getByRole("menuitem", { name: "Propuesta enviada" }).click();
    await expect(column(page, "Propuesta enviada").getByText("Constructora Andina")).toBeVisible();
  });

  test("sin permiso de editar no hay asas ni menú; axe limpio", async ({ page }) => {
    await openStory(page, "páginas-crm-comercial-leadboard--read-only");
    await expect(page.getByRole("button", { name: /Arrastrar/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Mover/ })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("si falla el guardado, el lead vuelve a su columna", async ({ page }) => {
    await openStory(page, "páginas-crm-comercial-leadboard--save-fails");
    await page.getByRole("button", { name: "Mover Gimnasio Norte" }).click();
    await page.getByRole("menuitem", { name: "Calificado" }).click();
    await expect(column(page, "Calificado").getByText("Gimnasio Norte")).toBeVisible();
    await expect(column(page, "Lead nuevo").getByText("Gimnasio Norte")).toBeVisible({ timeout: 3000 });
  });
});
