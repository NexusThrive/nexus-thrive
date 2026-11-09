"use client";

import * as React from "react";
import { AlertTriangle, Bell, Check, ReceiptText, WifiOff, X } from "lucide-react";
import { IconTile } from "@/components/atoms/icon-tile";
import { requestNotificationsRefresh } from "@/lib/experience/dashboard/notifications-client";
import { EASE_IN, motionOff, spring } from "@/lib/experience/motion/index";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Muestra "Deshacer"; se llama si el usuario lo pulsa. */
  undo?: () => void;
  /** ms antes de cerrarse solo (por defecto 4200; con `receipt`, 8000). */
  duration?: number;
  /**
   * Comprobante recién generado (un cobro): el aviso es un recibo pequeño que sube desde abajo a la derecha y, al ocultarse, baja
   * por el mismo camino. `actions` lo acompañan (p. ej. «Compartir» y «Ver»).
   */
  receipt?: { total: string; concept: string; client: string; reference: string };
  actions?: { label: string; onClick: () => void | Promise<void>; icon?: React.ComponentType<{ className?: string }> }[];
};

type ToastItem = Required<Pick<ToastOptions, "title" | "variant" | "duration">> &
  Omit<ToastOptions, "title" | "variant" | "duration"> & { id: number };

type ToastContextValue = {
  /** `toast("Guardado", "success")` o `toast({ title, description, undo })`. */
  toast: (input: string | ToastOptions, variant?: ToastVariant) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 4200;
const RECEIPT_DURATION = 8000;

const ICONS = {
  success: { icon: Check, tone: "success" },
  error: { icon: AlertTriangle, tone: "danger" },
  info: { icon: Bell, tone: "neutral" },
  warning: { icon: WifiOff, tone: "gold" },
} as const;

/**
 * Notificaciones NEXUS THRIVE. `<ToastProvider>` envuelve el árbol cliente y
 * cualquier hijo llama `useToast().toast(...)`. Arriba al centro en móvil y
 * abajo a la derecha desde 768 px; entran con un resorte, una barra oro marca
 * el tiempo (se pausa con el cursor encima), se descartan deslizándolas y
 * nunca hay más de tres.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>((input, variant) => {
    const options: ToastOptions = typeof input === "string" ? { title: input, variant } : input;
    // Un éxito suele ser un cobro, un gasto o un alta: la campana se actualiza al instante.
    if (options.variant === "success") window.setTimeout(requestNotificationsRefresh, 0);
    const id = ++counter.current;
    setItems((prev) => [
      ...prev.slice(-(MAX_VISIBLE - 1)),
      {
        id,
        title: options.title,
        description: options.description,
        undo: options.undo,
        receipt: options.receipt,
        actions: options.actions,
        variant: options.variant ?? (options.receipt ? "success" : "info"),
        duration: options.duration ?? (options.receipt ? RECEIPT_DURATION : DEFAULT_DURATION),
      },
    ]);
  }, []);

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed left-1/2 top-[calc(68px+env(safe-area-inset-top,0px))] z-(--z-toast) flex w-[min(380px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-2 md:bottom-[calc(20px+env(safe-area-inset-bottom,0px))] md:left-auto md:right-5 md:top-auto md:translate-x-0"
      >
        {items.map((item) => (
          <Toast key={item.id} item={item} onGone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onGone }: { item: ToastItem; onGone: (id: number) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLElement>(null);
  const gone = React.useRef(false);
  const { icon: Icon, tone } = ICONS[item.variant];

  const dismiss = React.useCallback(
    (dx = 0) => {
      const el = ref.current;
      if (!el || gone.current) return;
      gone.current = true;
      const mobile = window.innerWidth < 768;
      // El comprobante se va por donde vino (baja); los demás, hacia el borde.
      const exit = dx
        ? `translateX(${dx > 0 ? 120 : -120}%)`
        : mobile
          ? "translateY(-16px) scale(.96)"
          : item.receipt
            ? "translateY(48px) scale(.98)"
            : "translateX(24px)";
      const animation = el.animate(
        [
          { opacity: 1, transform: el.style.transform || "none" },
          { opacity: 0, transform: exit },
        ],
        { duration: motionOff() ? 1 : item.receipt ? 320 : 240, easing: EASE_IN, fill: "forwards" },
      );
      animation.onfinish = () => onGone(item.id);
    },
    [item.id, item.receipt, onGone],
  );

  React.useEffect(() => {
    const el = ref.current;
    const bar = barRef.current;
    if (!el || !bar) return;
    const mobile = window.innerWidth < 768;
    // El comprobante sube desde abajo (sale de la «impresora»); los demás entran desde el borde.
    if (item.receipt && !mobile) spring(el, "y", 56, 0, { stiffness: 260, damping: 24 });
    else spring(el, mobile ? "y" : "x", mobile ? -28 : 48, 0, { stiffness: 360, damping: 22 });

    let remaining = item.duration;
    let startedAt = Date.now();
    let timer = window.setTimeout(() => dismiss(), remaining);
    const progress = motionOff()
      ? null
      : bar.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
          duration: item.duration,
          easing: "linear",
          fill: "forwards",
        });

    const pause = () => {
      window.clearTimeout(timer);
      remaining -= Date.now() - startedAt;
      progress?.pause();
    };
    const resume = () => {
      startedAt = Date.now();
      progress?.play();
      timer = window.setTimeout(() => dismiss(), remaining);
    };

    // Deslizar para descartar.
    let x0: number | null = null;
    let dx = 0;
    const down = (e: PointerEvent) => {
      if ((e.target as Element).closest("button")) return;
      x0 = e.clientX;
      dx = 0;
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (x0 == null) return;
      dx = e.clientX - x0;
      el.style.transform = `translateX(${dx}px)`;
      el.style.opacity = String(1 - Math.min(0.7, Math.abs(dx) / 260));
    };
    const up = () => {
      if (x0 == null) return;
      x0 = null;
      if (Math.abs(dx) > 80) {
        dismiss(dx);
        return;
      }
      el.style.transition = "transform .4s cubic-bezier(.34,1.4,.64,1), opacity .3s";
      el.style.transform = "";
      el.style.opacity = "";
      window.setTimeout(() => (el.style.transition = ""), 420);
    };

    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    // Con teclado también se pausa mientras el foco está dentro (tiempo ajustable, WCAG 2.2.1).
    const focusIn = () => pause();
    const focusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) resume();
    };
    el.addEventListener("focusin", focusIn);
    el.addEventListener("focusout", focusOut);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      window.clearTimeout(timer);
      progress?.cancel();
      el.removeEventListener("focusin", focusIn);
      el.removeEventListener("focusout", focusOut);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [item.duration, item.receipt, dismiss]);

  if (item.receipt) {
    const r = item.receipt;
    return (
      <div ref={ref} className="pointer-events-auto relative touch-pan-y overflow-hidden rounded-lg border border-border bg-surface text-ui shadow-[var(--nx-shadow-overlay)]">
        <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3">
          <IconTile tone="success" className="size-[26px] [&_svg]:size-4">
            <ReceiptText />
          </IconTile>
          <p className="min-w-0 flex-1 font-semibold text-foreground">{item.title}</p>
          <button
            type="button"
            aria-label="Cerrar comprobante"
            onClick={() => dismiss()}
            className="-m-1 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
        {/* El recibo: corte punteado, total grande, concepto y cliente, número. */}
        <div className="mx-3.5 grid gap-1 border-t border-dashed border-border pb-3 pt-2.5">
          <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{r.total}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.concept} · {r.client}
          </p>
          <p className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Recibo {r.reference}</p>
        </div>
        {item.actions?.length ? (
          <div className="flex justify-end gap-1 border-t border-border px-2.5 py-1.5">
            {item.actions.map(({ label, onClick, icon: ActionIcon }) => (
              <button
                key={label}
                type="button"
                onClick={async () => {
                  await onClick();
                  dismiss();
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-ui font-semibold text-accent-text outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                {ActionIcon ? <ActionIcon aria-hidden="true" className="size-3.5" /> : null}
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <i ref={barRef} aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="pointer-events-auto relative flex touch-pan-y items-center gap-2.5 overflow-hidden rounded-lg border border-border bg-surface py-3 pl-3.5 pr-3 text-ui shadow-[var(--nx-shadow-overlay)]"
    >
      <IconTile tone={tone} className="size-[26px] [&_svg]:size-4">
        <Icon />
      </IconTile>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{item.title}</p>
        {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
      </div>
      {item.undo ? (
        <button
          type="button"
          onClick={() => {
            item.undo?.();
            dismiss();
          }}
          className="p-1.5 text-ui font-semibold text-accent-text"
        >
          Deshacer
        </button>
      ) : (
        <button
          type="button"
          aria-label="Cerrar notificación"
          onClick={() => dismiss()}
          className="-m-1 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
      <i
        ref={barRef}
        aria-hidden="true"
        className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent")}
      />
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}
