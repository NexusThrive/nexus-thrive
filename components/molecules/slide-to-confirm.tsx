"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { NMark } from "@/components/atoms/n-mark";
import { motionOff } from "@/lib/experience/motion/index";
import { cn } from "@/lib/utils";

/*
 * Deslizar para confirmar. Idea tomada del «Slide to confirm» de Bencho (MIT, bencho.dev/licence), reescrita sin librerías de
 * animación (regla del sistema: CSS y Web Animations) y con los tokens de Nexus.
 *
 * EL ASA SE VUELVE LA RESPUESTA. Al llegar al final no aparece un check en otro lugar: el asa se despliega hacia la izquierda y
 * llena la pista que venía cruzando, y la flecha que llevaba se vuelve el estado («Procesando…» con la N, luego listo). Un solo
 * objeto que cambia de forma; por eso no hace falta un segundo elemento que diga «hecho».
 *
 * El borde derecho no se mueve mientras se despliega: el ancho crece justo lo que el desplazamiento pierde (x → 0 y ancho →
 * GRIP + recorrido, con la misma duración y curva), así que el asa llega, se planta y se abre detrás de ella.
 */

/* Alto de la pista y margen del asa en los cuatro lados: el asa es un círculo de 44 dentro de 52. */
const H = 52;
const PAD = 4;
const GRIP = H - PAD * 2;

/*
 * EL FINAL ES LA CONFIRMACIÓN. Confirmar al 60 % permitiría dispararlo rozando el asa, que es justo lo que el gesto existe para
 * evitar. Se confirma solo al llegar al final (con un píxel de gracia por el redondeo).
 */
const GRACE = 1;

