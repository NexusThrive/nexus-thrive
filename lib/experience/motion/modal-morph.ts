import { gsap } from "gsap";
import { MORPH_EASE as EASE } from "./morph-curves";
import { motionOff } from "./reduced";

/**
 * Viaje del modal centrado de escritorio, con la continuidad del Auri de la landing (`AuriAsk`): la superficie nace del control que
 * la abrió (mismo tamaño, posición, radio y color) y viaja en diagonal hasta el centro mientras se despliega. Nada se corta: el
 * control y la tarjeta se funden entre sí (como el texto de la píldora de Auri, que se desvanece mientras ella cambia de forma),
 * posición y tamaño crecen juntos con la misma curva, y el contenido entra mientras la tarjeta todavía llega. Al cerrar hace lo mismo al
 * revés, un poco más rápido.
 *
 * Anima `width`, `height`, `border-radius` y `background-color`, que el
 * contrato de movimiento reserva a `transform/opacity/filter/clip-path`. Es la
 * excepción documentada de este componente: sin cambiar el tamaño real no se
 * reproduce el efecto aprobado (ver packages/brand/docs/04-patrones/movimiento.md §1.3).
 *
 * Un solo dueño: mientras el motor vive, el CSS no anima la entrada ni la
 * salida (`data-morph`); solo sostiene la salida para que Radix espere a
 * desmontar (`modal-out-hold`).
 */

/** Duración del cierre. Debe coincidir con `modal-out-hold` del CSS (más 20 ms de margen). */
export const MORPH_SECONDS = 0.45;

/** Duración de la apertura (el contenido termina de entrar un poco después). */
export const MORPH_OPEN_SECONDS = 0.6;

const CLEAR = "xPercent,yPercent,x,y,width,height,borderRadius,backgroundColor,overflow,opacity,willChange";

/* Último control pulsado: de ahí «nace» el modal. Se registra desde que se
   carga el módulo porque el panel se monta después del clic. */
let lastActivator: WeakRef<HTMLElement> | null = null;
let tracking = false;

/**
 * Empieza a recordar el último botón o enlace pulsado, para que el modal pueda crecer desde él. Es seguro llamarla varias veces y no hace nada en el servidor.
 */
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

/**
 * Radio que se ve de verdad: el CSS limita el radio a la mitad del lado menor, pero el valor calculado de una píldora
 * (`rounded-full`) es enorme (9999 px o más). Si se interpola desde ese número, la tarjeta viaja como un círculo casi todo el
 * camino y no aterriza en sus esquinas; con el radio visible el paso de píldora a tarjeta (y de vuelta) es continuo.
 */
