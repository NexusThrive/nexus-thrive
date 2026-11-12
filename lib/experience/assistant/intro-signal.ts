"use client";

import { useSyncExternalStore } from "react";
import type { EyeMood } from "@/components/atoms/eye-tracker";

/**
 * Lo que AURI está haciendo en el recorrido del Inicio (su cara, adónde mira y si habla). El recorrido lo lleva `AuriAssistant`; la
 * AURI grande del Inicio lo lee para poner esa cara mientras explica (así en escritorio hay una sola AURI, en su lugar del Inicio).
 * `null` cuando no hay recorrido. Memoria del módulo: no se guarda nada.
 */
export type IntroSignal = { mood: EyeMood; gaze: { x: number; y: number } | null; speaking: boolean } | null;

let current: IntroSignal = null;
const listeners = new Set<() => void>();

export function setIntroSignal(next: IntroSignal): void {
  const same = current === next || (current && next && current.mood === next.mood && current.speaking === next.speaking && current.gaze?.x === next.gaze?.x && current.gaze?.y === next.gaze?.y);
  if (same) return;
  current = next;
  listeners.forEach((l) => l());
}

export function useIntroSignal(): IntroSignal {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => current,
    () => null,
  );
}
