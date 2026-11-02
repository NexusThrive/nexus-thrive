/**
 * Graba la presentación móvil (390×844, ~60 s): intro de carga → inicio → crear socio → cobrar → búsqueda en la barra → «Más».
 * Uso: node scripts/presentacion/grabar-movil.mjs <carpeta-con-estado.json> <carpeta-de-videos> [slug]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { BASE, caption, clock, endCard, initScript, stateWithoutSplash } from "./lib.mjs";

const [stateDir, outDir, slugArg] = process.argv.slice(2);
const SLUG = slugArg ?? "aurora-movil";
const VIEW = { width: 390, height: 844 };
/** Densidad de píxeles de la captura: 2,5 deja 975×2110 reales, nítidos al escalarlos a 1080×1920. */
const DPR = 2.5;
const mobileContext = (extra = {}) => browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, locale: "es-CO", ...extra });
// Sin esta bandera la captura por protocolo sale a 390×844 aunque la página se dibuje a 2,5×: con ella salen los píxeles reales.
const browser = await chromium.launch({ args: [`--force-device-scale-factor=${DPR}`] });

{
  const warm = await mobileContext({ storageState: `${stateDir}/estado.json` });
  const p = await warm.newPage();
  for (const path of ["", "/crm", "/bookings"]) await p.goto(`${BASE}/${SLUG}${path}`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
  await warm.close();
}

const ctx = await mobileContext({ storageState: stateWithoutSplash(`${stateDir}/estado.json`) });
await ctx.addInitScript(initScript, { mobile: true });
const page = await ctx.newPage();

// La captura se hace por el protocolo del navegador (cuadros JPEG a píxeles reales): el video de Playwright no escala la
// pantalla del teléfono y la deja chica en un lienzo gris. `exportar-movil.mjs` monta estos cuadros en 1080×1920.
const framesDir = `${outDir}/frames`;
mkdirSync(framesDir, { recursive: true });
const frames = [];
const cdp = await ctx.newCDPSession(page);
cdp.on("Page.screencastFrame", (frame) => {
  const file = `${framesDir}/${String(frames.length).padStart(5, "0")}.jpg`;
  writeFileSync(file, Buffer.from(frame.data, "base64"));
  frames.push([frame.metadata.timestamp, file]);
  cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: Math.round(VIEW.width * DPR), maxHeight: Math.round(VIEW.height * DPR), everyNthFrame: 1 });

const t = clock();
const t0epoch = Date.now() / 1000;
const mark = (name) => console.log(`  [${t.now().toFixed(1)} s] fin de ${name}`);

/** Toque con onda: lleva el elemento a la vista y lo toca. */
async function touch(locator, { pause = 220 } = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(pause);
  await locator.tap();
  if (process.env.DEBUG_REC) console.log(`   tap ${locator} → diálogos:`, JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].map((e) => e.querySelector('h2')?.textContent))));
}
const scrollTo = (y) => page.evaluate((top) => window.scrollTo({ top, behavior: "smooth" }), y);

