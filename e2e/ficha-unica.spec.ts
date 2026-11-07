import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";
import { medirDesborde } from "./responsive-helpers";

/** HU-customer360-01: el recorrido completo de un cliente se ve en una sola línea de tiempo. */
test.describe("Ficha única · línea de tiempo", () => {
  test("muestra el recorrido completo, del más reciente al más antiguo", async ({ page }) => {
    await openStory(page, "páginas-clientes-ficha-única-·-línea-de-tiempo--default");
    const items = page.getByRole("listitem");
    await expect(items).toHaveCount(7);
    const titles = await items.locator("p.font-medium").allTextContents();
    expect(titles[0]).toContain("Cobro");
    expect(titles[1]).toContain("Pedido T-0042");
    expect(titles[2]).toContain("Cotización COT-0003");
    expect(titles[3]).toContain("Oportunidad");
    expect(titles.at(-1)).toBe("Nota");
    await expect(page.getByText("Nació de una cotización aprobada")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("sin actividad lo explica y a 320 px no hay desplazamiento horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openStory(page, "páginas-clientes-ficha-única-·-línea-de-tiempo--default");
    expect((await medirDesborde(page)).desborda).toBe(false);
    await openStory(page, "páginas-clientes-ficha-única-·-línea-de-tiempo--vacia");
    await expect(page.getByText("Sin actividad registrada para este cliente.")).toBeVisible();
  });
});
