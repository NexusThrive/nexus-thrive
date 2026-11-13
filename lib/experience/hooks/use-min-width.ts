"use client";

import { useSyncExternalStore } from "react";

/** ¿La ventana mide al menos `px` de ancho? (`false` en el servidor y en el primer render.) */
export function useMinWidth(px: number): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(`(min-width: ${px}px)`);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(`(min-width: ${px}px)`).matches,
    () => false,
  );
}
