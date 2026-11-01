// Uso: STORYBOOK_URL=http://127.0.0.1:6006 AUDIT_OUT=./salida node <este archivo>. Solo lectura sobre un Storybook estático.
// Umbrales reales de comportamiento adaptativo: navegación (barra inferior / riel / lateral) y hoja o modal, en una rejilla fina de anchos.
import fs from "node:fs";
import { chromium } from "@playwright/test";
const S = process.env.AUDIT_OUT ?? "./salida-auditoria";
fs.mkdirSync(S, { recursive: true });
const BASE = `${process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006"}/iframe.html?viewMode=story&id=`;
const WIDTHS = [320, 360, 375, 412, 480, 600, 639, 640, 700, 767, 768, 820, 1023, 1024, 1100, 1279, 1280, 1440];

const browser = await chromium.launch();
const rows = [];
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: w < 1024, isMobile: w < 1024 });
  const page = await ctx.newPage();
  const row = { w };
  // 1) Navegación
  await page.goto(BASE + "plantillas-tenantshell--desktop", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  row.nav = await page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.display !== "none" && c.visibility !== "hidden"; };
    const mas = [...document.querySelectorAll("button,a")].find((e) => e.textContent.trim() === "Más" && vis(e));
    const cli = [...document.querySelectorAll("a")].find((e) => /Clientes/.test(e.getAttribute("aria-label") || e.textContent) && vis(e) && e.getBoundingClientRect().bottom < innerHeight - 100);
    const labelVisible = cli ? cli.textContent.trim().length > 0 && cli.getBoundingClientRect().width > 100 : false;
    const buscador = [...document.querySelectorAll("input")].find((e) => vis(e));
    return {
      tabbar: !!mas,
      sidebar: !!cli,
      sidebarW: cli ? Math.round(cli.getBoundingClientRect().width) : 0,
      etiquetas: labelVisible,
      buscadorInput: buscador ? Math.round(buscador.getBoundingClientRect().width) : 0,
      scrollW: document.documentElement.scrollWidth,
    };
  });
  // 2) Hoja o modal
  await page.goto(BASE + "plantillas-tenantshell--with-modal", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  try {
    await page.getByRole("button", { name: "Nuevo cliente" }).first().click({ timeout: 4000 });
    await page.waitForTimeout(700);
    row.modal = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { error: "sin dialog" };
      const r = d.getBoundingClientRect();
      const vh = innerHeight, vw = innerWidth;
      const kind = r.bottom >= vh - 2 && r.width >= vw - 2 ? "hoja inferior a ancho completo" : r.bottom >= vh - 2 ? "hoja inferior" : r.right >= vw - 2 ? "panel lateral" : "modal centrado";
      const close = [...d.querySelectorAll("button")].find((b) => /cerrar/i.test(b.getAttribute("aria-label") || b.textContent));
      const cr = close ? close.getBoundingClientRect() : null;
      return { kind, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), cerrar: cr ? `${Math.round(cr.width)}x${Math.round(cr.height)}` : "—" };
    });
  } catch (e) {
    row.modal = { error: String(e).slice(0, 80) };
  }
  rows.push(row);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${S}/medidas-umbrales.json`, JSON.stringify(rows, null, 1));
console.log("ancho | barra inferior | lateral (ancho, etiquetas) | buscador | hoja o modal (ancho×alto, cerrar)");
for (const r of rows) {
  const n = r.nav, m = r.modal;
  console.log(`${String(r.w).padStart(5)} | ${n.tabbar ? "sí" : "no"} | ${n.sidebar ? `sí ${n.sidebarW}px ${n.etiquetas ? "con etiquetas" : "solo iconos"}` : "no"} | ${n.buscadorInput}px | ${m.error ? m.error : `${m.kind} ${m.w}×${m.h} cerrar ${m.cerrar}`} ${n.scrollW > r.w ? " ¡DESBORDA" + n.scrollW : ""}`);
}
