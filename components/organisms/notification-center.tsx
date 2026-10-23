"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Banknote, Bell, CalendarClock, Clock, MinusCircle, X } from "lucide-react";
import { flash, spring } from "@/lib/motion";
import { unreadCount, type AppNotification, type NotificationKind } from "@/lib/dashboard/notifications";
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
  onDismiss,
}: {
  load: () => Promise<AppNotification[]>;
  hrefFor: (path: string) => string;
  storageKey: string;
  /** Descartar (deslizando o con ×). Sin esto, no se pueden borrar. */
  onDismiss?: (id: string) => Promise<void> | void;
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
                  <DismissRow key={n.id} unread={isNew} onDismiss={onDismiss ? () => { setItems((xs) => xs.filter((x) => x.id !== n.id)); void onDismiss(n.id); } : undefined}>
                    <Link
                      href={hrefFor(n.href)}
                      draggable={false}
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
                    {isNew ? <i aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 size-1.5 -translate-y-1/2 -skew-x-[24deg] bg-accent group-hover:hidden" /> : null}
                  </DismissRow>
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


/**
 * Fila que se descarta deslizándola (más de 90 px a cualquier lado) o con la
 * × que aparece al pasar el cursor. Respeta "reducir movimiento".
 */
function DismissRow({ children, unread, onDismiss }: { children: React.ReactNode; unread: boolean; onDismiss?: () => void }) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);
  const out = (dir: 1 | -1) => {
    setLeaving(dir);
    window.setTimeout(() => onDismiss?.(), 180);
  };
  return (
    <li
      data-unread={unread || undefined}
      className="group relative overflow-hidden border-b border-border last:border-b-0"
      onClickCapture={(e) => {
        if (moved.current) {
          e.preventDefault();
          e.stopPropagation();
          moved.current = false;
        }
      }}
    >
      {onDismiss ? <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-danger/10 text-[12px] font-medium text-danger">Descartar</span> : null}
      <div
        className="relative bg-surface motion-safe:transition-transform motion-safe:duration-200"
        style={{ transform: leaving ? `translateX(${leaving * 110}%)` : dx ? `translateX(${dx}px)` : undefined, transitionDuration: dragging ? "0ms" : undefined, touchAction: "pan-y" }}
        onPointerDown={(e) => {
          if (!onDismiss || e.button !== 0) return;
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s || s.id !== e.pointerId) return;
          const x = e.clientX - s.x;
          if (!moved.current && Math.abs(x) > 8 && Math.abs(x) > Math.abs(e.clientY - s.y)) {
            moved.current = true;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (moved.current) setDx(x);
        }}
        onPointerUp={() => {
          const x = dx;
          start.current = null;
          setDragging(false);
          if (Math.abs(x) > 90) out(x > 0 ? 1 : -1);
          else setDx(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
      >
        {children}
        {onDismiss ? (
          <button type="button" aria-label="Descartar notificación" onClick={() => out(1)} className="absolute right-1.5 top-1/2 hidden size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground group-hover:grid focus-visible:grid">
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
    </li>
  );
}
