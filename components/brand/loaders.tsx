"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { N_PATH } from "./n-path";

/* ==========================================================================
   Cargas de interfaz NEXUS THRIVE (reference/nexus-loaders.html)
   Todas nacen de la N: el trazo recorre el contorno y el texto entra con
   enfoque, como THRIVE. Los valores (ms, curvas, tamaños) son los de la
   referencia; no aproximar.
   ========================================================================== */

export { N_PATH };

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/* --- NMark: base de todas las cargas -------------------------------------- */
export type NMarkState = "loop" | "prog" | "done";

export function NMark({
  size = 24,
  state = "loop",
  progress = 0,
  className,
}: {
  size?: number;
  state?: NMarkState;
  /** 0..1 (solo para state="prog"). */
  progress?: number;
  className?: string;
}) {
  const strokeWidth = size <= 24 ? 44 : size <= 40 ? 32 : 22;
  const dash = state === "prog" ? `${clamp01(progress)} 1` : undefined;

  return (
    <svg
      viewBox="362 157 800 800"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ ["--nx-sw" as string]: strokeWidth }}
      className={cn(
        "nx-n",
        state === "loop" && "loop",
        state === "prog" && "prog",
        state === "done" && "done",
        className,
      )}
    >
      <path className="o" d={N_PATH} />
      <path className="f" d={N_PATH} />
      <path className="t" d={N_PATH} pathLength={1} strokeDasharray={dash} />
    </svg>
  );
}

/* --- FocusText: el texto entra letra por letra --------------------------- */
export function FocusText({
  text,
  className,
  delayMs = 14,
  as = "span",
}: {
  text: string;
  className?: string;
  delayMs?: number;
  as?: React.ElementType;
}) {
  const Tag = as as React.ElementType;
  const hostRef = useRef<HTMLElement>(null);
  const lastRef = useRef<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (lastRef.current === text) return;

    if (lastRef.current === null || reduce) {
      host.textContent = "";
      const line = document.createElement("span");
      line.className = cn("line", "in");
      text.split("").forEach((char, i) => {
        const span = document.createElement("span");
        span.className = "ch";
        span.textContent = char;
        if (!reduce) span.style.transitionDelay = `${i * delayMs}ms`;
        line.appendChild(span);
      });
      host.appendChild(line);
      lastRef.current = text;
      return;
    }

    lastRef.current = text;
    host.querySelectorAll(".line").forEach((old) => {
      old.classList.add("out");
      setTimeout(() => old.remove(), 320);
    });
    const line = document.createElement("span");
    line.className = "line";
    text.split("").forEach((char, i) => {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = char;
      span.style.transitionDelay = `${i * delayMs}ms`;
      line.appendChild(span);
    });
    host.appendChild(line);
    void line.offsetWidth;
    line.classList.add("in");
  }, [text, delayMs, reduce]);

  return (
    <Tag
      ref={hostRef}
      className={cn("nx-fx", className)}
    >
      <span className="sr-only">{text}</span>
    </Tag>
  );
}

/* --- 1 · Spinner de marca ------------------------------------------------- */
export function BrandSpinner({
  size = 24,
  className,
  label = "Cargando",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-label={label} className={cn("inline-flex", className)}>
      <NMark size={size} state="loop" />
    </span>
  );
}

/* --- 3 · Barra de ruta ---------------------------------------------------- */
export function RouteBar() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "loading" | "finishing">("idle");
  const reduce = useReducedMotion();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      setPhase("loading");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;
    // Diferido a rAF para no encadenar renders dentro del efecto.
    const raf = requestAnimationFrame(() => setPhase("finishing"));
    const timer = setTimeout(() => setPhase("idle"), reduce ? 200 : 520);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [pathname, phase, reduce]);

  if (phase === "idle") return null;

  const finishing = phase === "finishing";

  return (
    <div
      className="nx-strip fixed inset-x-0 top-14 z-[70]"
      role="progressbar"
      aria-label="Cargando página"
    >
      <i
        className={cn("nx-bar", !finishing && "ind")}
        style={
          finishing
            ? { width: "100%", transition: "width .3s ease, opacity .4s ease" }
            : undefined
        }
      />
    </div>
  );
}

