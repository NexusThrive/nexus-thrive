import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Abre una historia de Storybook sola (sin el panel de Storybook). */
export async function openStory(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`);
  await page.locator("#storybook-root").waitFor();
  // Fuentes y estilos listos antes de medir o escanear.
  await page.evaluate(() => document.fonts.ready);
}

/** Etiquetas de axe para WCAG 2.2 nivel AA (incluye A y las de 2.0/2.1). */
export const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Escanea la página con axe y falla con un resumen legible si hay violaciones. */
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary, "violaciones de accesibilidad").toEqual([]);
}
