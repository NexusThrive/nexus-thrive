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
 * - PC: modal centrado de 520 px (`wide` = 640 px) o cajón lateral de 440 px
 *   (`drawer`) para fichas y detalle.
 *
 * Radix Dialog aporta el foco atrapado, Escape, el fondo que cierra y los
 * roles ARIA; las animaciones viven en el CSS Module (sin JS por cuadro).
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  trigger,
  drawer = false,
  wide = false,
  extraWide = false,
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
  drawer?: boolean;
  wide?: boolean;
  /** 768 px en PC: tablas y editores (APU, presupuesto). */
  extraWide?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; dy: number; lastY: number; lastT: number } | null>(null);

  function onPointerDown(event: React.PointerEvent) {
    if (event.button > 0 || window.innerWidth >= 768) return;
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
      onOpenChange?.(false);
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.scrim} />
        <DialogPrimitive.Content
          ref={contentRef}
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(event) => {
            // PC: al primer campo (o al marcado con data-autofocus). Móvil: al
            // panel, para no abrir el teclado sin que el usuario lo pida.
            const content = contentRef.current;
            if (!content) return;
            event.preventDefault();
            const field =
              window.innerWidth >= 768
                ? content.querySelector<HTMLElement>("[data-autofocus], input:not([type=hidden]), select, textarea")
                : null;
            (field ?? content).focus({ preventScroll: true });
          }}
          className={cn(
            styles.sheet,
            drawer && styles.drawer,
            wide && styles.wide,
            extraWide && styles.extraWide,
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
              className="grid size-10 shrink-0 place-items-center rounded-md text-foreground transition-colors hover:bg-surface-muted"
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
