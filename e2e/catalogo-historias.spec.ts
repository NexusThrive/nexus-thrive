import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/**
 * Recorrido de todo el catálogo: cada historia de Storybook se abre sola y debe pintar sin errores. Lee `index.json` del Storybook
 * estático, así una historia nueva entra sin tocar esta lista (a diferencia de `a11y.spec.ts`, que revisa a mano los componentes
 * compartidos con sus interacciones).
 *
 * - Siempre: la historia monta, no lanza errores sin capturar y Storybook no muestra su pantalla de error.
 * - `CATALOGO_AXE=1`: además corre axe (WCAG 2.2 AA). Es opcional porque revisa cientos de historias; sirve para medir la deuda de
 *   accesibilidad del catálogo antes de convertirla en regla.
 * - `CATALOGO_FILTRO=<texto>`: solo las historias cuyo id lo contiene (útil al trabajar en un componente).
 *
 * Solo corre en el proyecto de escritorio: el de móvil repetiría lo mismo; lo responsive vive en `responsive.spec.ts`.
 */
type Entry = { id: string; type: "story" | "docs"; title: string };

const index = JSON.parse(readFileSync(path.join(process.cwd(), "storybook-static", "index.json"), "utf8")) as { entries: Record<string, Entry> };
const filtro = process.env.CATALOGO_FILTRO?.toLowerCase();
const stories = Object.values(index.entries).filter((e) => e.type === "story" && (!filtro || e.id.toLowerCase().includes(filtro)));

test.describe("catálogo de historias", () => {
  for (const story of stories) {
    test(story.id, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "escritorio", "el recorrido corre una sola vez, en escritorio");
      const errores: string[] = [];
      page.on("pageerror", (error) => errores.push(error.message));

      await openStory(page, story.id);
      await expect(page.locator(".sb-errordisplay"), "Storybook mostró su pantalla de error").toBeHidden();
      expect(errores, "errores sin capturar al pintar la historia").toEqual([]);

      if (process.env.CATALOGO_AXE) await expectNoAxeViolations(page);
    });
  }
});
