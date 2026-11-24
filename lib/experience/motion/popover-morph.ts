import { gsap } from "gsap";
import { MORPH_EASE as EASE } from "./morph-curves";
import { motionOff } from "./reduced";

/**
 * Viaje de un panel anclado (menús como «Crear», notificaciones, selector de negocio) desde el control que lo abrió, con la
 * misma continuidad que los modales (`modal-morph`) y el Auri de la landing, pero sin el centrado de un diálogo. Nada se corta:
 * el panel aparece encima del botón con su color (solo se nota que el texto se desvanece), crece proporcional hasta su sitio con
 * una sola curva y el contenido entra mientras todavía llega. Al cerrar hace todo el recorrido opaco, llega convertido en el
 * botón (tamaño, radio y color) y solo entonces se disuelve sobre él: el botón nunca surge de la nada.
 *
 * Un solo dueño: con `data-morph` el CSS no anima la entrada ni la salida
 * (`motion.css`); solo sostiene la salida para que Radix espere a desmontar.
 * Crece con `transform` (escala desde la esquina y traslación), no con `width`/`height`:
 * Radix recoloca el panel cada vez que cambia su tamaño y el viaje se desviaba.
 * El contenido entra cuando la escala ya casi llegó a 1, así no se ve deformado.
 */

/** Duración de la apertura por defecto. El cierre dura `CLOSE_RATIO` de ella y debe ser menor que el `nx-popover-hold` del CSS (520 ms). */
export const POPOVER_MORPH_SECONDS = 0.46;
/** El cierre, un poco más rápido que la apertura (como en los modales). */
const CLOSE_RATIO = 0.8;
/** Listas de un `Select`: más cortas (se usan mucho). Menor que el sostén de 360 ms del CSS. */
export const SELECT_MORPH_SECONDS = 0.3;

type Box = { w: number; h: number; left: number; top: number; radius: string; bg: string };

const clear = (color: string | undefined) => !color || color === "transparent" || color === "rgba(0, 0, 0, 0)";
const solid = (color: string | undefined, fallback: string) => (clear(color) ? fallback : color!);

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  // El radio que se ve: una píldora (`rounded-full`) reporta un valor enorme; interpolar desde él deja la superficie circular.
  const px = Number.parseFloat(cs.borderTopLeftRadius);
  const radius = Number.isFinite(px) && px > 0 ? `${Math.min(px, Math.min(w, h) / 2)}px` : "0px";
  return { w, h, left: r.left, top: r.top, radius, bg: cs.backgroundColor };
}

/**
 * Radio que se ve igual bajo una escala no uniforme: el panel crece con `transform`, así que su radio se escala con él. Se
 * compensa con un radio elíptico (horizontal / vertical) para que, al llegar al botón, sus esquinas sean exactamente las suyas.
 */
const radiusAt = (radius: string, sx: number, sy: number) => {
  const r = Number.parseFloat(radius) || 0;
  return `${r / (sx || 1)}px / ${r / (sy || 1)}px`;
};

export type PopoverMorph = {
  /** Vuelve al control (y resuelve al terminar). Idempotente. */
  exit: () => Promise<void>;
  /** Mata las animaciones y devuelve el control a la vista (al desmontar). */
  cancel: () => void;
};

const CLEAR = "x,y,scaleX,scaleY,borderRadius,backgroundColor,overflow,opacity,transformOrigin";

/**
 * Arma el viaje de apertura sobre `node`. Devuelve `null` (y el CSS anima como
 * siempre) con movimiento reducido o si no hay un control de origen visible.
 * Con `watchClose`, observa `data-state="closed"` (Radix) y sale solo.
 */
