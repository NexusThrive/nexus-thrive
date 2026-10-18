"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { withThemeSweep } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Modo claro/oscuro por clase `dark` en <html> (sin dependencias extra).
 * Por defecto: claro (`light`); solo se activa `dark` si el usuario lo eligió.
 * El script de `themeInitScript` se inyecta antes del render para evitar el
 * destello; este toggle solo cambia la clase y persiste la preferencia.
 */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "nx-theme";

export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="dark"){t="light"}if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export const THEME_EVENT = "nx-theme-change";

/* El tema vive en la clase `dark` de <html> (fuente de verdad), así que lo
   leemos con useSyncExternalStore en vez de duplicarlo en estado. */
function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerTheme(): Theme {
  return "light";
}

/** Cambia el tema con el barrido diagonal y guarda la preferencia. */
export function setTheme(next: Theme): void {
  withThemeSweep(() => {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* modo privado: la clase sigue aplicándose en memoria */
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  });
}

/** Lee el tema actual (clase `dark` de <html>) y se suscribe a sus cambios. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerTheme);
}

export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useTheme() === "dark";

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      data-press=""
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={isDark}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-md text-foreground transition-colors duration-200",
        "hover:bg-surface-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-[18px]" aria-hidden="true" strokeWidth={1.6} />
      ) : (
        <Moon className="size-[18px]" aria-hidden="true" strokeWidth={1.6} />
      )}
    </button>
  );
}
