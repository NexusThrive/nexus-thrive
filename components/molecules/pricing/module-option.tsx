"use client";

import { Lock } from "lucide-react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { MODULE_ICONS } from "./module-icon";

export type ModuleOptionState = "base" | "locked" | "on" | "off";

/**
 * Fila de módulo con casilla: incluida (base, gris), bloqueada (Essential,
 * pide Elite), o seleccionable. La palomita se dibuja y la casilla rebota.
 */
export function ModuleOption({
  icon,
  name,
  description,
  price,
  state,
  index = 0,
  onToggle,
  onLocked,
}: {
  icon: string;
  name: string;
  description: string;
  /** Texto de precio a la derecha ("+$9", "Incluido"). */
  price: React.ReactNode;
  state: ModuleOptionState;
  index?: number;
  onToggle?: (on: boolean) => void;
  onLocked?: () => void;
}) {
  const Icon = MODULE_ICONS[icon];
  const on = state === "on" || state === "base";
  return (
    <label
      onClick={(e) => {
        if (state === "locked") {
          e.preventDefault();
          onLocked?.();
        }
      }}
      className={cn(
        "grid select-none grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2.5 transition-[border-color,background-color] duration-[250ms] max-[520px]:grid-cols-[auto_minmax(0,1fr)_auto] max-[520px]:gap-2.5",
        state === "base" && "cursor-default border-border bg-surface-muted",
        state === "locked" && "cursor-not-allowed border-border bg-surface",
        state === "off" && "cursor-pointer border-border bg-surface hover:border-border-input",
        state === "on" && "cursor-pointer border-[color-mix(in_oklab,var(--acc)_60%,var(--border))] bg-[color-mix(in_oklab,var(--accs)_55%,var(--surface))]",
        "nx-rise",
      )}
      style={{ ["--i" as string]: index * 0.45 }}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={on}
        disabled={state === "base" || state === "locked"}
        onChange={(e) => {
          spring(e.currentTarget.nextElementSibling, "scale", 0.82, 1, { stiffness: 600, damping: 12 });
          onToggle?.(e.currentTarget.checked);
        }}
      />
      <span
        className={cn(
          "grid size-5 place-items-center rounded-sm border-[1.5px] transition-colors duration-[250ms] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
          state === "base" && "border-muted-foreground bg-muted-foreground",
          state === "on" && "border-[var(--btnb)] bg-[var(--btnb)]",
          state === "off" && "border-border-input bg-surface",
          state === "locked" && "border-border-strong bg-surface-muted",
        )}
      >
        <svg viewBox="0 0 12 12" className="size-[13px] fill-none" aria-hidden="true">
          <path
            d="M2.5 6.2l2.4 2.4 4.6-5"
            pathLength={20}
            className={cn(
              "stroke-[2.6] [stroke-dasharray:20] transition-[stroke-dashoffset] duration-[350ms] ease-[var(--nx-ease-out)] [stroke-linecap:round] [stroke-linejoin:round]",
              state === "base" ? "stroke-surface" : "stroke-[var(--btnf,#fff)]",
              on ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:20]",
            )}
          />
        </svg>
      </span>
      <span className={cn("grid size-8 place-items-center rounded-md bg-surface-muted max-[520px]:hidden [&_svg]:size-4", state === "on" && "bg-surface text-[var(--acc)]", state === "locked" && "opacity-55")}>
        {Icon ? <Icon aria-hidden="true" /> : null}
      </span>
      <span className={cn("min-w-0 leading-tight", state === "locked" && "opacity-55")}>
        <b className="block text-[13.5px] font-semibold">{name}</b>
        <small className="block text-xs text-muted-foreground">{description}</small>
      </span>
      <span className={cn("whitespace-nowrap text-right font-mono text-[12.5px] tabular-nums", on && state !== "base" ? "text-foreground" : "text-muted-foreground")}>
        {state === "locked" ? (
          <span className="inline-flex items-center gap-1"><Lock className="size-3.5" />Elite</span>
        ) : (
          price
        )}
      </span>
    </label>
  );
}
