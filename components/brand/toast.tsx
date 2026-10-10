"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error" | "info";

type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-destructive",
  info: "text-foreground",
};

const VARIANT_ICONS: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TOAST_DURATION_MS = 4500;

/**
 * Notificaciones toast de marca (superficie única con sombra, clase `nx-toast`
 * definida en globals.css). Se usa para confirmar el éxito o informar errores
 * de las Server Actions en settings y bookings.
 *
 * <ToastProvider> envuelve el árbol cliente; cualquier hijo usa `useToast()`.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++counter.current;
      setItems((prev) => [...prev.slice(-3), { id, message, variant }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-[80] flex w-[min(320px,calc(100vw-3rem))] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => {
          const Icon = VARIANT_ICONS[item.variant];
          return (
            <div
              key={item.id}
              className={cn(
                "nx-toast pointer-events-auto flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-surface px-4 py-3",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn("h-4 w-4 shrink-0", VARIANT_STYLES[item.variant])}
              />
              <p className="min-w-0 flex-1 text-sm leading-5 text-foreground">
                {item.message}
              </p>
<button
                  type="button"
                  aria-label="Cerrar notificación"
                  onClick={() => dismiss(item.id)}
                  className="-m-1 shrink-0 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}