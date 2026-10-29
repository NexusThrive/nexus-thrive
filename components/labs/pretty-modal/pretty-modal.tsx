"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import sheet from "../../organisms/responsive-sheet.module.css";
import lab from "./pretty-modal.module.css";

/**
 * Laboratorio aislado (rama `PrettyModal`): copia del modal centrado de la app
 * con la animación de `PrettyModal` del ZIP, portada de GSAP a un componente
 * React + Radix.
 *
 * - La superficie (`.card`) conserva las medidas, la cabecera, el cuerpo y el
 *   pie del modal real (`responsive-sheet.module.css`), pero no usa su animación
 *   CSS ni el morfeo de `connectToActivator`.
 * - El viaje es el del ZIP: el modal «es» el origen (tamaño, posición, radio y
 *   color), crece hasta su sitio y vuelve exactamente a él al cerrar.
 * - **Nada de la app importa este archivo.** Si la prueba gusta, se decide cómo
 *   llevar la animación a `ResponsiveSheet` (con GSAP o reescrita con Web
 *   Animations) y si se acepta animar `width/height` como excepción al contrato
 *   de movimiento.
 */
export type PrettyModalOrigin = HTMLElement | { x: number; y: number } | null;

export type PrettyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Ancho en PC, igual que `ResponsiveSheet`. */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Origen explícito. Un elemento (viaja desde él) o un punto de viewport.
   * Si se omite, se usa el último botón/enlace pulsado (igual que la app).
   */
  origin?: PrettyModalOrigin;
  openDuration?: number;
  closeDuration?: number;
  openEase?: string;
  closeEase?: string;
};

/** Cierra el panel desde el pie («Cancelar»), con la animación de salida. */
export const PrettyModalClose = DialogPrimitive.Close;

const CLEAR = "x,y,width,height,borderRadius,backgroundColor,overflow,opacity";

/* Último control pulsado: de ahí «nace» el modal. Se registra desde que se
   carga el módulo porque el panel se monta después del clic. */
