"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Banknote, BellRing, CalendarClock, Check, CheckCheck, CheckSquare, Clock, ExternalLink, Inbox, MinusCircle, MoreHorizontal, PackageCheck, Search, UserRoundPlus, X } from "lucide-react";
import { Select } from "@/components/atoms/select";
import { Switch } from "@/components/atoms/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { EmptyState } from "@/components/molecules/empty-state";
import { useToast } from "@/components/molecules/toast";
import { SEVERITY_LABEL, type NotificationKind } from "@/lib/experience/dashboard/notifications";
import { KIND_LABEL, filterInbox, groupByDay, inboxCounts, kindsPresent, type InboxFilter, type InboxItem } from "@/lib/experience/dashboard/inbox";
import { showDesktopNotification, useDesktopNotifications } from "@/lib/experience/dashboard/desktop-notifications";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationKind, typeof Banknote> = {
  payment: Banknote,
  expense: MinusCircle,
  booking: CalendarClock,
  membership: Clock,
  customer: UserRoundPlus,
  task: CheckSquare,
  order: PackageCheck,
};

const FILTERS: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "Sin leer" },
  { value: "urgent", label: "Urgentes" },
  { value: "archived", label: "Archivadas" },
];

const hour = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });
const POLL_MS = 30_000;

/**
 * El buzón de notificaciones: filtros (todas, sin leer, urgentes, archivadas), por tipo y por texto; agrupadas por día; cada una se lee,
 * se archiva o se abre. Arriba, el interruptor de los avisos de escritorio. Los cambios se ven al instante y se guardan por detrás (y se
 * revierten con un aviso si fallan). Se actualiza sola cada 30 s mientras la pestaña está a la vista.
 */
/** Lo que el buzón le pide al servidor (la página le pasa las acciones reales; las historias, unas de muestra). */
export type InboxActions = {
  load: (slug: string) => Promise<InboxItem[]>;
  setRead: (slug: string, ids: string[], read: boolean) => Promise<void>;
  setArchived: (slug: string, ids: string[], archived: boolean) => Promise<void>;
};

