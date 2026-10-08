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

export type VerticalVisual = {
  icon: LucideIcon;
  /** Nombre base del color Tailwind (ej. "amber"). */
  color: string;
  /** Color del icono en texto (ej. "text-amber-600"). */
  iconClass: string;
  /** Chip/badge: fondo + texto + ring (ej. "bg-amber-50 text-amber-700 …"). */
  chipClass: string;
  /** Barra/acento sólido (ej. "bg-amber-500"). */
  barClass: string;
};

/** Paleta por vertical. Los 16 rubros del catálogo de la plataforma. */
const VERTICAL_VISUALS: Record<VerticalValue, VerticalVisual> = {
  construction: {
    icon: HardHat,
    color: "amber",
    iconClass: "text-amber-600",
    chipClass: "bg-amber-50 text-amber-700 ring-amber-600/20",
    barClass: "bg-amber-500",
  },
  gym: {
    icon: Dumbbell,
    color: "emerald",
    iconClass: "text-emerald-600",
    chipClass: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    barClass: "bg-emerald-500",
  },
  restaurant: {
    icon: Utensils,
    color: "orange",
    iconClass: "text-orange-600",
    chipClass: "bg-orange-50 text-orange-700 ring-orange-600/20",
    barClass: "bg-orange-500",
  },
  beauty: {
    icon: Scissors,
    color: "indigo",
    iconClass: "text-indigo-600",
    chipClass: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    barClass: "bg-indigo-500",
  },
  healthcare: {
    icon: HeartPulse,
    color: "rose",
    iconClass: "text-rose-600",
    chipClass: "bg-rose-50 text-rose-700 ring-rose-600/20",
    barClass: "bg-rose-500",
  },
  events: {
    icon: Landmark,
    color: "violet",
    iconClass: "text-violet-600",
    chipClass: "bg-violet-50 text-violet-700 ring-violet-600/20",
    barClass: "bg-violet-500",
  },
  carpentry: {
    icon: Hammer,
    color: "yellow",
    iconClass: "text-yellow-600",
    chipClass: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
    barClass: "bg-yellow-500",
  },
  tourism_agency: {
    icon: Plane,
    color: "teal",
    iconClass: "text-teal-600",
    chipClass: "bg-teal-50 text-teal-700 ring-teal-600/20",
    barClass: "bg-teal-500",
  },
  hospitality: {
    icon: BedDouble,
    color: "sky",
    iconClass: "text-sky-600",
    chipClass: "bg-sky-50 text-sky-700 ring-sky-600/20",
    barClass: "bg-sky-500",
  },
  retail: {
    icon: Store,
    color: "cyan",
    iconClass: "text-cyan-600",
    chipClass: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    barClass: "bg-cyan-500",
  },
  mechanic: {
    icon: Wrench,
    color: "slate",
    iconClass: "text-slate-600",
    chipClass: "bg-slate-100 text-slate-700 ring-slate-600/20",
    barClass: "bg-slate-500",
  },
  education: {
    icon: GraduationCap,
    color: "blue",
    iconClass: "text-blue-600",
    chipClass: "bg-blue-50 text-blue-700 ring-blue-600/20",
    barClass: "bg-blue-500",
  },
  real_estate: {
    icon: House,
    color: "purple",
    iconClass: "text-purple-600",
    chipClass: "bg-purple-50 text-purple-700 ring-purple-600/20",
    barClass: "bg-purple-500",
  },
  hardware_store: {
    icon: Package,
    color: "stone",
    iconClass: "text-stone-600",
    chipClass: "bg-stone-100 text-stone-700 ring-stone-600/20",
    barClass: "bg-stone-500",
  },
  nautical_transport: {
    icon: Ship,
    color: "sky",
    iconClass: "text-sky-600",
    chipClass: "bg-sky-50 text-sky-700 ring-sky-600/20",
    barClass: "bg-sky-500",
  },
  tour_guides: {
    icon: Compass,
    color: "lime",
    iconClass: "text-lime-600",
    chipClass: "bg-lime-50 text-lime-700 ring-lime-600/20",
    barClass: "bg-lime-500",
  },
};

const DEFAULT_VISUAL: VerticalVisual = {
  icon: Building2,
  color: "slate",
  iconClass: "text-slate-500",
  chipClass: "bg-slate-100 text-slate-600 ring-slate-500/20",
  barClass: "bg-slate-500",
};

/** Icono + tono de una vertical (con fallback neutro). */
export function getVerticalIcon(vertical: string): VerticalVisual {
  return (
    VERTICAL_VISUALS[vertical as VerticalValue] ?? DEFAULT_VISUAL
  );
}
