import {
  BedDouble,
  Building2,
  Compass,
  Dumbbell,
  GraduationCap,
  Hammer,
  HardHat,
  HeartPulse,
  House,
  Landmark,
  Package,
  Plane,
  Scissors,
  Ship,
  Store,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { VerticalValue } from "@/lib/admin-catalogs";

/**
 * Identidad visual única de cada vertical: icono Lucide + tono semántico.
 *
 * Es la ÚNICA fuente de iconografía/color por vertical del panel
 * SuperAdmin (spec §2). Nunca usar emojis ni iconos improvisados en la UI
 * administrativa: todo vertical pasa por `getVerticalIcon`.
 */

/**
 * Tono dentro del sistema de marca: la identidad la da el ICONO, nunca un
 * color fuera de la paleta (Ink / Paper / oro / grafito).
 */
type VerticalTone = "gold" | "ink" | "graphite" | "muted";

const TONES: Record<VerticalTone, Omit<VerticalVisual, "icon">> = {
  gold: {
    color: "gold",
    iconClass: "text-gold-600",
    chipClass: "bg-gold-100 text-gold-700 ring-gold-600/20",
    barClass: "bg-gold-500",
  },
  ink: {
    color: "ink",
    iconClass: "text-graphite-900",
    chipClass: "bg-graphite-100 text-graphite-900 ring-graphite-900/15",
    barClass: "bg-graphite-900",
  },
  graphite: {
    color: "graphite",
    iconClass: "text-graphite-700",
    chipClass: "bg-graphite-200 text-graphite-800 ring-graphite-700/20",
    barClass: "bg-graphite-700",
  },
  muted: {
    color: "muted",
    iconClass: "text-muted-foreground",
    chipClass: "bg-surface-muted text-foreground ring-border",
    barClass: "bg-border-strong",
  },
};

export type VerticalVisual = {
  icon: LucideIcon;
  /** Tono de marca (nunca una paleta Tailwind cruda). */
  color: string;
  /** Color del icono en texto. */
  iconClass: string;
  /** Chip/badge: fondo + texto + ring. */
  chipClass: string;
  /** Barra/acento sólido. */
  barClass: string;
};

/** Icono + tono de marca por vertical. Los 16 rubros de la plataforma. */
const VERTICAL_VISUALS: Record<
  VerticalValue,
  { icon: LucideIcon; tone: VerticalTone }
> = {
  construction: { icon: HardHat, tone: "gold" },
  gym: { icon: Dumbbell, tone: "ink" },
  restaurant: { icon: Utensils, tone: "graphite" },
  beauty: { icon: Scissors, tone: "muted" },
  healthcare: { icon: HeartPulse, tone: "gold" },
  events: { icon: Landmark, tone: "ink" },
  carpentry: { icon: Hammer, tone: "graphite" },
  tourism_agency: { icon: Plane, tone: "muted" },
  hospitality: { icon: BedDouble, tone: "gold" },
  retail: { icon: Store, tone: "ink" },
  mechanic: { icon: Wrench, tone: "graphite" },
  education: { icon: GraduationCap, tone: "muted" },
  real_estate: { icon: House, tone: "gold" },
  hardware_store: { icon: Package, tone: "ink" },
  nautical_transport: { icon: Ship, tone: "graphite" },
  tour_guides: { icon: Compass, tone: "muted" },
};

const DEFAULT_VISUAL: VerticalVisual = {
  icon: Building2,
  ...TONES.muted,
};

/** Icono + tono de una vertical (con fallback neutro). */
export function getVerticalIcon(vertical: string): VerticalVisual {
  const entry = VERTICAL_VISUALS[vertical as VerticalValue];
  if (!entry) return DEFAULT_VISUAL;
  return { icon: entry.icon, ...TONES[entry.tone] };
}
