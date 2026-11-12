import type { AppNotification, NotificationKind } from "./notifications";

/**
 * Buzón de notificaciones (sección «Notificaciones»): la misma lista de la campana pero con historial, estado de lectura y archivo por
 * persona. Puras (sin DOM ni servidor) para probarlas: agrupar por día, filtrar y contar.
 */
export type InboxItem = AppNotification & {
  /** La persona ya la leyó (marcada a mano o al abrirla). */
  read: boolean;
  /** La archivó: sale del buzón normal y se ve en «Archivadas». */
  archived: boolean;
};

export type InboxFilter = "all" | "unread" | "urgent" | "archived";

/** Marca que se guarda con la clave de una notificación para saber que está leída (junto a las archivadas, por persona). */
export const READ_PREFIX = "read:";
export const readKey = (id: string): string => `${READ_PREFIX}${id}`;

export const KIND_LABEL: Record<NotificationKind, string> = {
  payment: "Cobros",
  expense: "Gastos",
  booking: "Citas",
  membership: "Membresías",
  customer: "Clientes",
  task: "Tareas",
  order: "Pedidos",
};

export type InboxQuery = { filter: InboxFilter; kind: NotificationKind | "all"; text: string };

/** Aplica el filtro de la pestaña, el tipo y la búsqueda. Sin «Archivadas», lo archivado no aparece. */
export function filterInbox(items: readonly InboxItem[], query: InboxQuery): InboxItem[] {
  const text = query.text.trim().toLocaleLowerCase("es");
  return items.filter((n) => {
    if (query.filter === "archived") {
      if (!n.archived) return false;
    } else if (n.archived) {
      return false;
    }
    if (query.filter === "unread" && n.read) return false;
    if (query.filter === "urgent" && n.severity !== "urgent") return false;
    if (query.kind !== "all" && n.kind !== query.kind) return false;
    if (text && !`${n.title} ${n.detail}`.toLocaleLowerCase("es").includes(text)) return false;
    return true;
  });
}

/** Cuántas hay en cada pestaña (para los contadores de los filtros). */
export function inboxCounts(items: readonly InboxItem[]): Record<InboxFilter, number> {
  const live = items.filter((n) => !n.archived);
  return {
    all: live.length,
    unread: live.filter((n) => !n.read).length,
    urgent: live.filter((n) => n.severity === "urgent").length,
    archived: items.length - live.length,
  };
}

/** Tipos presentes (para el filtro por tipo: solo se ofrecen los que hay). */
export function kindsPresent(items: readonly InboxItem[]): NotificationKind[] {
  return [...new Set(items.map((n) => n.kind))].sort((a, b) => KIND_LABEL[a].localeCompare(KIND_LABEL[b], "es"));
}

const dayKey = (iso: string, tz = "America/Bogota") => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
const dayLong = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" });

/** «Hoy», «Ayer» o «jueves, 12 de noviembre» (hora de Bogotá). */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const key = dayKey(iso);
  if (key === dayKey(now.toISOString())) return "Hoy";
  if (key === dayKey(new Date(now.getTime() - 86_400_000).toISOString())) return "Ayer";
  const text = dayLong.format(new Date(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Agrupa por día conservando el orden (lo más reciente primero). */
export function groupByDay<T extends { at: string }>(items: readonly T[], now: Date = new Date()): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = [];
  for (const item of [...items].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))) {
    const label = dayLabel(item.at, now);
    const last = groups.at(-1);
    if (last && last.day === label) last.items.push(item);
    else groups.push({ day: label, items: [item] });
  }
  return groups;
}