let lastActivator: WeakRef<HTMLElement> | null = null;
let tracking = false;
function trackActivators() {
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
trackActivators();

function reducedMotion() {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.dataset.motion === "off" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isElement(origin: PrettyModalOrigin): origin is HTMLElement {
  return typeof HTMLElement !== "undefined" && origin instanceof HTMLElement;
}

function solid(color: string | undefined, fallback: string) {
  return !color || color === "transparent" || color === "rgba(0, 0, 0, 0)" ? fallback : color;
}

type Box = {
  w: number;
  h: number;
  cx: number;
  cy: number;
  radius: string;
  bg: string;
  fade: boolean;
};

/** Igual que `_describeOrigin` del ZIP: elemento → punto → fundido desde el centro. */
function describeOrigin(
  origin: PrettyModalOrigin,
  card: HTMLElement,
  target: Omit<Box, "fade">,
): Box {
  if (isElement(origin) && origin.isConnected) {
    const r = origin.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      const cs = getComputedStyle(origin);
      return {
        w: r.width,
        h: r.height,
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        radius: cs.borderTopLeftRadius,
        bg: solid(cs.backgroundColor, target.bg),
        fade: false,
      };
    }
  }
  if (origin && typeof (origin as { x?: unknown }).x === "number" && typeof (origin as { y?: unknown }).y === "number") {
    const point = origin as { x: number; y: number };
    const color = getComputedStyle(card).getPropertyValue("--pm-origin").trim();
    return {
      w: 44,
      h: 44,
      cx: point.x,
      cy: point.y,
      radius: "22px",
      bg: color || target.bg,
      fade: false,
    };
  }
  return {
    ...target,
    w: target.w * 0.92,
    h: target.h * 0.92,
    fade: true,
  };
}

type AnimState = {
  busy: boolean;
  closing: boolean;
  timeline: gsap.core.Timeline | null;
  origin: PrettyModalOrigin;
};

export function PrettyModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  origin = null,
  openDuration = 0.75,
  closeDuration = 0.55,
  openEase = "expo.out",
  closeEase = "expo.inOut",
}: PrettyModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const state = useRef<AnimState>({ busy: false, closing: false, timeline: null, origin: null });
  const returnFocus = useRef<HTMLElement | null>(null);

  // Configuración y origen siempre al día sin reiniciar la animación al mover un control.
  const live = useRef({ origin, openDuration, closeDuration, openEase, closeEase });
  useLayoutEffect(() => {
    live.current = { origin, openDuration, closeDuration, openEase, closeEase };
  });

  const close = useCallback(() => {
    const card = cardRef.current;
    const st = state.current;
    if (!card || st.closing) return;

    const config = live.current;
    const reduce = reducedMotion();
    st.timeline?.kill();

    // Movimiento reducido: el panel se retira de inmediato, sin viaje ni fundidos.
    if (reduce) {
      const originEl = isElement(st.origin) ? st.origin : null;
      if (originEl) gsap.set(originEl, { clearProps: "opacity" });
      scrimRef.current?.removeAttribute("data-visible");
      // Se oculta en el sitio: Radix puede tardar un par de fotogramas en desmontar.
      gsap.set(card, { opacity: 0 });
      st.busy = false;
      st.closing = false;
      onOpenChange(false);
      return;
    }

    st.busy = true;
    st.closing = true;

    const items = Array.from(card.children) as HTMLElement[];
    const originEl = isElement(st.origin) ? st.origin : null;

    // Estado actual: sirve también si se cierra a mitad de la apertura.
    const x = Number(gsap.getProperty(card, "x")) || 0;
    const y = Number(gsap.getProperty(card, "y")) || 0;
    const r = card.getBoundingClientRect();
    const cs = getComputedStyle(card);
    const current = {
      w: card.offsetWidth,
      h: card.offsetHeight,
      cx: r.left - x + r.width / 2,
      cy: r.top - y + r.height / 2,
      radius: cs.borderTopLeftRadius,
      bg: cs.backgroundColor,
    };
    const from = describeOrigin(st.origin, card, current);

    gsap.set(card, {
      width: current.w,
      height: current.h,
      overflow: "hidden",
      borderRadius: current.radius,
      backgroundColor: current.bg,
    });
    scrimRef.current?.removeAttribute("data-visible");

    const d = config.closeDuration;
    const t0 = 0.12;

    st.timeline = gsap.timeline({
      onComplete: () => {
        // Se oculta en el sitio, sin limpiar estilos: Radix puede tardar un par
        // de fotogramas en desmontar y, al limpiarlos, reaparecería el modal
        // entero en el centro antes de desaparecer.
        gsap.set(card, { opacity: 0 });
        if (originEl) gsap.set(originEl, { clearProps: "opacity" });
        st.busy = false;
        st.closing = false;
        onOpenChange(false);
      },
    });
    st.timeline
      .to(items, {
        opacity: 0,
        y: 8,
        duration: 0.16,
        stagger: { each: 0.02, from: "end" },
        ease: "power2.in",
      }, 0)
      .to(card, {
        x: from.cx - current.cx,
        width: from.w,
        height: from.h,
        borderRadius: from.radius,
        backgroundColor: from.bg,
        opacity: from.fade ? 0 : 1,
        duration: d,
        ease: config.closeEase,
      }, t0)
      .to(card, {
        y: from.cy - current.cy,
        duration: d * 0.95,
        ease: "power3.inOut",
      }, t0);

    // El control original reaparece justo debajo del modal, sin salto visible.
    if (originEl && !from.fade) st.timeline.set(originEl, { opacity: 1 }, t0 + d - 0.03);
  }, [onOpenChange]);

  // Radix monta el portal en un commit posterior: la animación arranca cuando
  // la tarjeta entra al DOM (ref), no en un efecto de `open`. Así el primer
  // fotograma ya es el origen y no hay destello a tamaño final.
  const startOpen = useCallback((card: HTMLDivElement) => {
    const st = state.current;
    if (st.busy) return;

    const config = live.current;
    const reduce = reducedMotion();
    const explicit = config.origin;
    const origin: PrettyModalOrigin = explicit ?? lastActivator?.deref() ?? null;
    const originEl = isElement(origin) && origin.isConnected ? origin : null;

    st.origin = origin;
    st.busy = true;
    st.closing = false;
    st.timeline?.kill();
    returnFocus.current =
      originEl ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);

    gsap.set(card, { clearProps: CLEAR });

    // Estado final: el modal ya está en su sitio natural (centrado por la capa).
    const r = card.getBoundingClientRect();
    const cs = getComputedStyle(card);
    const to = {
      w: card.offsetWidth,
      h: card.offsetHeight,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      radius: cs.borderTopLeftRadius,
      bg: cs.backgroundColor,
    };
    const from = describeOrigin(origin, card, to);
    const items = Array.from(card.children) as HTMLElement[];

    // Movimiento reducido: sin viaje ni fundidos; el modal simplemente aparece.
    // Evita el fotograma intermedio con medidas mezcladas (ancho final, alto de origen).
    if (reduce) {
      scrimRef.current?.setAttribute("data-visible", "");
      st.busy = false;
      return;
    }

    // Estado inicial: el modal «es» el origen (mismo tamaño, posición, radio y color).
    gsap.set(card, {
      width: from.w,
      height: from.h,
      x: from.cx - to.cx,
      y: from.cy - to.cy,
      borderRadius: from.radius,
      backgroundColor: from.bg,
      overflow: "hidden",
      opacity: from.fade ? 0 : 1,
    });
    gsap.set(items, { opacity: 0, y: 14 });
    if (originEl && !from.fade) gsap.set(originEl, { opacity: 0 });

    // Fuerza un frame con el fondo transparente para que su transición arranque.
    void card.offsetWidth;
    scrimRef.current?.setAttribute("data-visible", "");

    const d = config.openDuration;
    st.timeline = gsap.timeline({
      paused: true,
      onComplete: () => {
        gsap.set(card, { clearProps: CLEAR });
        gsap.set(items, { clearProps: "opacity,y" });
        st.busy = false;
      },
    });
    st.timeline
      .to(card, {
        x: 0,
        width: to.w,
        height: to.h,
        borderRadius: to.radius,
        backgroundColor: to.bg,
        opacity: 1,
        duration: d,
        ease: config.openEase,
      }, 0)
      // El eje Y usa otra curva: el recorrido describe un arco suave, no una recta.
      .to(card, { y: 0, duration: d * 1.1, ease: "power4.out" }, 0)
      .to(items, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: "power3.out",
      }, 0.22);

    // El estado inicial se pinta un frame antes de arrancar: evita que el
    // primer fotograma visible sea ya a mitad de camino si el hilo estaba ocupado.
    requestAnimationFrame(() => {
      if (!st.timeline || cardRef.current !== card) return;
      gsap.ticker.tick();
      st.timeline.play(0);
    });
  }, []);

  const setCard = useCallback((node: HTMLDivElement | null) => {
    cardRef.current = node;
    if (node && node.parentElement?.getAttribute("data-state") === "open") startOpen(node);
  }, [startOpen]);

  useEffect(() => {
    const st = state.current;
    return () => {
      st.timeline?.kill();
      if (isElement(st.origin)) gsap.set(st.origin, { clearProps: "opacity" });
    };
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      close();
      return;
    }
    onOpenChange(true);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay ref={scrimRef} className={lab.scrim} />
        <DialogPrimitive.Content
          className={lab.content}
          {...(description ? {} : { "aria-describedby": undefined })}
          onClick={(event) => {
            // La capa que centra ocupa toda la pantalla: un clic fuera de la
            // tarjeta cae aquí. Radix marca la capa con `pointer-events: auto`
            // para el foco atrapado, así que el fondo se cierra desde aquí.
            if (event.target === event.currentTarget) close();
          }}
          onOpenAutoFocus={(event) => {
            const card = cardRef.current;
            if (!card) return;
            event.preventDefault();
            const field =
              window.innerWidth >= 768
                ? card.querySelector<HTMLElement>("[data-autofocus], input:not([type=hidden]), select, textarea")
                : null;
            (field ?? card).focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnFocus.current;
            returnFocus.current = null;
            if (target?.isConnected) target.focus({ preventScroll: true });
          }}
        >
          <div
            ref={setCard}
            tabIndex={-1}
            data-size={size}
            className={cn(lab.card, size === "sm" && lab.sm, size === "lg" && lab.lg, size === "xl" && lab.xl)}
          >
            <div className={sheet.grab} aria-hidden="true">
              <i />
            </div>
            <header className={sheet.head}>
              <div className="min-w-0">
                <DialogPrimitive.Title className="font-display text-lg font-semibold text-foreground">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="mt-0.5 text-[13px] text-muted-foreground">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
              </div>
              <DialogPrimitive.Close
                aria-label="Cerrar"
                className="grid size-10 shrink-0 place-items-center rounded-md text-foreground transition-colors hover:bg-surface-muted"
              >
                <X aria-hidden="true" className="size-[18px]" />
              </DialogPrimitive.Close>
            </header>
            <div className={sheet.body}>{children}</div>
            {footer ? <footer className={sheet.foot}>{footer}</footer> : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
