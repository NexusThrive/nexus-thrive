import { gsap } from "gsap";
import { motionOff } from "./reduced";

/**
 * Viaje del modal centrado de escritorio (el efecto de `Pretty Modal Demo.zip`).
 *
 * La superficie **es** el control que la abrió (mismo tamaño, posición, radio y
 * color), crece hasta su sitio y, al cerrar, vuelve exactamente a él. Apertura
 * y cierre: `MORPH_SECONDS` cada uno.
 *
 * Anima `width`, `height`, `border-radius` y `background-color`, que el
 * contrato de movimiento reserva a `transform/opacity/filter/clip-path`. Es la
 * excepción documentada de este componente: sin cambiar el tamaño real no se
 * reproduce el efecto aprobado (ver docs/design/movimiento.md §1.3).
 *
 * Un solo dueño: mientras el motor vive, el CSS no anima la entrada ni la
 * salida (`data-morph`); solo sostiene la salida para que Radix espere a
 * desmontar (`modal-out-hold`).
 */

/** Duración del viaje en cada sentido. Debe coincidir con `modal-out-hold` del CSS. */
export const MORPH_SECONDS = 0.6;

/** Base del ZIP: abre en 0,75 s y cierra en 0,55 s (más 0,12 s de espera). */
const ZIP_OPEN = 0.75;
const ZIP_CLOSE = 0.55;
const ZIP_CLOSE_DELAY = 0.12;

const CLEAR = "xPercent,yPercent,x,y,width,height,borderRadius,backgroundColor,overflow,opacity";

/* Último control pulsado: de ahí «nace» el modal. Se registra desde que se
   carga el módulo porque el panel se monta después del clic. */
let lastActivator: WeakRef<HTMLElement> | null = null;
let tracking = false;

export function trackActivators(): void {
  if (tracking || typeof document === "undefined") return;
  tracking = true;
  const remember = (event: Event) => {
    const el = (event.target as Element | null)?.closest?.<HTMLElement>('button, a, [role="button"]');
    if (el) lastActivator = new WeakRef(el);
  };
  document.addEventListener("pointerdown", remember, true);
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter" || event.key === " ") remember(event);
    },
    true,
  );
}

type Box = { w: number; h: number; cx: number; cy: number; radius: string; bg: string };

function solid(color: string | undefined, fallback: string) {
  return !color || color === "transparent" || color === "rgba(0, 0, 0, 0)" ? fallback : color;
}

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    w: el.offsetWidth,
    h: el.offsetHeight,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    radius: cs.borderTopLeftRadius,
    bg: cs.backgroundColor,
  };
}

