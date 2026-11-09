/**
 * Graba la presentación de PC (1280×720, ~60 s): intro de carga → inicio → crear socio → cobrar → búsqueda → ayuda.
 * Uso: node scripts/presentacion/grabar-pc.mjs <carpeta-con-estado.json> <carpeta-de-videos>
 */
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { BASE, SLUG, caption, clock, endCard, glide, initScript, stateWithoutSplash, tap, typeSlow } from "./lib.mjs";

const [stateDir, outDir] = process.argv.slice(2);
const SIZE = { width: 1280, height: 720 };
const browser = await chromium.launch();

// Calentamiento: compila las rutas del servidor de desarrollo para que la grabación no espere.
{
  const warm = await browser.newContext({ viewport: SIZE, locale: "es-CO", storageState: `${stateDir}/estado.json` });
  const p = await warm.newPage();
  for (const path of ["", "/contactos", "/finanzas", "/functions"]) await p.goto(`${BASE}/${SLUG}${path}`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
  await warm.close();
}

const ctx = await browser.newContext({ viewport: SIZE, locale: "es-CO", storageState: stateWithoutSplash(`${stateDir}/estado.json`), recordVideo: { dir: outDir, size: SIZE } });
await ctx.addInitScript(initScript, { mobile: false });
const rec0 = Date.now(); // el video empieza al abrir la página
const page = await ctx.newPage();
const t = clock();
console.log(`  desfase del video: ${((Date.now() - rec0) / 1000).toFixed(2)} s (el reloj del guion arranca aquí)`);
const mark = (name) => console.log(`  [${t.now().toFixed(1)} s] fin de ${name}`);
try {
  // 0–7 s · Intro de carga (la N) y llegada al inicio.
  await page.goto(`${BASE}/${SLUG}`, { waitUntil: "load", timeout: 120000 });
  const loadAt = t.now();
  await page.waitForTimeout(2300); // la N de carga se dibuja antes del subtítulo
  await caption(page, "NEXUS THRIVE · Tu negocio, ordenado");
  mark("intro");
  await t.until(page, 8);

  // 8–15 s · Inicio y primeros pasos.
  await caption(page, "Tu inicio, claro desde el primer día");
  await glide(page, 520, 300, 650);
  await glide(page, 880, 320, 600);
  await tap(page, page.getByRole("button", { name: /Primeros pasos/ }), { ms: 650 });
  await page.waitForTimeout(2200);
  await page.keyboard.press("Escape");
  mark("inicio");
  await t.until(page, 15);

  // 15–26 s · Registrar un socio.
  await caption(page, "Registra a tus clientes en segundos");
  await tap(page, page.getByRole("button", { name: "Crear" }).first());
  await tap(page, page.getByRole("menuitem", { name: /Nuevo socio/ }), { ms: 500 });
  await typeSlow(page, page.getByPlaceholder("Nombre completo"), "Mateo Ríos");
  await typeSlow(page, page.getByPlaceholder("300 123 4567"), "3105550142", 35);
  await page.waitForTimeout(500);
  await tap(page, page.getByRole("button", { name: "Registrar", exact: true }), { ms: 600 });
  await page.waitForTimeout(1500);
  mark("socio");
  await t.until(page, 27);

  // 27–40 s · Cobrar.
  await caption(page, "Cobra y genera el comprobante");
  await tap(page, page.getByRole("button", { name: "Crear" }).first());
  await tap(page, page.getByRole("menuitem", { name: /Registrar pago/ }), { ms: 500 });
  mark("  menú pago");
  for (const key of ["1", "8", "0", "000"]) await tap(page, page.getByRole("dialog").getByRole("button", { name: key, exact: true }), { ms: 260, pause: 60 });
  mark("  teclado");
  await tap(page, page.getByRole("dialog").locator("button, [role=combobox]", { hasText: "Venta sin cliente" }).first(), { ms: 500 });
  await page.waitForTimeout(500);
  await tap(page, page.getByRole("option", { name: /Mateo Ríos/ }).first(), { ms: 500 });
  mark("  cliente");
  await tap(page, page.getByRole("dialog").getByRole("button", { name: "Nequi", exact: true }), { ms: 500 });
  mark("  nequi");
  await tap(page, page.getByRole("dialog").getByRole("button", { name: /Cobrar/ }), { ms: 500 });
  // Comprobante: se muestra un momento y se cierra con «Listo».
  const listo = page.getByRole("dialog").getByRole("button", { name: "Listo", exact: true });
  await listo.waitFor({ timeout: 20000 });
  mark("  comprobante");
  await page.waitForTimeout(1800);
  await tap(page, listo, { ms: 500 });
  await page.waitForTimeout(700);
  mark("cobro");
  await t.until(page, 41);

  // 41–48 s · El inicio se actualiza.
  await caption(page, "Tu inicio se actualiza al instante");
  await glide(page, 420, 330, 600);
  await glide(page, 620, 520, 700);
  mark("actualiza");
  await t.until(page, 49);

  // 49–55 s · Búsqueda.
  await caption(page, "Encuentra todo con una búsqueda");
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);
  await page.keyboard.type("mateo", { delay: 120 });
  await page.getByRole("option", { name: /Mateo Ríos/ }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  mark("busqueda");
  await t.until(page, 56);

  // 56–60 s · Ayuda y cierre.
  await caption(page, "Y ayuda cuando la necesites");
  await tap(page, page.getByRole("button", { name: "Centro de ayuda" }), { ms: 700 });
  await page.waitForTimeout(2800);
  await caption(page, "");
  await endCard(page);
  await t.until(page, 61);
  console.log("Duración del guion:", t.now().toFixed(1), "s");
  writeFileSync(`${outDir}/meta-pc.json`, JSON.stringify({ loadAt, end: t.now() }));
} catch (error) {
  await page.screenshot({ path: `${outDir}/error-pc.png` }).catch(() => {});
  console.error("Falló en", t.now().toFixed(1), "s:", String(error).slice(0, 500));
  process.exitCode = 1;
} finally {
  await ctx.close();
  await browser.close();
}
