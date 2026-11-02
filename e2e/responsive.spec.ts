import { expect, test } from "@playwright/test";
import { openStory } from "./helpers";
import { medirDesborde, medirNavegacion, medirObjetivos, medirSolapes, medirTextoMinimo, medirTexto } from "./responsive-helpers";
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
/** Inicio fiel: `TenantShell` real + la composición de `page.tsx` con datos de muestra (`dashboard-fiel.stories.tsx`). */
const FIEL = "páginas-inicio-dashboard-fiel--con-datos";
const FIEL_NUEVA = "páginas-inicio-dashboard-fiel--cuenta-nueva";
const FIEL_CARGANDO = "páginas-inicio-dashboard-fiel--cargando";
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
      expect((await medirTexto(page)).recortados).toEqual([]);
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
    // ── Inicio fiel (paso 2): la composición real del dashboard, con datos de muestra ────────────────────────────
    for (const [nombre, id] of [["Inicio fiel", FIEL], ["Cuenta nueva", FIEL_NUEVA], ["Cargando", FIEL_CARGANDO]] as const) {
      test(`${nombre}: sin desborde horizontal de la página`, async ({ page }) => {
        await openStory(page, id);
        await page.waitForTimeout(800);
        const d = await medirDesborde(page);
        expect(d.desborda, `scrollWidth ${d.scroll} > viewport ${d.viewport}`).toBe(false);
      });
    }

    test("Inicio fiel: los importes y textos de las tarjetas no se recortan", async ({ page }) => {
      test.fail(vp.ancho <= 375, "P1-3: importes con datos reales recortados hasta 375 px («$ 2.340.000», 5 importes a 320 px) · paso 3");
      await openStory(page, FIEL);
      await page.waitForTimeout(800);
      expect((await medirTexto(page)).recortados).toEqual([]);
    });

    test("Inicio fiel: la barra superior con la campana no se superpone", async ({ page }) => {
      test.fail(vp.ancho < 375, "P1-2: con la campana de producción la barra se pisa a 320 y 360 px aunque el nombre sea corto · paso 3");
      await openStory(page, FIEL);
      await page.waitForTimeout(800);
      expect(await medirSolapes(page)).toEqual([]);
    });

    test("Cuenta nueva: los textos de las tarjetas no se recortan", async ({ page }) => {
      await openStory(page, FIEL_NUEVA);
      await page.waitForTimeout(800);
      expect((await medirTexto(page)).recortados).toEqual([]);
    });

    test("Cuenta nueva: muestra los primeros pasos y la actividad vacía", async ({ page }) => {
      await openStory(page, FIEL_NUEVA);
      await expect(page.getByText("Registra tu primer socio").first()).toBeVisible();
    });

    test("Cargando: el esqueleto de la ruta está dentro del shell", async ({ page }) => {
      await openStory(page, FIEL_CARGANDO);
      await expect(page.getByRole("status", { name: "Cargando inicio" })).toBeVisible();
    });

    if (vp.tactil) {
      test("Inicio fiel: objetivos táctiles de al menos 24 px (AA)", async ({ page }) => {
        await openStory(page, FIEL);
        await page.waitForTimeout(800);
        expect((await medirObjetivos(page)).filter((o) => o.ancho < 24 || o.alto < 24)).toEqual([]);
      });
      test("Inicio fiel: objetivos táctiles de 44 px", async ({ page }) => {
        test.fail(true, "P2-5: selectores de periodo (30 px), filtros (32 px), ayudas (24 px) y enlaces de 24 px · paso 4");
        await openStory(page, FIEL);
        await page.waitForTimeout(800);
        expect((await medirObjetivos(page)).filter((o) => o.ancho < 44 || o.alto < 44), "controles por debajo de 44 px").toEqual([]);
      });
    }

    // Detalle de la gráfica (panel de movimientos): hoja inferior bajo 768 px y panel lateral derecho desde 768 px.
    test("Inicio fiel: el detalle de la gráfica es hoja inferior en móvil y panel lateral desde 768 px", async ({ page }) => {
      await openStory(page, FIEL);
      await page.waitForTimeout(800);
      await page.getByRole("group", { name: /Gráfico de ingresos y gastos/ }).focus();
      await page.keyboard.press("Enter");
      const dialogo = page.getByRole("dialog");
      await expect(dialogo).toBeVisible();
      await page.waitForTimeout(900);
      const caja = (await dialogo.boundingBox())!;
      if (vp.ancho < TABLET_MIN) {
        expect(Math.abs(caja.y + caja.height - vp.alto), "hoja anclada abajo").toBeLessThanOrEqual(2);
        expect(Math.round(caja.width), "a ancho completo").toBe(vp.ancho);
      } else {
        expect(Math.abs(caja.x + caja.width - vp.ancho), "panel pegado a la derecha").toBeLessThanOrEqual(2);
        expect(caja.width, "no ocupa todo el ancho").toBeLessThan(vp.ancho * 0.7);
      }
    });
  });
}