function visibleRadius(raw: string, w: number, h: number): string {
  const px = Number.parseFloat(raw);
  if (!Number.isFinite(px) || px <= 0) return "0px";
  return `${Math.min(px, Math.min(w, h) / 2)}px`;
}

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  return {
    w,
    h,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    radius: visibleRadius(cs.borderTopLeftRadius, w, h),
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
  // Ancho fijo del contenido mientras la tarjeta cambia de tamaño: así el texto
  // no se reacomoda (ni se parte en líneas) al crecer desde el botón.
  const widths = items.map((item) => item.offsetWidth);

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
    // Nace transparente sobre el control y se funde con él: si tapara el botón de golpe, su texto desaparecería en un corte.
    opacity: 0,
    // El navegador prepara la capa antes del primer fotograma: sin esto el arranque daba un tirón.
    willChange: "transform, width, height, opacity",
  });
  // `overflow: hidden` en el contenido mientras la tarjeta cambia de alto: el cuerpo con
  // scroll se comprime y mostraba una barra de desplazamiento aunque no la necesite.
  gsap.set(items, { opacity: 0, y: 8, width: (i: number) => widths[i], flexShrink: 0, overflow: "hidden" });
  // Fuerza un frame con el estado inicial antes de arrancar.
  void node.offsetWidth;

  const k = MORPH_OPEN_SECONDS;
  const open = gsap.timeline({
    paused: true,
    onComplete: () => {
      gsap.set(node, { clearProps: CLEAR });
      gsap.set(items, { clearProps: "opacity,y,width,flexShrink,overflow" });
    },
  });
  open
    // La tarjeta aparece encima del botón con su mismo color: solo se nota que el texto se desvanece. Ya opaca, el botón se
    // oculta debajo (sin que se vea) y la tarjeta queda sola durante todo el viaje.
    .to(node, { opacity: 1, duration: 0.18 * k, ease: EASE.out }, 0)
    .set(originEl, { opacity: 0 }, 0.18 * k)
    // Viaje en diagonal y crecimiento proporcional desde el botón: posición, tamaño y radio con la misma curva, así la forma
    // nunca se deforma (ni se abre primero a los lados) y todo llega a la vez.
    .to(node, { x: 0, y: 0, width: to.w, height: to.h, borderRadius: to.radius, duration: k, ease: EASE.glide }, 0)
    .to(node, { backgroundColor: to.bg, duration: 0.6 * k, ease: EASE.io }, 0.1 * k)
    // El contenido entra mientras la tarjeta todavía llega: nunca se ve vacía.
    .to(items, { opacity: 1, y: 0, duration: 0.55 * k, stagger: 0.035 * k, ease: EASE.out }, 0.4 * k);

  /**
   * Reversa: del estado actual al control. Sirve al panel y a la copia de
   * `ghostOut` (cuando el padre desmonta el panel de golpe).
   */
  const playExit = (el: HTMLElement) => {
    if (exiting.has(el)) return;
    exiting.add(el);
    open.kill();

    // La copia que se cierra va siempre por debajo de lo que se abre (otro diálogo o panel lateral).
    if (el.hasAttribute("data-ghost")) el.style.zIndex = "var(--z-ghost)";

    const originNow = originEl.isConnected ? originEl : null;
    // Si ya hay otro panel abierto (p. ej. un formulario lateral que se abre al elegir algo), no se viaja al botón:
    // la tarjeta se desvanece en el sitio y no cruza la pantalla por encima de lo nuevo.
    const another = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][data-state="open"]')).some((d) => d !== el && d !== node && !d.hasAttribute("data-ghost"));
    if (!originNow || another) {
      // El control desapareció u hay otro panel abierto: se apaga en el sitio, sin viaje roto.
      if (originNow) gsap.set(originNow, { clearProps: "opacity" });
      gsap.to(el, {
        opacity: 0,
        duration: another ? 0.18 : MORPH_SECONDS,
        ease: "power2.in",
        onComplete: () => {
          gsap.set(el, { opacity: 0 });
          exiting.delete(el);
        },
      });
      return;
    }

    const current = boxOf(el);
    // Contenido de ESTE panel (en la copia fantasma no es el del original).
    const content = Array.from(el.children) as HTMLElement[];
    const frozen = content.map((item) => item.offsetWidth);
    gsap.set(content, { width: (i: number) => frozen[i], flexShrink: 0, overflow: "hidden" });
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
      willChange: "transform, width, height, opacity",
    });

    // El mismo viaje al revés, un poco más rápido y dentro de `MORPH_SECONDS` para que Radix no desmonte a mitad de vuelo. La
    // tarjeta hace todo el recorrido opaca y llega convertida en el botón (su tamaño, radio y color); solo entonces el botón vuelve
    // debajo y la tarjeta se disuelve encima: lo único que cambia es que aparece su texto. El botón nunca surge de la nada.
    const T = MORPH_SECONDS;
    const travel = 0.76 * T;

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
      .to(content, { opacity: 0, y: 4, duration: 0.32 * T, stagger: { each: 0.015 * T, from: "end" }, ease: EASE.io }, 0)
      .to(el, { x: from.cx - vw / 2, y: from.cy - vh / 2, width: from.w, height: from.h, borderRadius: from.radius, duration: travel, ease: EASE.io }, 0)
      .to(el, { backgroundColor: solid(from.bg, current.bg), duration: 0.55 * T, ease: EASE.io }, 0.2 * T)
      .set(originNow, { opacity: 1 }, travel)
      .to(el, { opacity: 0, duration: T - travel, ease: EASE.io }, travel);
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
