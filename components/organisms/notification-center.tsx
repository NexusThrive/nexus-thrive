"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Banknote, Bell, CalendarClock, Clock, MinusCircle } from "lucide-react";
import { flash, spring } from "@/lib/motion";
import { unreadCount, type AppNotification, type NotificationKind } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationKind, typeof Bell> = {
  payment: Banknote,
  expense: MinusCircle,
  booking: CalendarClock,
  membership: Clock,
};

const rel = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });
function when(iso: string): string {
  const min = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (Math.abs(min) < 1) return "Ahora";
  if (Math.abs(min) < 60) return rel.format(min, "minute");
  return rel.format(Math.round(min / 60), "hour");
}

const POLL_MS = 60_000;
const SEEN_EVENT = "nx:notifications-seen";

function readSeen(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribeSeen(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SEEN_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SEEN_EVENT, onChange);
  };
}

/**
 * Centro de notificaciones (AVI·02). La campana trae lo que pasó hoy en el
 * negocio (`load`); cuando llega algo nuevo se sacude (−28° con resorte
 * 380 · 6), el contador oro salta y, al abrir, las nuevas destellan. Lo
 * visto se recuerda en este navegador. Se actualiza cada minuto con la
 * pestaña visible.
 */
export function NotificationCenter({
  load,
  hrefFor,
  storageKey,
}: {
  load: () => Promise<AppNotification[]>;
  hrefFor: (path: string) => string;
  storageKey: string;
}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const lastSeen = useSyncExternalStore(subscribeSeen, () => readSeen(storageKey), () => null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<SVGSVGElement>(null);
  const countRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const prevUnread = useRef(0);

  const unread = unreadCount(items, lastSeen);

  const refresh = useCallback(async () => {
    try {
      setItems(await load());
    } catch {
      // sin red: se mantiene la última lista
    }
  }, [load]);

  useEffect(() => {
    const first = window.setTimeout(refresh, 0);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [refresh]);

  // Llegó algo nuevo: la campana se sacude y el contador salta.
  useEffect(() => {
    if (unread > prevUnread.current) {
      spring(bellRef.current, "rotate", -28, 0, { stiffness: 380, damping: 6 });
      spring(countRef.current, "scale", 1.6, 1, { stiffness: 600, damping: 12 });
    }
    prevUnread.current = unread;
  }, [unread]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    listRef.current?.querySelectorAll("[data-unread]").forEach((el) => flash(el));
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = () => {
    // Las citas de más tarde también quedan vistas.
    const latest = items.reduce((max, n) => (n.at > max ? n.at : max), new Date().toISOString());
    try {
      window.localStorage.setItem(storageKey, latest);
    } catch {
      // sin almacenamiento: queda visto solo en esta sesión de la página
    }
    window.dispatchEvent(new Event(SEEN_EVENT));
  };

  return (
    <div ref={rootRef} className="relative h-fit">
      <button
        type="button"
        aria-label={unread ? `Notificaciones, ${unread} nuevas` : "Notificaciones"}
        aria-expanded={open}
        data-press=""
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-10 place-items-center rounded-md transition-colors hover:bg-surface-muted"
      >
        <Bell ref={bellRef} aria-hidden="true" className="size-[18px] origin-top" strokeWidth={1.6} />
        {unread ? (
          <i
            ref={countRef}
            className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-[2px] bg-accent px-1 text-[10.5px] font-semibold not-italic text-ink"
          >
            {unread > 9 ? "9+" : unread}
          </i>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-[calc(100%+6px)] z-[75] w-[min(360px,calc(100vw-24px))] max-sm:fixed max-sm:inset-x-3 max-sm:top-[calc(var(--topbar-height)+env(safe-area-inset-top,0px)+6px)] max-sm:w-auto origin-top-right overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--nx-shadow-overlay)] motion-safe:animate-[nx-pop_.22s_var(--nx-ease-out)]"
        >
          <div className="flex items-center justify-between border-b border-border py-1.5 pl-3.5 pr-1.5">
            <b className="text-sm font-semibold">Notificaciones</b>
            <button
              type="button"
              disabled={!unread}
              onClick={markRead}
              className="rounded-md px-2 py-1 text-[12.5px] font-medium text-accent-text transition-colors hover:bg-surface-muted disabled:opacity-40"
            >
              Marcar leídas
            </button>
          </div>
          {items.length ? (
            <ul ref={listRef} className="max-h-[360px] overflow-y-auto">
              {items.map((n) => {
                const Icon = ICONS[n.kind];
                const isNew = !lastSeen || n.at > lastSeen;
                return (
                  <li key={n.id} data-unread={isNew || undefined} className="relative border-b border-border last:border-b-0">
                    <Link
                      href={hrefFor(n.href)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 py-2.5 pl-3.5 pr-8 text-[13px] transition-colors hover:bg-surface-muted"
                    >
                      <span className={cn("grid size-[30px] shrink-0 place-items-center rounded-md", n.kind === "expense" || n.kind === "membership" ? "bg-accent-subtle text-accent-text" : "bg-surface-muted")}>
                        <Icon aria-hidden="true" className="size-4" strokeWidth={1.7} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate font-medium">{n.title}</b>
                        <small className="block truncate text-xs text-muted-foreground">
                          {n.detail} · {when(n.at)}
                        </small>
                      </span>
                    </Link>
                    {isNew ? <i aria-hidden="true" className="absolute right-3.5 top-1/2 size-1.5 -translate-y-1/2 -skew-x-[24deg] bg-accent" /> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">Nada nuevo hoy. Aquí verás cobros, citas y vencimientos.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
