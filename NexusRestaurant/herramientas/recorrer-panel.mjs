// Recorrido autenticado de solo lectura del panel /app (cuenta propia).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://menus.colegastudio.com";
const OUT = process.argv[2];
const MAX_PAGES = 90;
const COOKIE = process.env.SESSION_COOKIE;
if (!COOKIE) throw new Error("falta SESSION_COOKIE");
for (const d of ["shots/desktop", "shots/mobile", "shots/menus"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const DANGER = /cerrar sesi|salir|logout|eliminar|borrar|delete|guardar|crear|nuev[oa]|agregar|añadir|publicar|enviar|pagar|cancelar|suscrib|invitar|importar|exportar|descargar|imprimir/i;
const SKIP_URL = /logout|signout|sign-out|delete|remove|\/api\//i;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addCookies([
  { name: "__Secure-better-auth.session_token", value: COOKIE, domain: "menus.colegastudio.com", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
]);
const page = await ctx.newPage();

// --- red: solo forma de los datos (claves), nunca valores
const net = new Map();
const shape = (v, d = 0) => {
  if (Array.isArray(v)) return v.length ? [shape(v[0], d + 1)] : [];
  if (v && typeof v === "object") return d > 2 ? "{…}" : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x, d + 1)]));
  return v === null ? "null" : typeof v;
};
page.on("response", async (res) => {
  const req = res.request();
  if (!["fetch", "xhr"].includes(req.resourceType())) return;
  const u = new URL(res.url());
  const key = `${req.method()} ${u.hostname === "menus.colegastudio.com" ? "" : u.hostname}${u.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ":id")}`;
  if (net.has(key) || req.headers()["rsc"] === "1") return;
  const rec = { method: req.method(), path: key.split(" ")[1], status: res.status(), ctype: (res.headers()["content-type"] || "").split(";")[0], from: page.url().replace(BASE, "") };
  if (rec.ctype.includes("json")) {
    try { rec.shape = shape(await res.json()); } catch {}
  }
  net.set(key, rec);
});

const nav = async () =>
  page.evaluate(() => {
    const txt = (e) => (e.getAttribute("aria-label") || e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70);
    const grab = (sel) =>
      [...document.querySelectorAll(sel)].map((r) => ({
        tag: r.tagName.toLowerCase(),
        role: r.getAttribute("role"),
        label: r.getAttribute("aria-label"),
        items: [...r.querySelectorAll("a[href],button,[role=menuitem],[role=tab]")].map((e) => ({
          t: e.tagName.toLowerCase(),
          text: txt(e),
          href: e.getAttribute("href"),
          popup: e.getAttribute("aria-haspopup"),
          expanded: e.getAttribute("aria-expanded"),
          current: e.getAttribute("aria-current"),
          badge: (e.querySelector("[class*=badge],[data-badge]")?.textContent || "").trim().slice(0, 20),
        })),
      }));
    return { aside: grab("aside"), header: grab("header"), nav: grab("nav") };
  });

// --- 1) entrar y descubrir el sidebar
await page.goto(BASE + "/app", { waitUntil: "networkidle", timeout: 45000 });
console.log("aterrizaje:", page.url());
const first = await nav();
fs.writeFileSync(path.join(OUT, "nav-inicial.json"), JSON.stringify(first, null, 1));

const hrefs = new Set();
for (const g of [...first.aside, ...first.header, ...first.nav])
  for (const i of g.items) if (i.href && i.href.startsWith("/app")) hrefs.add(i.href.split("#")[0]);

