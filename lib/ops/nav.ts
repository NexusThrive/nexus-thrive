import type { LucideIcon } from "lucide-react";
import {
  HeartPulse,
  Building2,
  ClipboardList,
  CreditCard,
  Headphones,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  ScrollText,
  Smile,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import type { NavGroup } from "@/lib/navigation/tenant-nav";
import type { PermissionKey } from "./permissions";

type OpsItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permiso para verlo; con una lista basta cualquiera (sin permiso = todo el equipo). */
  permission?: PermissionKey | PermissionKey[];
  /** Aparece solo cuando su fase ya está construida. */
  ready: boolean;
};

/**
 * Navegación del NEXUS Operations Center, en el orden del documento:
 * Operaciones · Clientes · Administración · Sistema. Cada integrante ve
 * solo lo que su rol permite; lo que aún no existe no se muestra.
 */
export const OPS_NAV: { label: string; items: OpsItem[] }[] = [
  {
    label: "Operaciones",
    items: [
      { key: "inicio", label: "Inicio", href: "/admin", icon: LayoutDashboard, ready: true },
      { key: "crm", label: "CRM comercial", href: "/admin/crm", icon: Target, permission: "leads.view", ready: true },
      { key: "negocios", label: "Negocios", href: "/admin/negocios", icon: Building2, permission: "accounts.view", ready: true },
      { key: "onboarding", label: "Onboarding", href: "/admin/onboarding", icon: ClipboardList, permission: "accounts.view", ready: true },
    ],
  },
  {
    label: "Clientes",
    items: [
      { key: "soporte", label: "Soporte", href: "/admin/soporte", icon: Headphones, permission: "tickets.view", ready: true },
      { key: "bandeja", label: "Bandeja", href: "/admin/bandeja", icon: Inbox, permission: "tickets.view", ready: true },
      { key: "satisfaccion", label: "Satisfacción", href: "/admin/satisfaccion", icon: Smile, permission: "tickets.view", ready: true },
      { key: "salud", label: "Salud de cuentas", href: "/admin/salud", icon: HeartPulse, permission: "accounts.view", ready: true },
      { key: "presence", label: "Presence Thrive", href: "/admin/presence", icon: Sparkles, permission: "presence.view", ready: true },
    ],
  },
  {
    label: "Administración",
    items: [
      { key: "planes", label: "Planes y módulos", href: "/admin/planes", icon: LayoutGrid, permission: ["catalog.edit", "pricing.edit"], ready: true },
      { key: "facturacion", label: "Facturación", href: "/admin/facturacion", icon: CreditCard, permission: "billing.view", ready: true },
      { key: "equipo", label: "Equipo y permisos", href: "/admin/equipo", icon: UsersRound, permission: "team.invite", ready: true },
      { key: "informes", label: "Informes", href: "/admin/informes", icon: LineChart, permission: "billing.view", ready: false },
    ],
  },
  {
    label: "Sistema",
    items: [{ key: "auditoria", label: "Auditoría", href: "/admin/auditoria", icon: ScrollText, permission: "audit.view", ready: true }],
  },
];

/** Grupos visibles para un integrante (sin vacíos). */
export function opsNavFor(permissions: readonly string[]): NavGroup[] {
  return OPS_NAV.map((g) => ({
    label: g.label,
    items: g.items
      .filter((i) => i.ready && (!i.permission || [i.permission].flat().some((p) => permissions.includes(p))))
      .map(({ key, label, href, icon }) => ({ key, label, href, icon })),
  })).filter((g) => g.items.length > 0);
}

/** Ítem activo por la ruta: el prefijo más largo ("/admin/negocios/x" → negocios). */
export function opsActiveKey(groups: NavGroup[], pathname: string): string | undefined {
  let best: { key: string; len: number } | undefined;
  for (const item of groups.flatMap((g) => g.items)) {
    const match = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (match && (!best || item.href.length > best.len)) best = { key: item.key, len: item.href.length };
  }
  return best?.key;
}
