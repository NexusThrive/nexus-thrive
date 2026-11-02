// Uso: STORYBOOK_URL=http://127.0.0.1:6006 AUDIT_OUT=./salida node <este archivo>. Solo lectura sobre un Storybook estático.
// Auditoría responsive del dashboard: capturas + desbordamiento + objetivos táctiles. Solo lectura sobre Storybook estático.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const S = process.env.AUDIT_OUT ?? "./salida-auditoria";
const OUT = S;
fs.mkdirSync(OUT, { recursive: true });

const BASE = `${process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006"}/iframe.html?viewMode=story&id=`;
const STORIES = {
  inicio: "organismos-customizabledashboard--default",
  inicioGraficos: "organismos-customizabledashboard--con-graficos",
  shell: "plantillas-tenantshell--desktop",
  panel: "páginas-inicio-panel-completo--claro",
};
const VIEWPORTS = [
  { k: "320", w: 320, h: 640, touch: true },
  { k: "360", w: 360, h: 740, touch: true },
  { k: "375", w: 375, h: 812, touch: true },
  { k: "412", w: 412, h: 915, touch: true },
  { k: "768", w: 768, h: 1024, touch: true },
  { k: "834", w: 834, h: 1194, touch: true },
  { k: "1024", w: 1024, h: 768, touch: true },
  { k: "1280", w: 1280, h: 800, touch: false },
];

const measure = () => {
  const vw = document.documentElement.clientWidth;
  const doc = document.documentElement;
  const root = {
    vw,
    scrollW: doc.scrollWidth,
    bodyScrollW: document.body.scrollWidth,
    overflowPage: doc.scrollWidth > vw + 1,
  };
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0;
  };
  const label = (el) =>
    (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || el.getAttribute("placeholder") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
  // Elementos que se salen del viewport por la derecha
  const over = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && r.width < vw * 4) {
      // ignorar los que viven dentro de un contenedor con scroll propio
      let p = el.parentElement, scrolled = false;
      while (p && p !== document.body) {
        const o = getComputedStyle(p).overflowX;
        if ((o === "auto" || o === "scroll" || o === "hidden") && p.getBoundingClientRect().right <= vw + 1) { scrolled = true; break; }
        p = p.parentElement;
      }
      if (!scrolled) over.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), right: Math.round(r.right), w: Math.round(r.width), t: label(el) });
    }
  }
  root.overflowEls = over.slice(0, 12);
  root.overflowCount = over.length;
  // Contenedores con scroll horizontal propio
  root.hscrollers = [...document.querySelectorAll("body *")].filter((el) => {
    const o = getComputedStyle(el).overflowX;
    return (o === "auto" || o === "scroll") && el.scrollWidth > el.clientWidth + 1 && vis(el);
  }).length;
  // Objetivos táctiles
  const sel = 'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=menuitem], [role=switch], [role=checkbox], [role=combobox], summary';
  const targets = [];
  for (const el of document.querySelectorAll(sel)) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.right < 0) continue;
    targets.push({ tag: el.tagName.toLowerCase(), role: el.getAttribute("role") || "", t: label(el), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top + scrollY) });
  }
  root.targets = targets;
  // Tamaño de texto mínimo y campos
  root.minFont = Math.min(...[...document.querySelectorAll("body *")].filter((e) => vis(e) && e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize)));
  root.inputs = [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea")].filter(vis).map((e) => ({ t: label(e), fs: parseFloat(getComputedStyle(e).fontSize) }));
  return root;
};

const browser = await chromium.launch();
const result = {};
for (const [sk, id] of Object.entries(STORIES)) {
  result[sk] = {};
  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: v.touch, isMobile: v.w < 1024, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + encodeURIComponent(id), { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1200);
      const m = await page.evaluate(measure);
      await page.screenshot({ path: `${OUT}/${sk}-${v.k}.png`, fullPage: false });
      await page.screenshot({ path: `${OUT}/${sk}-${v.k}-full.png`, fullPage: true });
      result[sk][v.k] = m;
    } catch (e) {
      result[sk][v.k] = { error: String(e).slice(0, 200) };
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(`${OUT}/medidas.json`, JSON.stringify(result, null, 1));

// Resumen
for (const [sk, byV] of Object.entries(result)) {
  console.log(`\n== ${sk}`);
  for (const [k, m] of Object.entries(byV)) {
    if (m.error) { console.log(k, "ERROR", m.error); continue; }
    const t = m.targets;
    const lt24 = t.filter((x) => x.w < 24 || x.h < 24).length;
    const lt44 = t.filter((x) => x.h < 44 || x.w < 44).length;
    console.log(`${k.padStart(4)}px  scrollW=${m.scrollW} desborda=${m.overflowPage} elemFuera=${m.overflowCount} hscroll=${m.hscrollers} controles=${t.length} <24:${lt24} <44:${lt44} fuenteMin=${m.minFont} campos<16:${m.inputs.filter((i) => i.fs < 16).length}/${m.inputs.length}`);
  }
}
