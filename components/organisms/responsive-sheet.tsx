"use client";

import { useRef, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./responsive-sheet.module.css";

/**
 * Panel adaptable NEXUS THRIVE (formularios, confirmaciones, detalle):
 *
 * - Móvil: hoja inferior que sube con un rebote y se cierra arrastrándola
 *   hacia abajo desde la barra o el encabezado (umbral 110 px o un gesto
 *   rápido); hacia arriba ofrece resistencia.
 * - PC: modal centrado (`size`: sm 440 · md 520 · lg 640 · xl 768 px) o
 *   panel lateral derecho (`drawer`, 440 px; `size="lg"` 560 px) para fichas,
 *   registros con varias secciones y detalle que conserva el contexto.
 *
 * Radix Dialog aporta el foco atrapado, Escape, el fondo que cierra, la
 * devolución del foco al control que lo abrió y los roles ARIA; las
 * animaciones viven en el CSS Module (sin JS por cuadro).
 *
 * Cuándo usar cada forma: docs/design/interaction-patterns.md. Para
 * formularios, preferir `FormDialog` / `FormDrawer` (form-sheet.tsx), que ya
 * traen pie, errores y bloqueo mientras se guarda.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  trigger,
  drawer = false,
  size,
  wide = false,
  extraWide = false,
  busy = false,
  className,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Botones de la parte inferior (en móvil ocupan todo el ancho). */
  footer?: ReactNode;
  /** Elemento que abre el panel (modo no controlado). */
  trigger?: ReactNode;
  /** Panel lateral derecho en PC (en móvil, hoja inferior casi a pantalla completa). */
  drawer?: boolean;
  /** Ancho en PC. Modal: sm 440 · md 520 (por defecto) · lg 640 · xl 768. Panel: md 440 · lg 560. */
  size?: "sm" | "md" | "lg" | "xl";
  /** @deprecated usar `size="lg"`. */
  wide?: boolean;
  /** @deprecated usar `size="xl"` (tablas y editores: APU, presupuesto). */
  extraWide?: boolean;
  /**
   * Hay una operación en curso: no se cierra con Escape, el fondo, la X ni
   * arrastrando, y el contenido queda `aria-busy`. Evita perder un guardado a
   * medias.
   */
  busy?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  // Control que tenía el foco al abrir. Radix solo devuelve el foco a su
  // propio `Trigger`; los paneles controlados (abiertos con `open`) lo
  // perdían al cerrar y el teclado volvía al inicio de la página.
  const returnFocus = useRef<HTMLElement | null>(null);
  const resolvedSize = size ?? (extraWide ? "xl" : wide ? "lg" : "md");
  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    onOpenChange?.(next);
  };
  const drag = useRef<{ y0: number; dy: number; lastY: number; lastT: number } | null>(null);

  function onPointerDown(event: React.PointerEvent) {
    if (event.button > 0 || busy || window.innerWidth >= 768) return;
    if ((event.target as Element).closest("button")) return;
    const el = contentRef.current;
    if (!el) return;
    drag.current = { y0: event.clientY, dy: 0, lastY: event.clientY, lastT: performance.now() };
    el.style.animation = "none";
    el.style.transition = "none";
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    const state = drag.current;
    const el = contentRef.current;
    if (!state || !el) return;
    state.dy = event.clientY - state.y0;
    const offset = state.dy < 0 ? state.dy * 0.18 : state.dy;
    el.style.transform = `translateY(${offset}px)`;
    state.lastY = event.clientY;
    state.lastT = performance.now();
  }

  function onPointerUp(event: React.PointerEvent) {
    const state = drag.current;
    const el = contentRef.current;
    if (!state || !el) return;
    drag.current = null;
    const velocity = (event.clientY - state.lastY) / Math.max(1, performance.now() - state.lastT);
    if (state.dy > 110 || (state.dy > 30 && velocity > 0.45)) {
      el.style.animation = "";
      handleOpenChange(false);
      return;
    }
    el.style.transition = "transform 480ms cubic-bezier(.32,1.35,.5,1)";
    el.style.transform = "translateY(0)";
    window.setTimeout(() => {
      el.style.transition = "";
      el.style.transform = "";
      el.style.animation = "";
    }, 500);
  }

  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.scrim} />
        <DialogPrimitive.Content
          ref={contentRef}
          {...(description ? {} : { "aria-describedby": undefined })}
          aria-busy={busy || undefined}
          data-size={resolvedSize}
          data-variant={drawer ? "drawer" : "dialog"}
          onOpenAutoFocus={(event) => {
            // PC: al primer campo (o al marcado con data-autofocus). Móvil: al
            // panel, para no abrir el teclado sin que el usuario lo pida.
            const content = contentRef.current;
            if (!content) return;
            const previous = document.activeElement;
            returnFocus.current = previous instanceof HTMLElement && !content.contains(previous) ? previous : null;
            event.preventDefault();
            const field =
              window.innerWidth >= 768
                ? content.querySelector<HTMLElement>("[data-autofocus], input:not([type=hidden]), select, textarea")
                : null;
            (field ?? content).focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            if (trigger) return; // Radix ya enfoca su Trigger.
            event.preventDefault();
            const target = returnFocus.current;
            returnFocus.current = null;
            if (target?.isConnected) target.focus({ preventScroll: true });
          }}
          className={cn(
            styles.sheet,
            drawer && styles.drawer,
            !drawer && resolvedSize === "sm" && styles.narrow,
            !drawer && resolvedSize === "lg" && styles.wide,
            !drawer && resolvedSize === "xl" && styles.extraWide,
            drawer && resolvedSize !== "md" && styles.drawerWide,
            className,
          )}
        >
          <div className={styles.grab} aria-hidden="true" {...dragHandlers}>
            <i />
          </div>
          <header className={styles.head} {...dragHandlers}>
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
              disabled={busy}
              className="grid size-10 shrink-0 place-items-center rounded-md text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X aria-hidden="true" className="size-[18px]" />
            </DialogPrimitive.Close>
          </header>
          <div className={styles.body}>{children}</div>
          {footer ? <footer className={styles.foot}>{footer}</footer> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Cierra el panel desde un botón del pie ("Cancelar"). */
export const SheetCloseButton = DialogPrimitive.Close;
