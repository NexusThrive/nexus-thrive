import type { Page } from "@playwright/test";

/** Medidas de una historia ya abierta. Todo se calcula en el navegador, sin tocar el DOM. */

/** Ancho del documento frente al del viewport: `desborda` si la página gana scroll horizontal (WCAG 1.4.10). */
export const medirDesborde = (page: Page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    return { viewport: doc.clientWidth, scroll: doc.scrollWidth, desborda: doc.scrollWidth > doc.clientWidth + 1 };
  });

/** Textos que no caben en su contenedor (recortados o fuera de su tarjeta). El desborde de página no los detecta. */
export const medirTextoRecortado = (page: Page, contenedor = "[data-widget]") =>
  page.evaluate((sel) => {
    const out: { texto: string; derechaTexto: number; derechaContenedor: number }[] = [];
    for (const el of document.querySelectorAll(`${sel} *`)) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) continue;
      const caja = el.closest(sel);
      if (!caja) continue;
      const rango = document.createRange();
      rango.selectNodeContents(el);
      const t = rango.getBoundingClientRect();
      const c = caja.getBoundingClientRect();
      if (t.width > 0 && (t.right > c.right + 0.5 || el.scrollWidth > el.clientWidth + 1)) {
        out.push({ texto: (el.textContent ?? "").trim().slice(0, 30), derechaTexto: Math.round(t.right), derechaContenedor: Math.round(c.right) });
      }
    }
    return out;
  }, contenedor);

/** Controles de la barra superior que se pisan entre sí. */
export const medirSolapes = (page: Page, contenedor = "header") =>
  page.evaluate((sel) => {
    const cajas = [...document.querySelectorAll<HTMLElement>(`${sel} button, ${sel} a, ${sel} input`)]
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0)
      .map(({ e, r }) => ({ nombre: (e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 30), l: r.left, r: r.right }));
    const solapes: string[] = [];
    for (let i = 0; i < cajas.length; i++)
      for (let j = i + 1; j < cajas.length; j++)
        if (cajas[i].l < cajas[j].r - 1 && cajas[j].l < cajas[i].r - 1) solapes.push(`${cajas[i].nombre} ↔ ${cajas[j].nombre}`);
    return solapes;
  }, contenedor);

export type Objetivo = { nombre: string; ancho: number; alto: number };

/** Controles interactivos visibles con su tamaño. */
export const medirObjetivos = (page: Page) =>
  page.evaluate(() => {
    const sel = 'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=menuitem], [role=switch], [role=checkbox], [role=combobox], summary';
    const out: { nombre: string; ancho: number; alto: number }[] = [];
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width <= 0 || r.height <= 0 || cs.display === "none" || cs.visibility === "hidden") continue;
      const nombre = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
      out.push({ nombre, ancho: Math.round(r.width), alto: Math.round(r.height) });
    }
    return out;
  });

/** Texto visible más pequeño (px). */
export const medirTextoMinimo = (page: Page) =>
  page.evaluate(() => {
    const tamanos = [...document.querySelectorAll("body *")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
      })
      .map((e) => parseFloat(getComputedStyle(e).fontSize));
    return Math.min(...tamanos);
  });

/** Enlaces de navegación visibles de la barra lateral con su etiqueta visible (no solo `aria-label`). */
export const medirNavegacion = (page: Page) =>
  page.evaluate(() => {
    const visible = (e: Element) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
    };
    const tabbar = [...document.querySelectorAll("a,button")].some((e) => (e.textContent ?? "").trim() === "Más" && visible(e));
    const enlaces = [...document.querySelectorAll("a")].filter((a) => visible(a) && a.getBoundingClientRect().left < 260 && a.getBoundingClientRect().bottom < innerHeight - 100 && a.getAttribute("aria-label")?.includes("inicio") !== true);
    const sinEtiqueta = enlaces.filter((a) => {
      // Etiqueta visible = texto renderizado dentro del enlace con ancho > 0.
      const texto = [...a.querySelectorAll("*"), a].find((n) => [...n.childNodes].some((c) => c.nodeType === 3 && (c.textContent ?? "").trim()) && visible(n));
      return !texto;
    });
    return { tabbar, enlaces: enlaces.length, sinEtiqueta: sinEtiqueta.map((a) => a.getAttribute("aria-label") ?? a.getAttribute("href") ?? "?") };
  });
