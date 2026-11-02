// Uso: STORYBOOK_URL=http://127.0.0.1:6006 AUDIT_OUT=./salida node <este archivo>. Solo lectura sobre un Storybook estático.
import { chromium } from "@playwright/test";
const BASE = `${process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006"}/iframe.html?viewMode=story&id=`;
const b = await chromium.launch();
for (const w of [320, 360, 375, 412]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(BASE + "organismos-customizabledashboard--default", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  const kpi = await p.evaluate(() => {
    // texto con recorte: scrollWidth > clientWidth o el rect del texto sobrepasa el de su tarjeta
    const out = [];
    for (const el of document.querySelectorAll("[data-widget] *")) {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const card = el.closest("[data-widget]"); const r = document.createRange(); r.selectNodeContents(el);
      const tr = r.getBoundingClientRect(), cr = card.getBoundingClientRect();
      if (tr.right > cr.right - 0.5 || el.scrollWidth > el.clientWidth + 1) out.push({ t: el.textContent.trim().slice(0, 24), textoDer: Math.round(tr.right), tarjetaDer: Math.round(cr.right), fs: getComputedStyle(el).fontSize });
    }
    return out;
  });
  await p.goto(BASE + "plantillas-tenantshell--desktop", { waitUntil: "networkidle" }); await p.waitForTimeout(600);
  const top = await p.evaluate(() => {
    const bs = [...document.querySelectorAll("header button, header a, header input")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((e) => ({ n: (e.getAttribute("aria-label") || e.textContent).trim().slice(0, 22), l: Math.round(e.getBoundingClientRect().left), r: Math.round(e.getBoundingClientRect().right), w: Math.round(e.getBoundingClientRect().width) }));
    const solapes = [];
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) if (bs[i].l < bs[j].r - 1 && bs[j].l < bs[i].r - 1) solapes.push(`${bs[i].n}↔${bs[j].n}`);
    return { bs, solapes };
  });
  console.log(`\n${w}px · KPI con texto recortado: ${kpi.length}`, kpi.slice(0, 4).map((k) => `«${k.t}» texto→${k.textoDer} tarjeta→${k.tarjetaDer} (${k.fs})`).join(" | "));
  console.log(`   barra superior: ${top.bs.map((x) => `${x.n}[${x.l}-${x.r}]`).join(" ")}  solapes: ${top.solapes.join(", ") || "ninguno"}`);
  await ctx.close();
}
await b.close();