export function armPopoverMorph(
  node: HTMLElement,
  origin: HTMLElement | null,
  { watchClose = false, hideOrigin = true, seconds = POPOVER_MORPH_SECONDS }: { watchClose?: boolean; /** `false`: el control se queda a la vista (un `Select`: solo se anima la lista). */ hideOrigin?: boolean; seconds?: number } = {},
): PopoverMorph | null {
  if (typeof window === "undefined" || motionOff() || !origin?.isConnected) return null;
  const anchor: HTMLElement = origin;
  const rect = anchor.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  node.setAttribute("data-morph", "");
  // Mientras el menú se abre no se puede elegir nada (un escudo invisible absorbe los clics; ver `globals.css`): así no se
  // seleccionan ni abren opciones antes de que el menú termine de aparecer.
  node.setAttribute("data-settling", "");
  gsap.set(node, { opacity: 0 }); // no se ve en su sitio final antes de arrancar
  const items = () => Array.from(node.children) as HTMLElement[];

  let raf = 0;
  let open: gsap.core.Timeline | null = null;
  let leaving: Promise<void> | null = null;
  let started = false;
  let from!: Box;
  let to!: Box;
  const watcher = watchClose
    ? new MutationObserver(() => {
        if (node.getAttribute("data-state") === "closed") void exit();
      })
    : null;
  watcher?.observe(node, { attributes: true, attributeFilter: ["data-state"] });

  function exit(): Promise<void> {
    node.removeAttribute("data-settling");
    if (leaving) return leaving;
    open?.kill();
    if (!started) {
      gsap.set(anchor, { clearProps: "opacity" });
      return (leaving = Promise.resolve());
    }
    if (!anchor.isConnected) {
      // El control ya no está (un ítem que se cierra al elegirlo): el panel solo se apaga en su sitio.
      leaving = new Promise<void>((resolve) => {
        gsap.to(node, { opacity: 0, duration: 0.18, ease: "power1.in", onComplete: resolve });
      });
      return leaving;
    }
    from = boxOf(anchor); // el control pudo moverse o estar a medio «presionar» al abrir
    const now = boxOf(node);
    // Su sitio de reposo se vuelve a medir (la página pudo moverse): lo visible menos el desplazamiento actual.
    const cx = Number(gsap.getProperty(node, "x")) || 0;
    const cy = Number(gsap.getProperty(node, "y")) || 0;
    const dx = from.left - (now.left - cx);
    const dy = from.top - (now.top - cy);
    const restW = node.offsetWidth || to.w;
    const restH = node.offsetHeight || to.h;
    gsap.set(node, { overflow: "hidden", transformOrigin: "0 0" });
    const sx = from.w / restW;
    const sy = from.h / restH;
    const total = seconds * CLOSE_RATIO;
    const travel = 0.76 * total;
    leaving = new Promise<void>((resolve) => {
      const tl = gsap
        .timeline({
          onComplete: () => {
            gsap.set(node, { opacity: 0 });
            gsap.set(anchor, { clearProps: "opacity" });
            resolve();
          },
        })
        // Todo arranca a la vez: el contenido se va mientras el panel ya vuelve, opaco, hasta ser el botón.
        .to(items(), { opacity: 0, y: 4, duration: 0.34 * total, stagger: { each: 0.012, from: "end" }, ease: EASE.io }, 0)
        .to(node, { x: dx, y: dy, scaleX: sx, scaleY: sy, borderRadius: radiusAt(from.radius, sx, sy), duration: travel, ease: EASE.io }, 0)
        .to(node, { backgroundColor: solid(from.bg, now.bg), duration: 0.55 * total, ease: EASE.io }, 0.2 * total)
      if (clear(from.bg)) {
        // Botón sin fondo (un icono, «⋯»): no hay color en el que convertirse, así que el panel se disuelve en el último tramo
        // del viaje mientras el icono aparece; no llega a su sitio como un recuadro blanco.
        tl.to(node, { opacity: 0, duration: total * 0.5, ease: EASE.io }, total * 0.5);
        if (hideOrigin) tl.fromTo(anchor, { opacity: 0 }, { opacity: 1, duration: total * 0.45, ease: EASE.out, immediateRender: false }, total * 0.55);
      } else {
        // Ya es el botón: se disuelve encima de él y lo único que aparece es su texto.
        tl.to(node, { opacity: 0, duration: total - travel, ease: EASE.io }, travel);
        if (hideOrigin) tl.set(anchor, { opacity: 1 }, travel);
      }
    });
    return leaving;
  }

  function cancel() {
    node.removeAttribute("data-settling");
    cancelAnimationFrame(raf);
    watcher?.disconnect();
    open?.kill();
    gsap.set(anchor, { clearProps: "opacity" });
  }

  // Radix coloca el panel unos fotogramas después de montarlo (su envoltorio parte fuera de pantalla):
  // se espera a que esté en su sitio y con tamaño antes de medir.
  let tries = 0;
  const begin = () => {
    const wrapper = node.closest<HTMLElement>("[data-radix-popper-content-wrapper]");
    const placed = !wrapper || !/-200%/.test(wrapper.style.transform);
    if ((!placed || node.offsetWidth === 0) && tries++ < 20) {
      raf = requestAnimationFrame(begin);
      return;
    }
    gsap.set(node, { clearProps: CLEAR });
    to = boxOf(node);
    from = boxOf(anchor);
    started = true;
    const sx = from.w / to.w;
    const sy = from.h / to.h;
    // Nace transparente encima del botón con su mismo color: si lo tapara de golpe, el texto desaparecería en un corte.
    gsap.set(node, { x: from.left - to.left, y: from.top - to.top, scaleX: sx, scaleY: sy, borderRadius: radiusAt(from.radius, sx, sy), backgroundColor: solid(from.bg, to.bg), overflow: "hidden", opacity: 0, transformOrigin: "0 0", willChange: "transform, opacity" });
    gsap.set(items(), { opacity: 0, y: 6 });
    void node.offsetWidth;
    open = gsap.timeline({
      onComplete: () => {
        node.removeAttribute("data-settling");
        gsap.set(node, { clearProps: `${CLEAR},willChange` });
        gsap.set(items(), { clearProps: "opacity,y" });
      },
    });
    open
      .to(node, { opacity: 1, duration: 0.18 * seconds, ease: EASE.out }, 0)
      // Ya opaco, el botón se oculta debajo sin que se vea: el panel queda solo durante el viaje.
      .to(node, { x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: radiusAt(to.radius, 1, 1), duration: seconds, ease: EASE.glide }, 0)
      .to(node, { backgroundColor: to.bg, duration: 0.6 * seconds, ease: EASE.io }, 0.1 * seconds)
      // El contenido entra cuando la escala ya se acerca a 1 (no se ve deformado) y mientras el panel todavía llega.
      .to(items(), { opacity: 1, y: 0, duration: 0.55 * seconds, stagger: 0.025, ease: EASE.out }, 0.42 * seconds);
    if (hideOrigin) open.set(anchor, { opacity: 0 }, 0.18 * seconds);
  };
  raf = requestAnimationFrame(begin);

  return { exit, cancel };
}