// --- 2) abrir menús desplegables del topbar y sidebar (solo los que abren menú, sin acciones)
const menus = [];
const triggers = page.locator("header [aria-haspopup], aside [aria-haspopup], header [aria-expanded], aside [aria-expanded]");
const n = await triggers.count();
for (let i = 0; i < Math.min(n, 30); i++) {
  const t = triggers.nth(i);
  const label = ((await t.getAttribute("aria-label")) || (await t.textContent()) || "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (DANGER.test(label)) continue;
  try {
    await t.click({ timeout: 2500 });
    await page.waitForTimeout(500);
    const open = await page.evaluate(() =>
      [...document.querySelectorAll("[role=menu],[role=listbox],[role=dialog],[data-radix-popper-content-wrapper],[data-state=open]")]
        .map((m) => ({
          role: m.getAttribute("role"),
          items: [...m.querySelectorAll("a[href],[role=menuitem],[role=option],button")].map((e) => ({
            text: (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70),
            href: e.getAttribute("href"),
          })).filter((x) => x.text),
        }))
        .filter((m) => m.items.length),
    );
    await page.screenshot({ path: path.join(OUT, "shots/menus", `${String(i).padStart(2, "0")}_${label.replace(/[^a-z0-9]+/gi, "_").slice(0, 30)}.png`) });
    menus.push({ trigger: label, open });
    for (const m of open) for (const it of m.items) if (it.href?.startsWith("/app")) hrefs.add(it.href.split("#")[0]);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  } catch {}
}
fs.writeFileSync(path.join(OUT, "menus-desplegables.json"), JSON.stringify(menus, null, 1));

// --- 3) recorrer pantallas /app/* (GET), desktop + móvil
const seen = new Set();
const queue = ["/app", ...hrefs];
const pages = [];
const slugOf = (p) => (p.replace(/^\/app\/?/, "") || "inicio").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").slice(0, 60);
while (queue.length && pages.length < MAX_PAGES) {
  const p = queue.shift();
  if (seen.has(p) || SKIP_URL.test(p)) continue;
  seen.add(p);
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    const res = await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 40000 });
    await page.waitForTimeout(600);
    const final = page.url().replace(BASE, "");
    const info = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim().slice(0, 80) || "",
      headings: [...document.querySelectorAll("h2,h3")].map((h) => h.textContent.trim().slice(0, 60)).slice(0, 25),
      tabs: [...document.querySelectorAll("[role=tab]")].map((t) => t.textContent.trim().slice(0, 40)),
      buttons: [...new Set([...document.querySelectorAll("main button")].map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 45)).filter(Boolean))].slice(0, 40),
      fields: [...document.querySelectorAll("main input,main select,main textarea")].map((i) => ({ type: i.type || i.tagName.toLowerCase(), name: i.name || i.id, ph: i.placeholder })).slice(0, 40),
      tables: [...document.querySelectorAll("main table")].map((t) => [...t.querySelectorAll("th")].map((h) => h.textContent.trim().slice(0, 30))),
      empty: /aún no|sin resultados|no hay|vacío|empieza/i.test(document.querySelector("main")?.innerText || ""),
    }));
    const slug = slugOf(final);
    await page.screenshot({ path: path.join(OUT, "shots/desktop", slug + ".png"), fullPage: true });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, "shots/mobile", slug + ".png"), fullPage: false });
    const links = await page.$$eval("a[href^='/app']", (as) => as.map((a) => a.getAttribute("href").split("#")[0]));
    pages.push({ requested: p, final, status: res?.status(), ...info, linksOut: [...new Set(links)] });
    for (const l of links) if (!seen.has(l) && !SKIP_URL.test(l)) queue.push(l);
  } catch (e) {
    pages.push({ requested: p, error: String(e).slice(0, 160) });
  }
}

fs.writeFileSync(path.join(OUT, "pantallas.json"), JSON.stringify(pages, null, 1));
fs.writeFileSync(path.join(OUT, "api-observada.json"), JSON.stringify([...net.values()], null, 1));
console.log("pantallas:", pages.length, "· endpoints:", net.size, "· menús:", menus.length);
console.log(pages.map((p) => `${p.status ?? "ERR"} ${p.final ?? p.requested} | ${p.h1 ?? p.error}`).join("\n"));
await browser.close();
