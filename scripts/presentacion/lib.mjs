/**
 * Utilidades para grabar la presentación con Playwright: cursor visible con onda al pulsar, subtítulos de capítulo,
 * movimiento humano y un reloj para ajustar cada escena a su tiempo (el video dura lo que dura el guion).
 */
import { readFileSync } from "node:fs";

export const BASE = process.env.BASE ?? "http://localhost:3001";
export const SLUG = process.env.SLUG ?? "aurora-pc";
export const SPLASH_COOKIE_HINT = /splash/i;

/** Estado de sesión sin la cookie de la intro, para que la N de carga se vea al entrar. */
export function stateWithoutSplash(path) {
  const state = JSON.parse(readFileSync(path, "utf8"));
  state.cookies = state.cookies.filter((c) => !SPLASH_COOKIE_HINT.test(c.name));
  return state;
}

/** Se ejecuta en cada página: cursor, subtítulos, y oculta lo que solo existe en desarrollo (indicador de Next, banderas sin fuente). */
export const initScript = ({ mobile }) => {
  const css = `
    nextjs-portal { display: none !important; }
    #rec-cursor { position: fixed; z-index: 2147483646; left: 0; top: 0; width: 26px; height: 26px; margin: -3px 0 0 -3px; pointer-events: none;
      transition: transform .06s linear; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
    #rec-ripple { position: fixed; z-index: 2147483645; pointer-events: none; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 999px;
      border: 2px solid rgba(212,175,55,.95); background: rgba(212,175,55,.25); opacity: 0; }
    #rec-ripple.on { animation: rec-ripple .55s ease-out; }
    @keyframes rec-ripple { from { opacity: 1; transform: scale(.6); } to { opacity: 0; transform: scale(4.2); } }
    #rec-caption { position: fixed; z-index: 2147483647; ${mobile ? "left: 16px; right: 16px; bottom: calc(env(safe-area-inset-bottom,0px) + 100px);" : "left: 48px; bottom: 44px; max-width: 640px;"}
      padding: ${mobile ? "10px 14px" : "14px 22px"}; border-radius: 12px; background: rgba(10,10,10,.92); color: #fff;
      font: 600 ${mobile ? "15px" : "21px"}/1.25 Montserrat, Inter, system-ui, sans-serif; letter-spacing: -.01em; border-left: 4px solid #d4af37;
      opacity: 0; transform: translateY(10px); transition: opacity .4s ease, transform .4s ease; pointer-events: none; }
    #rec-caption[data-pos="top"] { top: calc(env(safe-area-inset-top,0px) + 72px); bottom: auto; }
    #rec-caption.on { opacity: 1; transform: none; }
    #rec-end { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; align-content: center; gap: 14px; text-align: center;
      background: #000; color: #fff; opacity: 0; transition: opacity .8s ease; pointer-events: none; font-family: Montserrat, Inter, sans-serif; }
    #rec-end.on { opacity: 1; }
    #rec-end b { font-size: ${mobile ? "26px" : "44px"}; letter-spacing: .32em; }
    #rec-end span { font-size: ${mobile ? "13px" : "18px"}; color: #d4af37; letter-spacing: .06em; }
  `;
  const mount = () => {
    if (document.getElementById("rec-cursor")) return;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "rec-cursor";
    cursor.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 8-6.5 1.8L10 19z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    cursor.style.display = mobile ? "none" : "block";
    document.body.append(cursor);
    const ripple = document.createElement("div");
    ripple.id = "rec-ripple";
    document.body.append(ripple);
    const caption = document.createElement("div");
    caption.id = "rec-caption";
    document.body.append(caption);
    const end = document.createElement("div");
    end.id = "rec-end";
    end.innerHTML = '<b>NEXUS THRIVE</b><span>Tu negocio, ordenado.</span>';
    document.body.append(end);
    document.addEventListener("pointermove", (e) => { cursor.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"; }, true);
    document.addEventListener("pointerdown", (e) => {
      ripple.style.left = e.clientX + "px"; ripple.style.top = e.clientY + "px";
      ripple.classList.remove("on"); void ripple.offsetWidth; ripple.classList.add("on");
    }, true);
    // Sin fuente de emoji en el equipo de grabación las banderas salen como cuadros: se esconden.
    const hideFlags = () => document.querySelectorAll("span[aria-hidden='true']").forEach((el) => { if (/^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(el.textContent || "")) el.style.display = "none"; });
    new MutationObserver(hideFlags).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
};

export function clock() {
  const t0 = Date.now();
  return {
    now: () => (Date.now() - t0) / 1000,
    /** Espera hasta el segundo `t` del video (si ya pasó, sigue sin esperar). */
    async until(page, t) {
      const left = t - (Date.now() - t0) / 1000;
      if (left > 0) await page.waitForTimeout(left * 1000);
    },
  };
}

/** `pos`: «top» para móvil cuando una hoja inferior tapa la parte de abajo. */
export async function caption(page, text, pos = "bottom") {
  await page.evaluate(([t, p]) => {
    const el = document.getElementById("rec-caption");
    if (!el) return;
    el.classList.remove("on");
    setTimeout(() => { el.textContent = t; el.dataset.pos = p; if (t) el.classList.add("on"); }, 250);
  }, [text, pos]).catch(() => {});
}

let pos = { x: 640, y: 360 };
/** Mueve el puntero suavemente (curva de aceleración) hasta el punto. */
export async function glide(page, x, y, ms = 650) {
  const steps = Math.max(8, Math.round(ms / 16));
  const from = pos;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await page.waitForTimeout(ms / steps);
  }
  pos = { x, y };
}

/** Lleva el puntero al elemento y lo pulsa. */
export async function tap(page, locator, { pause = 140, ms = 420 } = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (!box) throw new Error("Sin caja para pulsar");
  await glide(page, box.x + box.width / 2, box.y + box.height / 2, ms);
  await page.waitForTimeout(pause);
  await locator.click({ delay: 70 });
}

export async function typeSlow(page, locator, text, delay = 42) {
  await locator.click();
  await locator.pressSequentially(text, { delay });
}

export async function endCard(page) {
  await page.evaluate(() => document.getElementById("rec-end")?.classList.add("on")).catch(() => {});
}