/* --- 5 · Panel que enfoca ------------------------------------------------- */
export function FocusPanel({
  loading,
  label = "Cargando datos",
  children,
  className,
}: {
  loading: boolean;
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("nx-pf relative", loading && "ld", className)}>
      <div className="cont">{children}</div>
      <div className="ov" aria-hidden={!loading}>
        {loading && (
          <>
            <NMark size={40} state="loop" />
            <FocusText text={label} className="text-sm text-muted-foreground" />
          </>
        )}
      </div>
    </div>
  );
}

/* --- 6 · Lista con revelado ---------------------------------------------- */
export function RevealRow({
  index = 0,
  children,
  className,
}: {
  index?: number;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.classList.add("in");
      return;
    }
    el.style.transitionDelay = `${index * 120}ms`;
    const raf = requestAnimationFrame(() => el.classList.add("in"));
    return () => cancelAnimationFrame(raf);
  }, [index, reduce]);

  return (
    <div ref={ref} className={cn("nx-row", className)}>
      {children}
    </div>
  );
}

/* --- 7 · Subida con progreso --------------------------------------------- */
export function UploadProgress({
  progress,
  filename,
  className,
}: {
  progress: number;
  filename: string;
  className?: string;
}) {
  const done = progress >= 1;
  return (
    <div
      className={cn("flex w-full items-center gap-3.5", className)}
      role="status"
      aria-live="polite"
    >
      <NMark size={40} state={done ? "done" : "prog"} progress={progress} />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-sm font-medium text-foreground">
          {filename}
        </b>
        <FocusText
          text={done ? "Subido correctamente" : "Subiendo…"}
          className="text-xs text-muted-foreground"
        />
      </div>
      <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
        {Math.round(clamp01(progress) * 100)} %
      </span>
    </div>
  );
}

/* --- 8 · Pasos de arranque ------------------------------------------------ */
export function BootSteps({
  steps,
  activeIndex,
  className,
}: {
  steps: string[];
  /** Índice de la etapa activa; las anteriores se muestran hechas. */
  activeIndex: number;
  className?: string;
}) {
  return (
    <ol
      className={cn("flex w-full flex-col gap-2.5", className)}
      role="status"
      aria-live="polite"
    >
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li
            key={step}
            className={cn(
              "flex items-center gap-3 text-sm",
              done || active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="grid size-5 shrink-0 place-items-center">
              {done ? (
                <NMark size={20} state="done" />
              ) : active ? (
                <NMark size={20} state="loop" />
              ) : (
                <span className="block size-2 border-[1.5px] border-muted-foreground" />
              )}
            </span>
            <span className="truncate">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* --- 9 · Estado con texto dinámico --------------------------------------- */
export function DynamicStatus({
  messages,
  intervalMs = 1600,
  className,
}: {
  messages: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(
      () => setIndex((value) => (value + 1) % messages.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [messages.length, intervalMs]);

  return (
    <div
      className={cn("flex items-center gap-3", className)}
      role="status"
      aria-live="polite"
    >
      <NMark size={26} state="loop" />
      <FocusText
        text={messages[index] ?? messages[0] ?? ""}
        className="text-sm text-muted-foreground"
      />
    </div>
  );
}

/* --- 10 · Cortes pulsantes ------------------------------------------------ */
export function PulsingSlashes({ className }: { className?: string }) {
  return (
    <span className={cn("nx-sl", className)} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export function IndeterminateBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("nx-strip", className)}
      role="progressbar"
      aria-label="Cargando"
    >
      <i className="nx-bar ind" />
    </div>
  );
}

/* --- 11 · Notificación de carga ------------------------------------------ */
export function LoadingToast({
  open,
  progress,
  label,
  doneLabel = "Exportado",
  className,
}: {
  open: boolean;
  progress: number;
  label: string;
  doneLabel?: string;
  className?: string;
}) {
  if (!open) return null;
  const pct = clamp01(progress);
  const done = pct >= 1;

  return (
    <div
      className={cn(
        "nx-toast fixed bottom-6 right-6 z-[80] flex min-w-[250px] items-center gap-3 overflow-hidden rounded-lg border border-border bg-surface px-4 py-3",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <NMark size={28} state={done ? "done" : "prog"} progress={pct} />
      <FocusText text={done ? doneLabel : label} className="text-sm text-foreground" />
      <span className="absolute inset-x-0 bottom-0 h-[3px] bg-border">
        <i
          className="block h-full bg-gold-600 transition-[width] duration-200"
          style={{
            width: `${pct * 100}%`,
            clipPath: "polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)",
          }}
        />
      </span>
    </div>
  );
}
