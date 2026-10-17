"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

function subscribe(onChange: () => void) {
  // Se alinea con el cambio de minuto y luego avisa cada minuto.
  let interval: number | undefined;
  const timeout = window.setTimeout(() => {
    onChange();
    interval = window.setInterval(onChange, MINUTE);
  }, MINUTE - (Date.now() % MINUTE));
  return () => {
    window.clearTimeout(timeout);
    window.clearInterval(interval);
  };
}

const snapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;

/**
 * Hora actual redondeada al minuto, que se actualiza sola (para "ahora" en
 * la agenda y "hoy"). Sin Date.now() durante el render.
 */
export function useMinute(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
