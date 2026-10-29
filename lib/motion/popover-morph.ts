import { gsap } from "gsap";
import { motionOff } from "./reduced";

/**
 * Viaje de un panel anclado (notificaciones, selector de negocio) desde el
 * control que lo abrió: el mismo efecto de los modales «Pretty» (`modal-morph`),
 * pero sin el centrado de un diálogo. El panel **es** el botón (mismo tamaño,
 * posición, radio y color), crece hasta su sitio y, al cerrar, vuelve a él; el
 * botón se oculta mientras dura el viaje y reaparece con un fundido cruzado.
 *
 * Un solo dueño: con `data-morph` el CSS no anima la entrada ni la salida
 * (`motion.css`); solo sostiene la salida para que Radix espere a desmontar.
 * Crece con `transform` (escala desde la esquina y traslación), no con `width`/`height`:
 * Radix recoloca el panel cada vez que cambia su tamaño y el viaje se desviaba.
 * El contenido entra cuando la escala ya casi llegó a 1, así no se ve deformado.
 */

/** Duración de cada sentido. Debe ser menor que el `nx-popover-hold` del CSS (520 ms). */
export const POPOVER_MORPH_SECONDS = 0.48;

type Box = { w: number; h: number; left: number; top: number; radius: string; bg: string };

const solid = (color: string | undefined, fallback: string) =>
  !color || color === "transparent" || color === "rgba(0, 0, 0, 0)" ? fallback : color;

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { w: el.offsetWidth, h: el.offsetHeight, left: r.left, top: r.top, radius: cs.borderTopLeftRadius, bg: cs.backgroundColor };
}

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
export function armPopoverMorph(node: HTMLElement, origin: HTMLElement | null, { watchClose = false }: { watchClose?: boolean } = {}): PopoverMorph | null {
  if (typeof window === "undefined" || motionOff() || !origin?.isConnected) return null;
  const anchor: HTMLElement = origin;
  const rect = anchor.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  node.setAttribute("data-morph", "");
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
    if (leaving) return leaving;
    open?.kill();
    if (!started) {
      gsap.set(anchor, { clearProps: "opacity" });
      return (leaving = Promise.resolve());
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
    const travel = POPOVER_MORPH_SECONDS - 0.1;
    leaving = new Promise<void>((resolve) => {
      gsap
        .timeline({
          onComplete: () => {
            gsap.set(node, { opacity: 0 });
            gsap.set(anchor, { clearProps: "opacity" });
            resolve();
          },
        })
        .to(items(), { opacity: 0, y: 6, duration: 0.12, stagger: { each: 0.015, from: "end" }, ease: "power2.in" }, 0)
        .to(node, { x: dx, y: dy, scaleX: from.w / restW, scaleY: from.h / restH, borderRadius: from.radius, backgroundColor: solid(from.bg, now.bg), duration: travel, ease: "expo.inOut" }, 0.1)
        .to(node, { opacity: 0, duration: travel * 0.35, ease: "power1.in" }, 0.1 + travel * 0.65)
        .fromTo(anchor, { opacity: 0 }, { opacity: 1, duration: travel * 0.4, ease: "power1.out", immediateRender: false }, 0.1 + travel * 0.6);
    });
    return leaving;
  }

  function cancel() {
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
    gsap.set(node, { x: from.left - to.left, y: from.top - to.top, scaleX: from.w / to.w, scaleY: from.h / to.h, borderRadius: from.radius, backgroundColor: solid(from.bg, to.bg), overflow: "hidden", opacity: 1, transformOrigin: "0 0" });
    gsap.set(items(), { opacity: 0, y: 10 });
    gsap.set(anchor, { opacity: 0 });
    void node.offsetWidth;
    open = gsap.timeline({
      onComplete: () => {
        gsap.set(node, { clearProps: CLEAR });
        gsap.set(items(), { clearProps: "opacity,y" });
      },
    });
    open
      .to(node, { x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: to.radius, backgroundColor: to.bg, duration: POPOVER_MORPH_SECONDS, ease: "expo.out" }, 0)
      .to(items(), { opacity: 1, y: 0, duration: 0.34, stagger: 0.04, ease: "power3.out" }, 0.24);
  };
  raf = requestAnimationFrame(begin);

  return { exit, cancel };
}
