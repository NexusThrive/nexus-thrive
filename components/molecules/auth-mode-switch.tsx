"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type AuthMode = "sign-in" | "sign-up";

/**
 * Selector Iniciar sesión / Crear cuenta: dos enlaces (cada modo es su URL)
 * con la pastilla blanca que se desliza con rebote al cambiar.
 */
export function AuthModeSwitch({ mode }: { mode: AuthMode }) {
  const links: { mode: AuthMode; href: string; label: string }[] = [
    { mode: "sign-in", href: "/sign-in", label: "Iniciar sesión" },
    { mode: "sign-up", href: "/sign-up", label: "Crear cuenta" },
  ];
  return (
    <nav
      aria-label="Acceso"
      className="relative mb-[26px] grid grid-cols-2 rounded-md border border-border bg-surface-muted p-[3px]"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-sm bg-surface shadow-[0_1px_2px_rgba(0,0,0,.08),0_0_0_1px_var(--border)] transition-transform duration-[460ms] ease-[var(--nx-ease-spring)]",
          mode === "sign-up" && "translate-x-full",
        )}
      />
      {links.map((link) => (
        <Link
          key={link.mode}
          href={link.href}
          aria-current={link.mode === mode ? "page" : undefined}
          className="relative z-10 grid h-9 place-items-center rounded-sm text-[13.5px] font-medium text-muted-foreground transition-colors duration-[250ms] aria-[current=page]:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
