// Pase dirigido: abre menús que solo listan opciones (sin elegir ninguna). Solo lectura.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://menus.colegastudio.com";
const OUT = process.argv[2];
const COOKIE = process.env.SESSION_COOKIE;
fs.mkdirSync(path.join(OUT, "shots/menus"), { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addCookies([{ name: "__Secure-better-auth.session_token", value: COOKIE, domain: "menus.colegastudio.com", path: "/", httpOnly: true, secure: true, sameSite: "Lax" }]);
const page = await ctx.newPage();
await page.goto(BASE + "/app/menus", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(800);

const readOpen = () =>
  page.evaluate(() => {
    const roots = [...document.querySelectorAll("[role=menu],[role=dialog],[role=listbox],[cmdk-root],[data-radix-popper-content-wrapper],[data-base-ui-popup],[popover]")];
    return roots.map((m) => ({
      role: m.getAttribute("role"),
      text: (m.innerText || "").replace(/\n{2,}/g, "\n").slice(0, 2500),
      links: [...m.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
    })).filter((m) => m.text.trim());
  });

const results = {};
const shot = (n) => page.screenshot({ path: path.join(OUT, "shots/menus", n + ".png") });

// 1) Agregar nueva herramienta / nuevo módulo (solo abrir y leer)
const adders = page.locator("aside button[aria-haspopup=menu]");
const n = await adders.count();
for (let i = 0; i < n; i++) {
  const b = adders.nth(i);
  const label = ((await b.getAttribute("aria-label")) || (await b.textContent()) || "").trim();
  try {
    await b.scrollIntoViewIfNeeded();
    await b.click({ timeout: 3000 });
    await page.waitForTimeout(600);
    results[`aside_${i}_${label}`] = await readOpen();
    await shot(`aside_${i}_` + label.replace(/[^a-z0-9]+/gi, "_").slice(0, 28));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } catch (e) { results[`aside_${i}_${label}`] = "ERR " + String(e).slice(0, 80); }
}

// 2) Topbar: Pedidos en línea, búsqueda global (Ctrl K), notificaciones, regalo, cohete
const header = [
  ["pedidos_en_linea", () => page.getByRole("button", { name: /Pedidos en línea/i }).first().click()],
  ["busqueda_global", () => page.keyboard.press("Control+k")],
  ["notificaciones", () => page.locator("header button[aria-label*='otific' i]").first().click()],
  ["regalo_refiere", () => page.locator("header button[aria-label*='egal' i], header button:has(svg.lucide-gift)").first().click()],
  ["cohete_primeros_pasos", () => page.getByRole("button", { name: /Primeros pasos/i }).first().click()],
];
for (const [name, act] of header) {
  try {
    await act();
    await page.waitForTimeout(900);
    results["topbar_" + name] = await readOpen();
    await shot("topbar_" + name);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } catch (e) { results["topbar_" + name] = "ERR " + String(e).slice(0, 80); }
}

// 3) Búsqueda global: escribir una consulta (solo lectura) para ver cómo agrupa
try {
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);
  await page.keyboard.type("caja", { delay: 60 });
  await page.waitForTimeout(900);
  results.busqueda_consulta_caja = await readOpen();
  await shot("busqueda_consulta_caja");
  await page.keyboard.press("Escape");
} catch (e) { results.busqueda_consulta_caja = "ERR " + String(e).slice(0, 80); }

// 4) Móvil: menú hamburguesa
try {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /^Menú$/ }).first().click();
  await page.waitForTimeout(700);
  results.movil_menu = await readOpen();
  await shot("movil_menu_hamburguesa");
} catch (e) { results.movil_menu = "ERR " + String(e).slice(0, 80); }

fs.writeFileSync(path.join(OUT, "menus-extra.json"), JSON.stringify(results, null, 1));
for (const [k, v] of Object.entries(results)) {
  console.log("\n## " + k);
  if (typeof v === "string") { console.log(v); continue; }
  for (const o of v) console.log(`[${o.role}] ` + o.text.replace(/\n/g, " ⏎ ").slice(0, 900));
}
await browser.close();