export default function InboxView({ slug, initial, actions }: { slug: string; initial: InboxItem[]; actions: InboxActions }) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [kind, setKind] = useState<NotificationKind | "all">("all");
  const [text, setText] = useState("");
  const [, start] = useTransition();

  const refresh = useCallback(async () => {
    try {
      setItems(await actions.load(slug));
    } catch {
      /* sin red: se queda lo último */
    }
  }, [slug, actions]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  /** Aplica el cambio al instante y lo guarda; si falla, vuelve a lo anterior. */
  const mutate = (ids: string[], patch: Partial<Pick<InboxItem, "read" | "archived">>, save: () => Promise<void>, failure: string) => {
    const before = items;
    setItems((list) => list.map((n) => (ids.includes(n.id) ? { ...n, ...patch } : n)));
    start(async () => {
      try {
        await save();
      } catch {
        setItems(before);
        toast(failure, "error");
      }
    });
  };
  const setRead = (ids: string[], read: boolean) => mutate(ids, { read }, () => actions.setRead(slug, ids, read), "No se pudo guardar. Inténtalo de nuevo.");
  const setArchived = (ids: string[], archived: boolean) =>
    mutate(ids, archived ? { archived, read: true } : { archived }, async () => {
      await actions.setArchived(slug, ids, archived);
      if (archived) await actions.setRead(slug, ids, true);
    }, "No se pudo guardar. Inténtalo de nuevo.");

  const counts = useMemo(() => inboxCounts(items), [items]);
  const kinds = useMemo(() => kindsPresent(items), [items]);
  const shown = useMemo(() => filterInbox(items, { filter, kind, text }), [items, filter, kind, text]);
  const groups = useMemo(() => groupByDay(shown), [shown]);
  const unreadIds = useMemo(() => items.filter((n) => !n.archived && !n.read).map((n) => n.id), [items]);

  const open = (n: InboxItem) => {
    if (!n.read) setRead([n.id], true);
    router.push(`/${slug}${n.href}`);
  };

  return (
    <div className="grid gap-5">
      <DesktopCard slug={slug} />

      <div className="flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn("inline-flex h-11 items-center gap-2 rounded-full border px-4 text-ui font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", filter === f.value ? "border-transparent bg-accent text-ink" : "border-border/60 bg-card text-foreground hover:bg-surface-muted")}
            >
              {f.label}
              <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", filter === f.value ? "bg-ink/10" : "bg-surface-muted text-muted-foreground")}>{counts[f.value]}</span>
            </button>
          ))}
        </div>
        {kinds.length > 1 ? (
          <Select aria-label="Tipo de notificación" value={kind} onChange={(e) => setKind(e.target.value as NotificationKind | "all")} className="h-11 w-48 rounded-full">
            <option value="all">Todos los tipos</option>
            {kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </Select>
        ) : null}
        <div className="relative min-w-52 flex-1 sm:max-w-80">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" aria-label="Buscar en las notificaciones" value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar…" className="h-11 w-full rounded-full border border-border/60 bg-card pl-11 pr-4 text-ui outline-none placeholder:text-muted-foreground focus:border-accent" />
        </div>
        <button
          type="button"
          disabled={unreadIds.length === 0}
          onClick={() => {
            setRead(unreadIds, true);
            toast(`${unreadIds.length} ${unreadIds.length === 1 ? "marcada" : "marcadas"} como leídas`, "success");
          }}
          className="ml-auto inline-flex h-11 items-center gap-2 rounded-full border border-border/60 bg-card px-4 text-ui font-medium outline-none transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <CheckCheck aria-hidden="true" className="size-4" /> Marcar todas como leídas
        </button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          mark="center"
          remember={false}
          icon={<Inbox />}
          title={items.length === 0 ? "Todo al día" : filter === "archived" ? "No hay archivadas" : "Nada con estos filtros"}
          description={items.length === 0 ? "Cuando haya cobros, citas, pedidos o tareas que mirar, aparecerán aquí." : "Cambia el filtro o la búsqueda para ver más."}
        />
      ) : (
        <div className="grid gap-6">
          {groups.map((g) => (
            <section key={g.day} aria-label={g.day} className="grid gap-2.5">
              <h2 className="text-xs font-medium text-muted-foreground">{g.day}</h2>
              <ul className="grid gap-2">
                {g.items.map((n) => (
                  <Row key={n.id} n={n} onOpen={() => open(n)} onRead={() => setRead([n.id], !n.read)} onArchive={() => setArchived([n.id], !n.archived)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ n, onOpen, onRead, onArchive }: { n: InboxItem; onOpen: () => void; onRead: () => void; onArchive: () => void }) {
  const Icon = ICONS[n.kind];
  return (
    <li className={cn("nx-rise flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors", n.read ? "bg-surface-muted/60" : "bg-card shadow-[0_1px_2px_rgba(10,10,11,.04)] ring-1 ring-border/60")}>
      <button type="button" onClick={onOpen} aria-label={`Abrir: ${n.title}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <span aria-hidden="true" className={cn("relative grid size-11 shrink-0 place-items-center rounded-full", n.severity === "urgent" ? "bg-danger/10 text-danger" : n.severity === "action" ? "bg-accent-subtle text-accent-text" : "bg-card text-muted-foreground")}>
          <Icon className="size-[18px]" strokeWidth={1.7} />
          {!n.read ? <i className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-card bg-accent" /> : null}
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <b className={cn("truncate text-ui", n.read ? "font-medium text-foreground/80" : "font-semibold text-foreground")}>{n.title}</b>
            {n.severity && n.severity !== "info" ? (
              <span className={cn("rounded-full px-2.5 py-0.5 text-2xs font-medium", n.severity === "urgent" ? "bg-danger/10 text-danger" : "bg-accent-subtle text-accent-text")}>{SEVERITY_LABEL[n.severity]}</span>
            ) : null}
          </span>
          <span className="truncate text-xs text-muted-foreground">{n.detail}</span>
        </span>
      </button>
      <time dateTime={n.at} className="shrink-0 text-xs tabular-nums text-muted-foreground">{hour.format(new Date(n.at))}</time>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={`Más acciones: ${n.title}`} className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <MoreHorizontal aria-hidden="true" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onOpen}><ExternalLink aria-hidden="true" className="size-4" /> Abrir</DropdownMenuItem>
          <DropdownMenuItem onSelect={onRead}>{n.read ? <><X aria-hidden="true" className="size-4" /> Marcar como no leída</> : <><Check aria-hidden="true" className="size-4" /> Marcar como leída</>}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onArchive}>{n.archived ? <><ArchiveRestore aria-hidden="true" className="size-4" /> Devolver al buzón</> : <><Archive aria-hidden="true" className="size-4" /> Archivar</>}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/** Los avisos de escritorio: pide permiso con un clic, se enciende y apaga, y se puede probar. Dice con claridad lo que no puede hacer. */
function DesktopCard({ slug }: { slug: string }) {
  const { permission, enabled, enable, disable } = useDesktopNotifications(slug);
  const { toast } = useToast();
  const [asking, setAsking] = useState(false);

  const turnOn = async () => {
    setAsking(true);
    const result = await enable();
    setAsking(false);
    if (result === "granted") {
      toast("Avisos de escritorio activados", "success");
      void showDesktopNotification({ title: "NEXUS THRIVE", body: "Así te avisaremos cuando llegue algo.", href: `/${slug}/notificaciones`, tag: "nx-prueba" });
    } else if (result === "denied") toast("El navegador bloqueó los avisos. Actívalos en los permisos del sitio.", "error");
  };

  const state =
    permission === "unsupported"
      ? { title: "Tu navegador no admite avisos de escritorio", text: "Las notificaciones seguirán llegando aquí y a la campana." }
      : permission === "denied"
        ? { title: "Los avisos están bloqueados", text: "Permite las notificaciones para este sitio en la configuración del navegador (el candado junto a la dirección) y vuelve a intentarlo." }
        : enabled
          ? { title: "Avisos de escritorio activados", text: "Cuando llegue algo y no estés mirando NEXUS, te aparece un aviso en la pantalla. Funciona con NEXUS abierto en alguna pestaña." }
          : { title: "Recibe las notificaciones en tu escritorio", text: "Te avisamos en la esquina de la pantalla cuando llegue un cobro, una cita o un pedido, aunque estés en otra pestaña." };

  return (
    <section aria-label="Avisos de escritorio" className="flex flex-wrap items-center gap-4 rounded-(--radius-widget) border border-border/60 bg-card p-5">
      <span aria-hidden="true" className={cn("grid size-12 shrink-0 place-items-center rounded-full", enabled ? "bg-success/15 text-success" : "bg-accent-subtle text-accent-text")}>
        <BellRing className="size-5" strokeWidth={1.7} />
      </span>
      <div className="grid min-w-0 flex-1 basis-64 gap-0.5">
        <h2 className="text-ui font-semibold">{state.title}</h2>
        <p className="text-xs text-muted-foreground">{state.text}</p>
      </div>
      {permission === "unsupported" || permission === "denied" ? null : enabled ? (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => void showDesktopNotification({ title: "NEXUS THRIVE", body: "Así se ve un aviso de escritorio.", href: `/${slug}/notificaciones`, tag: "nx-prueba" })} className="inline-flex h-10 items-center rounded-full border border-border/60 px-4 text-ui font-medium outline-none transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring">
            Probar aviso
          </button>
          <Switch checked onCheckedChange={() => disable()} aria-label="Avisos de escritorio" />
        </div>
      ) : (
        <button type="button" disabled={asking} onClick={() => void turnOn()} className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-ink outline-none transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60">
          <BellRing aria-hidden="true" className="size-4" /> Activar avisos
        </button>
      )}
    </section>
  );
}
