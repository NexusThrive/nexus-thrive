import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

/**
 * Abre una historia y espera a que Storybook termine de pintarla: `<body>` recibe `sb-show-main` (o `sb-show-errordisplay` si
 * falló). No se espera a que `#storybook-root` sea visible: los modales, hojas y cinemáticas pintan en un portal y lo dejan vacío.
 */
async function openStory(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`);
  await page.waitForFunction(() => /\bsb-show-(main|errordisplay)\b/.test(document.body.className));
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Recorrido de todo el catálogo: cada historia de Storybook se abre sola y debe pintar sin errores. Lee `index.json` del Storybook
 * estático, así una historia nueva entra sin tocar esta lista (a diferencia de `a11y.spec.ts`, que revisa a mano los componentes
 * compartidos con sus interacciones).
 *
 * - Siempre: la historia monta, no lanza errores sin capturar y Storybook no muestra su pantalla de error.
 * - `CATALOGO_AXE=1`: además corre axe (WCAG 2.2 AA). Es opcional porque revisa cientos de historias; sirve para medir la deuda de
 *   accesibilidad del catálogo antes de convertirla en regla.
 * - `CATALOGO_FILTRO=<texto>[,<texto>…]`: solo las historias cuyo id contiene alguno de esos textos (útil al trabajar en un componente).
 *
 * No forma parte de `pnpm test:e2e`: corre con `pnpm test:catalogo` (proyecto «catalogo», solo escritorio); lo responsive vive en
 * `responsive.spec.ts`.
 */
type Entry = { id: string; type: "story" | "docs"; title: string };

const index = JSON.parse(readFileSync(path.join(process.cwd(), "storybook-static", "index.json"), "utf8")) as { entries: Record<string, Entry> };
const filtros = (process.env.CATALOGO_FILTRO ?? "").toLowerCase().split(",").map((f) => f.trim()).filter(Boolean);
const stories = Object.values(index.entries).filter((e) => e.type === "story" && (filtros.length === 0 || filtros.some((f) => e.id.toLowerCase().includes(f))));

test.describe("catálogo de historias", () => {
  for (const story of stories) {
    test(story.id, async ({ page }) => {
      const errores: string[] = [];
      page.on("pageerror", (error) => errores.push(error.message));

      await openStory(page, story.id);
      expect(await page.evaluate(() => document.body.classList.contains("sb-show-errordisplay")), "Storybook mostró su pantalla de error").toBe(false);
      expect(errores, "errores sin capturar al pintar la historia").toEqual([]);

      if (process.env.CATALOGO_AXE) await expectNoAxeViolations(page);
    });
  }
});
