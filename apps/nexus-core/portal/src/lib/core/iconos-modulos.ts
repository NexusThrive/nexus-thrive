import { Dumbbell, LayoutGrid, Wallet, type LucideIcon } from "lucide-react";

/**
 * NÚCLEO — íconos de módulos (lucide, sin emojis).
 * El catálogo guarda el SLUG del ícono ("dumbbell", "wallet") y acá se
 * traduce al componente. Si un slug no existe → LayoutGrid por defecto.
 */
export const ICONOS_MODULO: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  wallet: Wallet,
};

export function iconoModulo(slug?: string | null): LucideIcon {
  if (slug && ICONOS_MODULO[slug]) return ICONOS_MODULO[slug];
  return LayoutGrid;
}