import { Briefcase, Building2, Calendar, Crown, Flag, Gem, Heart, MapPin, Route, Star, Tag, UserRound, Users, Zap, type LucideIcon } from "lucide-react";

/**
 * Icono de un grupo o de una agrupación por su nombre guardado (`users`, `star`…). Un nombre que no se conoce cae en
 * «users». Los nombres son los de `GROUP_ICON_NAMES`: la lista que se ofrece al crear un grupo.
 */
const ICONS: Record<string, LucideIcon> = {
  users: Users,
  star: Star,
  crown: Crown,
  heart: Heart,
  gem: Gem,
  flag: Flag,
  zap: Zap,
  briefcase: Briefcase,
  tag: Tag,
  "map-pin": MapPin,
  route: Route,
  calendar: Calendar,
  "user-round": UserRound,
  "building-2": Building2,
};

/** Los que se pueden elegir para un grupo propio. */
export const GROUP_ICON_NAMES = ["users", "star", "crown", "heart", "gem", "flag", "zap", "briefcase", "tag", "map-pin"] as const;

const LABELS: Record<string, string> = {
  users: "Personas", star: "Estrella", crown: "Corona", heart: "Corazón", gem: "Gema", flag: "Bandera", zap: "Rayo",
  briefcase: "Maletín", tag: "Etiqueta", "map-pin": "Lugar",
};
export const groupIconLabel = (name: string) => LABELS[name] ?? name;

export function GroupIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICONS[name]) || Users;
  return <Icon aria-hidden="true" className={className ?? "size-3.5"} strokeWidth={1.8} />;
}
