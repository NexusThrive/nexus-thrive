"use client";

import { useEffect } from "react";
import { readSection, writeSection } from "./section-cache";

/** Lo último que se pintó de una sección, o `null` (primera visita, caducó o cambió la persona o el negocio). */
export function readSnapshot<T>(key: string): T | null {
  return readSection<T>(key)?.data ?? null;
}

/**
 * La sección guarda sus datos ya pintados para la próxima vez que se abra (se leen con `readSnapshot` desde su `loading.tsx`).
 * Solo datos serializables, y solo cuando son los definitivos (no el esqueleto ni lo que aún llega).
 */
export function useRememberSection(key: string, data: unknown, enabled = true): void {
  useEffect(() => {
    if (enabled) writeSection(key, data);
  }, [key, data, enabled]);
}
