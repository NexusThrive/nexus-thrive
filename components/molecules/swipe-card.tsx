"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SwipeAction = {
  label: string;
  icon: LucideIcon;
  tone: "gold" | "ink" | "muted" | "danger";
  href?: string;
  /** Abre en otra pestaña (WhatsApp). */
  external?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

const ACTION_W = 68;

const TONES: Record<SwipeAction["tone"], string> = {
  gold: "bg-accent text-ink",
  ink: "bg-primary text-primary-foreground",
  muted: "bg-surface-hover text-foreground",
  danger: "bg-danger text-white",
};

/**
 * Tarjeta deslizable (DAT·06): en el celular se arrastra a la izquierda para
 * descubrir sus acciones; abre o cierra con un resorte y resiste un 25 % al
 * pasar del tope. Bloquea el eje al empezar (no estorba el scroll vertical)
 * y un arrastre no cuenta como toque sobre el contenido.
 */
export function SwipeCard({ actions, children, className }: { actions: SwipeAction[]; children: ReactNode; className?: string }) {
  const frontRef = useRef<HTMLDivElement>(null);
  const state = useRef({ x0: 0, y0: 0, dx: 0, open: false, lock: null as null | "x" | "y", down: false, moved: false });
  const width = actions.length * ACTION_W;

  const settle = (open: boolean) => {
    const el = frontRef.current;
    if (!el) return;
    state.current.open = open;
    el.style.transition = "transform 460ms cubic-bezier(.34,1.3,.64,1)";
    el.style.transform = `translateX(${open ? -width : 0}px)`;
  };

  return (
    <div className={cn("relative touch-pan-y overflow-hidden rounded-lg border border-border bg-surface-muted", className)}>
      <div className="absolute inset-y-0 right-0 flex" aria-label="Acciones">
        {actions.map(({ label, icon: Icon, tone, href, external, onClick, disabled }) => {
          const body = (
            <>
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </>
          );
          const cls = cn(
            "flex flex-col items-center justify-center gap-1 text-[11px] font-semibold",
            TONES[tone],
            disabled && "pointer-events-none opacity-50",
          );
          return href ? (
            <Link key={label} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={cls} style={{ width: ACTION_W }} onClick={() => settle(false)}>
              {body}
            </Link>
          ) : (
            <button key={label} type="button" disabled={disabled} className={cls} style={{ width: ACTION_W }} onClick={() => { settle(false); onClick?.(); }}>
              {body}
            </button>
          );
        })}
      </div>
      <div
        ref={frontRef}
        className="relative select-none bg-surface will-change-transform"
        onPointerDown={(e) => {
          const s = state.current;
          s.x0 = e.clientX;
          s.y0 = e.clientY;
          s.dx = 0;
          s.lock = null;
          s.down = true;
          s.moved = false;
          e.currentTarget.style.transition = "none";
        }}
        onPointerMove={(e) => {
          const s = state.current;
          if (!s.down) return;
          const mx = e.clientX - s.x0;
          const my = e.clientY - s.y0;
          if (s.lock == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
            s.lock = Math.abs(mx) > Math.abs(my) ? "x" : "y";
            if (s.lock === "x") e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (s.lock !== "x") return;
          let dx = mx + (s.open ? -width : 0);
          if (dx > 0) dx *= 0.2;
          if (dx < -width) dx = -width + (dx + width) * 0.25;
          s.dx = dx;
          s.moved = Math.abs(mx) > 6;
          e.currentTarget.style.transform = `translateX(${dx}px)`;
        }}
        onPointerUp={() => {
          const s = state.current;
          s.down = false;
          if (s.lock === "x") settle(s.dx < -width / 2);
        }}
        onPointerCancel={() => {
          state.current.down = false;
          settle(state.current.open);
        }}
        onClickCapture={(e) => {
          if (state.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            state.current.moved = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