/** El control de origen, si sigue en pantalla; si no, el CSS anima como antes. */
function usableOrigin(): HTMLElement | null {
  const el = lastActivator?.deref();
  if (!el?.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;
  return el;
}

type Armed = { cleanup: () => void };

const armed = new WeakMap<HTMLElement, Armed>();
const players = new WeakMap<HTMLElement, (el: HTMLElement) => void>();
const exiting = new WeakSet<HTMLElement>();

/** La reversa registrada para un panel; `ghostOut` la reutiliza en su copia. */
export function exitPlayerFor(node: HTMLElement): ((el: HTMLElement) => void) | undefined {
  return players.get(node);
}

/**
 * Arranca el viaje de apertura si procede (escritorio, modal centrado, tamaño
 * distinto de `full`, movimiento activo y control de origen visible). Devuelve
 * la limpieza: mata la línea de tiempo, deja de observar el cierre y devuelve
 * el control de origen a la vista.
 */
export function armModalMorph(node: HTMLElement): () => void {
  const already = armed.get(node);
  if (already) return already.cleanup;
  if (typeof window === "undefined" || motionOff()) return () => {};
  if (!window.matchMedia("(min-width: 768px)").matches) return () => {};
  if (node.dataset.variant !== "dialog" || node.dataset.size === "full") return () => {};
  if (node.dataset.state !== "open") return () => {};
  const originEl = usableOrigin();
  if (!originEl) return () => {};

  // La entrada CSS (`modal-in`) se apaga antes de medir: un solo dueño.
  node.setAttribute("data-morph", "");
  gsap.set(node, { clearProps: CLEAR });

  const to = boxOf(node);
  const from = boxOf(originEl);
  const items = Array.from(node.children) as HTMLElement[];

  // Estado inicial: el modal «es» el control. `xPercent/yPercent` mantienen el
  // centrado del CSS (`translate(-50%, -50%)`) mientras cambia el ancho.
  gsap.set(node, {
    xPercent: -50,
    yPercent: -50,
    x: from.cx - to.cx,
    y: from.cy - to.cy,
    width: from.w,
    height: from.h,
    borderRadius: from.radius,
    backgroundColor: solid(from.bg, to.bg),
    overflow: "hidden",
    opacity: 1,
  });
  gsap.set(items, { opacity: 0, y: 14 });
  gsap.set(originEl, { opacity: 0 });

  // Fuerza un frame con el estado inicial antes de arrancar.
  void node.offsetWidth;

  const contentDuration = 0.5 * (MORPH_SECONDS / ZIP_OPEN);
  const contentStagger = 0.06 * (MORPH_SECONDS / ZIP_OPEN);
  const contentDelay = 0.22 * (MORPH_SECONDS / ZIP_OPEN);

  const open = gsap.timeline({
    paused: true,
    onComplete: () => {
      gsap.set(node, { clearProps: CLEAR });
      gsap.set(items, { clearProps: "opacity,y" });
    },
  });
  open
    .to(
      node,
      {
        x: 0,
        width: to.w,
        height: to.h,
        borderRadius: to.radius,
        backgroundColor: to.bg,
        opacity: 1,
        duration: MORPH_SECONDS,
        ease: "expo.out",
      },
      0,
    )
    // El eje Y usa otra curva: el recorrido describe un arco suave, no una recta.
    .to(node, { y: 0, duration: MORPH_SECONDS * 1.1, ease: "power4.out" }, 0)
    .to(
      items,
      { opacity: 1, y: 0, duration: contentDuration, stagger: contentStagger, ease: "power3.out" },
      contentDelay,
    );

  /**
   * Reversa: del estado actual al control. Sirve al panel y a la copia de
   * `ghostOut` (cuando el padre desmonta el panel de golpe).
   */
  const playExit = (el: HTMLElement) => {
    if (exiting.has(el)) return;
    exiting.add(el);
    open.kill();

    const originNow = originEl.isConnected ? originEl : null;
    if (!originNow) {
      // El control desapareció: se apaga en el sitio, sin viaje roto.
      gsap.to(el, {
        opacity: 0,
        duration: MORPH_SECONDS,
        ease: "power2.in",
        onComplete: () => {
          gsap.set(el, { opacity: 0 });
          exiting.delete(el);
        },
      });
      return;
    }

    const current = boxOf(el);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Se fija el estado visual actual (sirve también a mitad de apertura).
    gsap.set(el, {
      xPercent: -50,
      yPercent: -50,
      x: current.cx - vw / 2,
      y: current.cy - vh / 2,
      width: current.w,
      height: current.h,
      borderRadius: current.radius,
      backgroundColor: current.bg,
      overflow: "hidden",
    });

    // El contenido se va primero y luego viaja la tarjeta, como el ZIP; todo
    // cabe en MORPH_SECONDS para que Radix no desmonte a mitad de vuelo.
    const scale = MORPH_SECONDS / (ZIP_CLOSE + ZIP_CLOSE_DELAY);
    const delay = ZIP_CLOSE_DELAY * scale;
    const travel = MORPH_SECONDS - delay;

    const exit = gsap.timeline({
      onComplete: () => {
        // Se oculta en el sitio, sin limpiar estilos: Radix tarda un par de
        // fotogramas en desmontar y reaparecería el modal entero en el centro.
        gsap.set(el, { opacity: 0 });
        gsap.set(originNow, { clearProps: "opacity" });
        exiting.delete(el);
      },
    });
    exit
      .to(items, {
        opacity: 0,
        y: 8,
        duration: 0.16 * scale,
        stagger: { each: 0.02 * scale, from: "end" },
        ease: "power2.in",
      }, 0)
      .to(
        el,
        {
          x: from.cx - vw / 2,
          width: from.w,
          height: from.h,
          borderRadius: from.radius,
          backgroundColor: solid(from.bg, current.bg),
          duration: travel,
          ease: "expo.inOut",
        },
        delay,
      )
      .to(el, { y: from.cy - vh / 2, duration: travel * 0.95, ease: "power3.inOut" }, delay)
      // El control reaparece justo debajo del modal, sin salto visible.
      .set(originNow, { opacity: 1 }, delay + travel - 0.03);
  };
  players.set(node, playExit);

  const watcher = new MutationObserver(() => {
    if (node.getAttribute("data-state") !== "closed") return;
    watcher.disconnect();
    playExit(node);
  });
  watcher.observe(node, { attributes: true, attributeFilter: ["data-state"] });

  let raf = 0;
  const cleanup = () => {
    cancelAnimationFrame(raf);
    open.kill();
    watcher.disconnect();
    if (armed.get(node)?.cleanup === cleanup) armed.delete(node);
    // El jugador de salida se conserva: `ghostOut` lo usa justo después.
    gsap.set(originEl, { clearProps: "opacity" });
  };
  armed.set(node, { cleanup });

  // El estado inicial se pinta un frame antes de arrancar: evita que el primer
  // fotograma visible sea ya a mitad de camino si el hilo estaba ocupado.
  raf = requestAnimationFrame(() => {
    if (armed.get(node)?.cleanup !== cleanup) return;
    gsap.ticker.tick();
    open.play(0);
  });

  return cleanup;
}

trackActivators();