export function SlideToConfirm({
  label,
  doneLabel = "Listo",
  busyLabel = "Procesando…",
  busy = false,
  disabled = false,
  onConfirm,
  className,
}: {
  /** Texto de la pista («Cobrar $ 45.000»); el asa se llama «<texto>. Desliza hasta el final o pulsa Enter para confirmar.». */
  label: string;
  doneLabel?: ReactNode;
  busyLabel?: ReactNode;
  /** El servidor está guardando: la pista llena muestra la N girando. */
  busy?: boolean;
  disabled?: boolean;
  /** Se llama al llegar al final (o con Enter/Espacio en el asa). Si devuelve `false`, el asa vuelve al inicio. */
  onConfirm: () => void | boolean | Promise<void | boolean>;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [travel, setTravel] = useState(0);
  const [held, setHeld] = useState(false);
  const [done, setDone] = useState(false);
  /*
   * El agarre vivo en una ref, no en estado: cambia en cada cuadro del gesto. El desfase se toma en el PRIMER movimiento, no al
   * presionar: decidirlo al presionar hacía que un toque lejos del asa la teletransportara en el primer cuadro.
   */
  const grip = useRef<{ id: number; grab: number | null } | null>(null);
  const loose = useRef<(() => void) | null>(null);
  const live = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void }>({ move: () => {}, up: () => {} });

  // El recorrido sale del ancho real de la pista (se adapta al pie del modal y al celular).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setTravel(Math.max(0, el.clientWidth - PAD * 2 - GRIP));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => loose.current?.(), []);

  const confirm = async () => {
    if (done || disabled) return;
    setDone(true);
    setX(0);
    const ok = await onConfirm();
    // No se confirmó (p. ej. el servidor rechazó el cobro): el despliegue se recoge y el asa vuelve a su lugar.
    if (ok === false) setDone(false);
  };

  /*
   * EL ARRASTRE SE SIGUE EN LA VENTANA, y se escucha desde que se presiona (no en un efecto). La captura del puntero es
   * best-effort: el navegador la puede soltar a mitad del gesto y entonces la pista nunca oía el «soltar» y el asa quedaba
   * agarrada. En la ventana, soltar en cualquier lado termina el arrastre. Y en un efecto el primer movimiento de un gesto
   * rápido caía antes del commit de React y se perdía.
   */
  const watch = () => {
    loose.current?.();
    const onMove = (e: PointerEvent) => live.current.move(e);
    const onUp = (e: PointerEvent) => {
      live.current.up(e);
      loose.current?.();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    loose.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      loose.current = null;
    };
  };

  const local = (clientX: number) => clientX - (track.current?.getBoundingClientRect().left ?? 0);

  // Los manejadores se rehacen en cada render y los listeners de la ventana no: se alcanzan por una ref, al día tras cada commit.
  useLayoutEffect(() => {
    live.current = {
      move: (e) => {
        const g = grip.current;
        if (!g || g.id !== e.pointerId) return;
        const at = local(e.clientX);
        if (g.grab === null) {
          g.grab = at - x;
          return;
        }
        setX(Math.min(travel, Math.max(0, at - g.grab)));
      },
      up: (e) => {
        const g = grip.current;
        if (!g || g.id !== e.pointerId) return;
        grip.current = null;
        setHeld(false);
        if (x >= travel - GRACE && travel > 0) void confirm();
        else setX(0);
      },
    };
  });

  const down = (e: React.PointerEvent) => {
    if (done || disabled || e.button !== 0) return;
    grip.current = { id: e.pointerId, grab: null };
    setHeld(true);
    watch();
  };

  const reduced = typeof window !== "undefined" && motionOff();
  // Mientras se arrastra, el asa sigue al dedo sin transición; al soltar, vuelve o se despliega con la curva del sistema.
  const ease = held || reduced ? "none" : "transform var(--d3) var(--nx-ease-out), width var(--d3) var(--nx-ease-out)";
  const width = done ? GRIP + travel : GRIP;
  // La etiqueta se borra en la primera mitad del recorrido y la flecha se apaga al acercarse al final.
  const say = travel ? Math.max(0, 1 - x / (travel * 0.55)) : 1;
  const arrow = done ? 0 : travel ? Math.min(1, Math.max(0, 1 - (x - travel * 0.55) / (travel * 0.4))) : 1;

  return (
    <div
      ref={track}
      onPointerDown={down}
      data-held={held || undefined}
      data-done={done || undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        "relative h-[52px] min-w-0 touch-none select-none rounded-full border border-border bg-surface-muted",
        disabled && "opacity-55",
        className,
      )}
    >
      {/* El terreno ya cruzado: la misma tinta del asa, así el asa y lo cruzado son una sola cápsula (no una barra de progreso).
          Va encima de la etiqueta para BORRARLA con su borde redondo en vez de enturbiarla. */}
      <i
        aria-hidden="true"
        className="absolute bottom-1 left-1 top-1 z-(--z-raised) rounded-full bg-accent"
        style={{ width: done ? GRIP + travel : x + GRIP, transition: held || reduced ? "none" : "width var(--d3) var(--nx-ease-out)" }}
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-14 right-4 grid place-items-center text-ui font-medium text-muted-foreground" style={{ opacity: done ? 0 : say }}>
        <span className="block max-w-full truncate">{label}</span>
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-label={done ? (busy ? "Procesando" : "Confirmado") : `${label}. Desliza hasta el final o pulsa Enter para confirmar.`}
        // Solo el teclado confirma con el asa (Enter o Espacio, `detail` 0): con el mouse o el dedo hay que deslizar.
        onClick={(e) => {
          if (e.detail === 0) void confirm();
        }}
        className={cn(
          "absolute left-1 top-1 z-(--z-raised) h-11 overflow-hidden rounded-full bg-accent text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed",
          !done && !disabled && "cursor-grab",
          held && "cursor-grabbing",
        )}
        style={{ width, transform: `translateX(${done ? 0 : x}px)`, transition: ease }}
      >
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center" style={{ opacity: arrow }}>
          <ArrowRight className="size-5" strokeWidth={2} />
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center gap-2 whitespace-nowrap text-ui font-semibold transition-[opacity,transform] duration-(--d2) ease-(--nx-ease-out) motion-reduce:transition-none",
            done ? "scale-100 opacity-100" : "scale-75 opacity-0",
          )}
        >
          {busy ? <NMark size={16} state="loop" className="text-current" /> : <Check className="size-5" strokeWidth={2} />}
          {busy ? busyLabel : doneLabel}
        </span>
      </button>
    </div>
  );
}
