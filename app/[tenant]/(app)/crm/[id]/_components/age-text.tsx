"use client";

import { useMinute } from "@/lib/use-minute";

/**
 * Edad calculada en el cliente (el "ahora" no puede leerse durante el render
 * del servidor). Se recalcula sola cada minuto.
 */
export default function AgeText({ birthDate }: { birthDate: string | null }) {
  const now = useMinute();
  if (!birthDate) {
    return null;
  }
  const age = Math.floor((now - Date.parse(`${birthDate}T12:00:00Z`)) / (365.25 * 86_400_000));
  if (!Number.isFinite(age)) {
    return null;
  }
  return <>{age} años</>;
}
