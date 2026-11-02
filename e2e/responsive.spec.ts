import { expect, test } from "@playwright/test";
import { openStory } from "./helpers";
import { medirDesborde, medirNavegacion, medirObjetivos, medirSolapes, medirTextoMinimo, medirTextoRecortado } from "./responsive-helpers";
import { VIEWPORTS } from "./viewports";

/**
 * Pruebas responsive (principio 08, R1–R5). Corren solo en el proyecto `responsive`: cada viewport de
 * `e2e/viewports.ts` se emula con su propio contexto (táctil o no).
 *
 * Los hallazgos de la auditoría del dashboard que todavía no se corrigen se marcan con `test.fail(...)`:
 * la prueba pasa mientras el hallazgo exista y **falla en cuanto se corrija**, para obligar a quitar la marca.
 * Cada marca cita su hallazgo (`P1-1` …) y el paso de la propuesta que lo resuelve.
 * Una prueba nunca se da por cumplida por haber hecho el cambio: debe pasar sin marca.
 */
const INICIO = "organismos-customizabledashboard--default";
const SHELL = "plantillas-tenantshell--desktop";
const MODAL = "plantillas-tenantshell--with-modal";
const TABLET_MIN = 768;

for (const vp of VIEWPORTS) {
  test.describe(`${vp.nombre} · ${vp.ancho}×${vp.alto}`, () => {
    test.use({
      viewport: { width: vp.ancho, height: vp.alto },
      hasTouch: vp.tactil,
      isMobile: vp.tactil && vp.ancho < 1024,
    });

    // R4 · reflow (WCAG 1.4.10): la página no gana scroll horizontal.
    for (const [nombre, id] of [["Inicio", INICIO], ["Shell", SHELL]] as const) {
      test(`${nombre}: sin desborde horizontal de la página`, async ({ page }) => {
        await openStory(page, id);
        const d = await medirDesborde(page);
        expect(d.desborda, `scrollWidth ${d.scroll} > viewport ${d.viewport}`).toBe(false);
      });
    }

    // R4 · el contenido cabe en su tarjeta (el desborde de página no detecta el recorte).
    test("Inicio: los textos de las tarjetas no se recortan", async ({ page }) => {
      test.fail(vp.ancho < 360, "P1-1: importes recortados a 320 px · paso 3");
      await openStory(page, INICIO);
      expect(await medirTextoRecortado(page)).toEqual([]);
    });

    // R2/R3 · la barra superior no se pisa a sí misma.
    test("Shell: los controles de la barra superior no se superponen", async ({ page }) => {
      test.fail(vp.ancho < 375, "P1-2: botones superpuestos a 320 y 360 px · paso 3");
      await openStory(page, SHELL);
      expect(await medirSolapes(page)).toEqual([]);
    });

    // R2 · objetivos táctiles. 24 px es el mínimo AA y se exige ya; 44 px es el criterio aprobado.
    if (vp.tactil) {
      for (const [nombre, id] of [["Inicio", INICIO], ["Shell", SHELL]] as const) {
        test(`${nombre}: objetivos táctiles de al menos 24 px (AA)`, async ({ page }) => {
          await openStory(page, id);
          const chicos = (await medirObjetivos(page)).filter((o) => o.ancho < 24 || o.alto < 24);
          expect(chicos).toEqual([]);
        });
        test(`${nombre}: objetivos táctiles de 44 px`, async ({ page }) => {
          test.fail(true, "P2-3: acciones de cabecera y riel de 40–42 px · paso 4");
          await openStory(page, id);
          const chicos = (await medirObjetivos(page)).filter((o) => o.ancho < 44 || o.alto < 44);
          expect(chicos, "controles táctiles por debajo de 44 px").toEqual([]);
        });
      }
    }

    // R3 · navegación adaptativa aprobada: <768 móvil · 768–1023 riel con etiquetas · ≥1024 expandida.
    test("Shell: la navegación corresponde al ancho", async ({ page }) => {
      await openStory(page, SHELL);
      const n = await medirNavegacion(page);
      if (vp.ancho < TABLET_MIN) {
        expect(n.tabbar, "barra inferior móvil").toBe(true);
        expect(n.enlaces, "sin barra lateral").toBe(0);
      } else {
        expect(n.tabbar, "sin barra inferior").toBe(false);
        expect(n.enlaces, "barra lateral").toBeGreaterThan(0);
      }
    });

    if (vp.ancho >= TABLET_MIN) {
      test("Shell: toda la navegación lateral tiene etiqueta visible", async ({ page }) => {
        test.fail(vp.ancho < 1280, "P2-4: riel de iconos sin etiquetas (768–1279 px) · paso 5");
        await openStory(page, SHELL);
        const n = await medirNavegacion(page);
        expect(n.sinEtiqueta, "enlaces sin texto visible").toEqual([]);
      });
    }

    // R4 · suelo de texto de 11 px.
    test("Shell: ningún texto por debajo de 11 px", async ({ page }) => {
      test.fail(vp.ancho >= TABLET_MIN, "P2-4: etiqueta de grupo a 10 px en el riel · paso 5");
      await openStory(page, SHELL);
      expect(await medirTextoMinimo(page)).toBeGreaterThanOrEqual(11);
    });

    // Comportamiento adaptativo de las hojas: <768 hoja inferior · ≥768 modal centrado.
    test("Hoja inferior en móvil y modal centrado desde 768 px", async ({ page }) => {
      await openStory(page, MODAL);
      await page.getByRole("button", { name: "Nuevo cliente" }).first().click();
      const dialogo = page.getByRole("dialog");
      await expect(dialogo).toBeVisible();
      await page.waitForTimeout(700);
      const caja = (await dialogo.boundingBox())!;
      const pegadoAbajo = Math.abs(caja.y + caja.height - vp.alto) <= 2;
      if (vp.ancho < TABLET_MIN) {
        expect(pegadoAbajo, "hoja anclada abajo").toBe(true);
        expect(Math.round(caja.width)).toBe(vp.ancho);
      } else {
        expect(pegadoAbajo, "modal centrado, no anclado abajo").toBe(false);
      }
    });
  });
}
