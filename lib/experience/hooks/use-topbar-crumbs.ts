"use client";

import { useSyncExternalStore } from "react";

/** Un paso de la ruta de la barra superior: con `href` es un enlace; el último es la página actual. */
export type TopbarCrumb = { label: string; href?: string };

/**
 * Ruta («Clientes › María Pérez») que una pantalla pone en la barra superior, en lugar del nombre de la sección. La barra la lee con
 * `useTopbarCrumbs`; la pantalla la fija con `<TopbarCrumbs>` y se quita sola al salir. Memoria del navegador, sin datos privados guardados.
 */
let current: readonly TopbarCrumb[] | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useTopbarCrumbs(): readonly TopbarCrumb[] | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}

/** Fija (o quita, con `null`) la ruta de la barra superior. Lo usa `<TopbarCrumbs>`; no se llama a mano. */
export function setTopbarCrumbs(items: readonly TopbarCrumb[] | null): void {
  current = items;
  emit();
}
