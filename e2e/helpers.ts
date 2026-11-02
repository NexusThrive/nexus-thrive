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
  // Con una animación a medias (hoja subiendo, velo apareciendo) axe mide
  // contrastes intermedios: se espera a que terminen las finitas.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        // Una animación pausada (p. ej. la barra de cuenta atrás de un aviso) no termina: se ignora, y la espera a las demás tiene tope de 3 s para no colgar la prueba.
        .filter((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming().endTime as number))
        .map((a) => Promise.race([a.finished.catch(() => undefined), new Promise((r) => setTimeout(r, 3000))])),
    ),
  );
  // El viaje de los modales y paneles anclados lo dibuja GSAP con estilos en línea (no aparece en `getAnimations`):
  // se espera a que el panel termine de abrir (sin transform ni opacidad a medias) para no medir contrastes intermedios.
  await page
    .waitForFunction(() =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-morph]")).every(
        (el) => el.getAttribute("data-state") === "closed" || (!el.style.transform && !["0", "0.5"].includes(el.style.opacity) && ![...el.children].some((c) => (c as HTMLElement).style.opacity === "0")),
      ),
    )
    .catch(() => undefined);
  // El complemento de accesibilidad de Storybook también corre axe al pintar la historia:
  // si coincide con este escaneo, se espera un instante y se repite una vez.
  const scan = () => new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
  const results = await scan().catch(async (error: Error) => {
    if (!/already running/i.test(error.message)) throw error;
    await page.waitForTimeout(500);
    return scan();
  });
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary, "violaciones de accesibilidad").toEqual([]);
}

/** Un conjunto de datos de `AdaptiveTable`: tabla en un contenedor ancho, lista en uno angosto (DR-08). */
export const datos = (page: Page, name: RegExp | string) => page.getByRole("table", { name }).or(page.getByRole("list", { name }));

/** Una fila del conjunto: `row` en la tabla, `listitem` en la lista. */
export const fila = (scope: Page | ReturnType<typeof datos>, name: RegExp) =>
  scope.getByRole("row", { name }).or(scope.getByRole("listitem").filter({ hasText: name }));
