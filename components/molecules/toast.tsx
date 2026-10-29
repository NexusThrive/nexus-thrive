"use client";

import * as React from "react";
import { AlertTriangle, Bell, Check, WifiOff, X } from "lucide-react";
import { IconTile } from "@/components/atoms/icon-tile";
import { requestNotificationsRefresh } from "@/lib/dashboard/notifications-client";
import { EASE_IN, motionOff, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Muestra "Deshacer"; se llama si el usuario lo pulsa. */
  undo?: () => void;
  /** ms antes de cerrarse solo (por defecto 4200). */
  duration?: number;
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
        variant: options.variant ?? "info",
        duration: options.duration ?? DEFAULT_DURATION,
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
      const exit = dx
        ? `translateX(${dx > 0 ? 120 : -120}%)`
        : mobile
          ? "translateY(-16px) scale(.96)"
          : "translateX(24px)";
      const animation = el.animate(
        [
          { opacity: 1, transform: el.style.transform || "none" },
          { opacity: 0, transform: exit },
        ],
        { duration: motionOff() ? 1 : 240, easing: EASE_IN, fill: "forwards" },
      );
      animation.onfinish = () => onGone(item.id);
    },
    [item.id, onGone],
  );

  React.useEffect(() => {
    const el = ref.current;
    const bar = barRef.current;
    if (!el || !bar) return;
    const mobile = window.innerWidth < 768;
    spring(el, mobile ? "y" : "x", mobile ? -28 : 48, 0, { stiffness: 360, damping: 22 });

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
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      window.clearTimeout(timer);
      progress?.cancel();
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [item.duration, dismiss]);

  return (
    <div
      ref={ref}
      className="pointer-events-auto relative flex touch-pan-y items-center gap-2.5 overflow-hidden rounded-lg border border-border bg-surface py-3 pl-3.5 pr-3 text-[13.5px] shadow-[var(--nx-shadow-overlay)]"
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
          className="p-1.5 text-[13px] font-semibold text-accent-text"
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