try {
  await page.goto(`${BASE}/${SLUG}`, { waitUntil: "load", timeout: 120000 });
  const loadAt = t.now();
  await page.waitForTimeout(2300); // la N de carga se dibuja antes del subtítulo
  await caption(page, "NEXUS THRIVE · Tu negocio, en tu bolsillo");
  mark("intro");
  await t.until(page, loadAt + 6.2); // la N de carga termina de abrirse antes de tocar nada

  await caption(page, "Un inicio claro y ligero");
  await scrollTo(520);
  await page.waitForTimeout(1500);
  await scrollTo(0);
  await page.waitForTimeout(1200);
  await touch(page.getByRole("button", { name: /Primeros pasos/ }));
  await page.waitForTimeout(2400);
  await page.keyboard.press("Escape");
  mark("inicio");
  await t.until(page, 17);

  await touch(page.getByRole("button", { name: "Crear", exact: true }));
  await page.waitForTimeout(1300); // la hoja termina de subir y se ven las opciones
  await caption(page, "Registra a tus clientes en segundos", "top"); // arriba: abajo la tapa la hoja
  await touch(page.getByRole("dialog").getByText("Nuevo socio", { exact: true }).first(), { pause: 500 });
  await page.waitForTimeout(1500);
  if (process.env.DEBUG_REC) console.log("   1,5 s después de elegir:", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].map((e) => e.querySelector("h2")?.textContent))));
  await page.getByPlaceholder("Nombre completo").pressSequentially("Mateo Ríos", { delay: 45 });
  await page.getByPlaceholder("300 123 4567").pressSequentially("3105550142", { delay: 35 });
  await page.waitForTimeout(500);
  await touch(page.getByRole("button", { name: "Registrar", exact: true }));
  await page.waitForTimeout(1600);
  mark("socio");
  await t.until(page, 28);

  await touch(page.getByRole("button", { name: "Crear", exact: true }));
  await page.waitForTimeout(1300); // la hoja termina de subir y se ven las opciones
  await caption(page, "Cobra y genera el comprobante", "top");
  await touch(page.getByRole("dialog").getByText("Registrar pago", { exact: true }).first(), { pause: 500 });
  for (const key of ["1", "8", "0", "000"]) await touch(page.getByRole("dialog").getByRole("button", { name: key, exact: true }), { pause: 90 });
  await touch(page.getByRole("dialog").locator("button, [role=combobox]", { hasText: "Venta sin cliente" }).first());
  await touch(page.getByRole("option", { name: /Mateo Ríos/ }).first(), { pause: 400 });
  await touch(page.getByRole("dialog").getByRole("button", { name: "Nequi", exact: true }));
  await touch(page.getByRole("dialog").getByRole("button", { name: /Cobrar/ }));
  const listo = page.getByRole("dialog").getByRole("button", { name: "Listo", exact: true });
  await listo.waitFor({ timeout: 20000 });
  await page.waitForTimeout(1800);
  await touch(listo);
  await page.waitForTimeout(800);
  mark("cobro");
  await t.until(page, 43);

  await caption(page, "Tu inicio se actualiza al instante");
  await scrollTo(380);
  await page.waitForTimeout(1600);
  await scrollTo(0);
  await page.waitForTimeout(1200);
  mark("actualiza");
  await t.until(page, 49);

  await caption(page, "Busca desde la barra de arriba", "bottom");
  await touch(page.getByRole("button", { name: "Buscar", exact: true }));
  await page.waitForTimeout(500);
  await page.keyboard.type("mateo", { delay: 130 });
  await page.getByRole("option", { name: /Mateo Ríos/ }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1800);
  await touch(page.getByRole("button", { name: "Cerrar la búsqueda" }));
  await page.waitForTimeout(600);
  mark("busqueda");
  await t.until(page, 55);

  await caption(page, "Cambia de sección como en una app");
  await touch(page.getByRole("link", { name: "Socios", exact: true }).last());
  await page.waitForTimeout(1900);
  await touch(page.getByRole("link", { name: "Inicio", exact: true }).last());
  await page.waitForTimeout(1500);
  await caption(page, "Tu cuenta y tus preferencias, a un toque", "top");
  await touch(page.getByRole("button", { name: /Más/ }));
  await page.waitForTimeout(2400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  mark("secciones");
  await caption(page, "");
  await page.waitForTimeout(500);
  await endCard(page);
  await t.until(page, loadAt + 61); // el video recortado dura ~60 s desde la N de carga (el servidor de desarrollo tarda distinto cada vez)
  console.log("Duración del guion:", t.now().toFixed(1), "s");
  writeFileSync(`${outDir}/meta-movil.json`, JSON.stringify({ loadAt, end: t.now() }));
  await cdp.send("Page.stopScreencast").catch(() => {});
  writeFileSync(`${outDir}/frames.json`, JSON.stringify({ t0epoch, loadAt, end: t.now(), frames }));
} catch (error) {
  await page.screenshot({ path: `${outDir}/error-movil.png` }).catch(() => {});
  console.error(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("[role=dialog],[data-ghost]")].map((e) => ({ role: e.getAttribute("role"), state: e.getAttribute("data-state"), ghost: e.hasAttribute("data-ghost"), label: (e.querySelector("h2")?.textContent ?? e.textContent ?? "").slice(0, 30) }))).catch(() => "?")));
  console.error(JSON.stringify(await page.getByRole("button").allTextContents().catch(() => "?")).slice(0, 600));
  console.error("Falló en", t.now().toFixed(1), "s:", String(error).slice(0, 500));
  process.exitCode = 1;
} finally {
  await ctx.close();
  await browser.close();
}
