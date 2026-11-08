"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command, useCommandState } from "cmdk";
import { Blocks, Download, HandCoins, Moon, Package, Receipt, Search, Target, User } from "lucide-react";
import { searchEntitiesAction, type SearchHit } from "@/app/[tenant]/(app)/_actions/search";
import { EyeTracker } from "@/components/atoms/eye-tracker";
import { Kbd } from "@/components/atoms/kbd";
import { setTheme } from "@/components/atoms/theme-toggle";
import { usePwa } from "@/components/providers/pwa";
import { useQuickCreate } from "@/components/organisms/quick-create-host";
import { usePalette, useShell } from "@/components/providers/shell-context";
import { CAPABILITIES } from "@/lib/core/capabilities/registry";
import { askAuri } from "@/lib/experience/assistant/ask-auri";
import { cn } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 768px)";
function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
/** ¿Hay espacio para la navbar completa (≥ 768 px)? En el servidor, no. */
export function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);
}

/**
 * Texto escrito y resultados del servidor (clientes y catálogo): desde 2
 * letras, con espera de 250 ms, máx. 5 por tipo y solo de los módulos activos.
 * Lo comparten la paleta modal (móvil) y el buscador de la navbar (PC).
 */
export function usePaletteSearch() {
  const { hrefFor } = useShell();
  const [query, setQueryState] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const requestId = useRef(0);
  const tenantSlug = hrefFor("").slice(1);

  useEffect(() => {
    const id = ++requestId.current;
    const text = query.trim();
    if (text.length < 2) return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchEntitiesAction(tenantSlug, text);
        if (id !== requestId.current) return; // llegó una búsqueda más nueva
        setHits(result.ok ? result.hits : []);
        setStatus(result.ok ? "idle" : "error");
      } catch {
        if (id === requestId.current) setStatus("error");
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, tenantSlug]);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setStatus(value.trim().length >= 2 ? "loading" : "idle");
  }, []);

  const searching = query.trim().length >= 2;
  return { query, setQuery, hits: searching ? hits : [], status };
}

/** Sin barra de scroll visible (la lista sigue desplazándose con rueda, teclado y toque). */
export const NO_SCROLLBAR = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** Resultado que se está quitando: se mantiene un momento para animar su salida (200 ms, ver `.nx-hit-out`). */
type ShownHit = { hit: SearchHit; leaving: boolean };
const HIT_OUT_MS = 200;
const hitKey = (hit: SearchHit) => `${hit.kind}-${hit.id}`;

const itemClass =
  "relative flex min-h-[42px] cursor-pointer items-center gap-3 rounded-md px-2.5 text-sm outline-none data-[selected=true]:bg-surface-muted data-[selected=true]:before:-ml-2 data-[selected=true]:before:mr-[-5px] data-[selected=true]:before:h-[18px] data-[selected=true]:before:w-[3px] data-[selected=true]:before:-skew-x-[24deg] data-[selected=true]:before:bg-accent data-[selected=true]:before:content-[''] [&_svg]:size-4 [&_svg]:shrink-0";
const groupClass =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground";

/**
 * AURI AI al final del campo de búsqueda, en su círculo y mirando al frente (sin seguir el puntero): un clic le pasa lo escrito y
 * abre su chat. Cuando nada coincide con lo escrito se destaca con un anillo dorado y Enter también la envía. Va dentro de un
 * `<Command>`: lee de cmdk cuántos elementos pasaron el filtro. Mientras llegan los resultados del servidor no se destaca.
 */
export function AuriAskButton({ query, status, run, className }: { query: string; status: "idle" | "loading" | "error"; run: (action: () => void) => void; className?: string }) {
  const matches = useCommandState((state) => state.filtered.count);
  const nothing = matches === 0 && status !== "loading" && query.trim() !== "";
  useEffect(() => {
    if (!nothing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      run(() => askAuri(query));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [nothing, query, run]);
  return (
    <span className={cn("absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2", className)}>
      {nothing ? <span aria-hidden="true" className="hidden text-xs text-muted-foreground sm:inline">Pregúntale a AURI · Enter</span> : null}
      <button
        type="button"
        aria-label={query.trim() ? `Preguntarle a AURI: ${query.trim()}` : "Abrir el chat con AURI"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run(() => askAuri(query))}
        data-press=""
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full outline-none transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:size-11",
          nothing && "ring-2 ring-accent",
        )}
      >
        <EyeTracker fit decorative poke={false} front size={28} shape="Ball" eyeScale={1.2} />
      </button>
    </span>
  );
}

/**
 * Lista de la paleta (va dentro de un `<Command>`): resultados, secciones y
 * acciones. `run` cierra la superficie que la contiene y ejecuta la acción.
 */
export function PaletteList({
  query,
  hits,
  status,
  run,
  className,
}: {
  /** Texto escrito: mientras esté vacío no se vuelca todo, solo se invita a buscar. */
  query: string;
  hits: SearchHit[];
  status: "idle" | "loading" | "error";
  run: (action: () => void) => void;
  className?: string;
}) {
  const { groups, activeModules, createActions, quickActions, hrefFor } = useShell();
  const router = useRouter();
  const quick = useQuickCreate();
  const { canInstall, install } = usePwa();
  const actions = createActions ?? quickActions;
  // Lo que el negocio aún no usa también se encuentra: lleva a Funciones para encenderlo.
  // Sin «Funciones» en el menú (rubros con menú reducido, como el gimnasio) no se ofrece encender nada.
  const hasFunctions = groups.some((group) => group.items.some((item) => item.key === "functions"));
  const off = activeModules && hasFunctions ? CAPABILITIES.filter((c) => c.status !== "PLANNED" && c.id !== "dashboard" && !activeModules.includes(c.id)) : [];

  const idle = query.trim() === "";

  // Los resultados entran escalonados y, al cambiar la búsqueda, los que sobran se recogen en vez de desaparecer de golpe.
  const [shownHits, setShownHits] = useState<ShownHit[]>([]);
  const [hitsKey, setHitsKey] = useState("");
  const nextKey = hits.map(hitKey).join("|");
  if (nextKey !== hitsKey) {
    setHitsKey(nextKey);
    const keep = new Set(hits.map(hitKey));
    const merged: ShownHit[] = hits.map((hit) => ({ hit, leaving: false }));
    shownHits.forEach((old, index) => {
      if (!keep.has(hitKey(old.hit))) merged.splice(Math.min(index, merged.length), 0, { hit: old.hit, leaving: true });
    });
    setShownHits(merged);
  }
  const anyLeaving = shownHits.some((h) => h.leaving);
  useEffect(() => {
    if (!anyLeaving) return;
    const timer = window.setTimeout(() => setShownHits((list) => list.filter((h) => !h.leaving)), HIT_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [anyLeaving, hitsKey]);

  return (
    <>
      {idle ? (
        <>
        {/* La lista sigue en el documento (el campo la referencia con aria-controls) aunque no haya nada que mostrar. */}
        {/* Primeras sugerencias: las acciones rápidas (antes en Resumen). La lista sigue en el documento: el campo la referencia. */}
        <Command.List className={cn("shrink-0 p-1.5", NO_SCROLLBAR)} hidden={actions.length === 0}>
          <Command.Group heading="Crear" className={groupClass}>
            {actions.map((action) => (
              <Command.Item
                key={action.key}
                value={`sugerencia crear ${action.label}`}
                onSelect={() => run(() => { if (!quick.open(action.key)) router.push(hrefFor(action.href)); })}
                className={itemClass}
              >
                <action.icon aria-hidden="true" />
                <span>{action.label}</span>
                <small className="ml-auto text-xs text-muted-foreground">{action.hint}</small>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
        <div className="grid flex-1 content-center justify-items-center gap-3 px-6 py-10 text-center">
          <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-surface-muted ring-1 ring-border">
            <Search className="size-6 text-muted-foreground" strokeWidth={1.6} />
          </span>
          <div className="grid gap-1">
            <p className="font-display text-sm font-semibold text-foreground">Encuentra lo que necesitas</p>
            <p className="max-w-[34ch] text-ui text-muted-foreground">
              Escribe un nombre, un pago, un gasto o una sección y verás los resultados aquí.
            </p>
          </div>
        </div>
        </>
      ) : (
      <Command.List className={cn("overflow-y-auto p-1.5", NO_SCROLLBAR, className)}>
        <Command.Empty className="nx-search-note px-4 py-6 text-center text-sm text-muted-foreground">
          {status === "loading" ? "Buscando…" : "Sin resultados."}
        </Command.Empty>
        {shownHits.length > 0 ? (
          <Command.Group forceMount heading="Resultados" className={groupClass}>
            {shownHits.map(({ hit, leaving }, index) => (
              <Command.Item
                key={hitKey(hit)}
                forceMount
                disabled={leaving}
                value={`resultado ${hit.kind} ${hit.id}`}
                onSelect={() => run(() => router.push(hrefFor(hit.href)))}
                style={leaving ? undefined : { animationDelay: `${Math.min(index, 5) * 25}ms` }}
                className={cn(itemClass, leaving ? "nx-hit-out" : "nx-hit-in")}
              >
                {hit.kind === "customer" ? <User aria-hidden="true" /> : hit.kind === "opportunity" ? <Target aria-hidden="true" /> : hit.kind === "payment" ? <HandCoins aria-hidden="true" /> : hit.kind === "expense" ? <Receipt aria-hidden="true" /> : <Package aria-hidden="true" />}
                <span className="truncate">{hit.title}</span>
                <small className="ml-auto truncate text-xs text-muted-foreground">{hit.subtitle}</small>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        <Command.Group heading="Ir a" className={groupClass}>
          {/* Resumen ya no es un destino del sistema (su ruta se conserva, sin enlaces). */}
          {groups.flatMap((g) => g.items).filter((item) => item.href !== "/resumen").map((item) => (
            <Command.Item
              key={item.key}
              value={`ir ${item.label}`}
              onSelect={() => run(() => router.push(hrefFor(item.href)))}
              className={itemClass}
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
              <small className="ml-auto text-xs text-muted-foreground">Sección</small>
            </Command.Item>
          ))}
        </Command.Group>
        {off.length > 0 ? (
          <Command.Group heading="Funciones apagadas" className={groupClass}>
            {off.map((c) => (
              <Command.Item
                key={c.id}
                value={`funcion activar ${c.name} ${c.description}`}
                onSelect={() => run(() => router.push(hrefFor("/functions")))}
                className={itemClass}
              >
                <Blocks aria-hidden="true" />
                <span>{c.name}</span>
                <small className="ml-auto text-xs text-muted-foreground">Activar en Funciones</small>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        <Command.Group heading="Acciones" className={groupClass}>
          {actions.map((action) => (
            <Command.Item
              key={action.key}
              value={`crear ${action.label}`}
              onSelect={() => run(() => { if (!quick.open(action.key)) router.push(hrefFor(action.href)); })}
              className={itemClass}
            >
              <action.icon aria-hidden="true" />
              <span>{action.label}</span>
              <small className="ml-auto text-xs text-muted-foreground">{action.hint}</small>
            </Command.Item>
          ))}
          <Command.Item
            value="cambiar tema oscuro claro"
            onSelect={() => run(() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark"))}
            className={itemClass}
          >
            <Moon aria-hidden="true" />
            <span>Cambiar tema</span>
          </Command.Item>
          {canInstall ? (
            <Command.Item value="instalar aplicación nexus" onSelect={() => run(() => void install())} className={itemClass}>
              <Download aria-hidden="true" />
              <span>Instalar NEXUS</span>
              <small className="ml-auto text-xs text-muted-foreground">App</small>
            </Command.Item>
          ) : null}
        </Command.Group>
      </Command.List>
      )}
      <p role="status" className="sr-only">
        {status === "loading" ? "Buscando" : status === "error" ? "No se pudo buscar" : hits.length ? `${hits.length} resultados` : ""}
      </p>
      {status === "error" ? (
        <p className="border-t border-border px-3.5 py-2 text-xs text-danger">No se pudo buscar ahora. Las secciones siguen disponibles.</p>
      ) : null}
      <div className="flex gap-3.5 border-t border-border px-3.5 py-2.5 text-[11.5px] text-muted-foreground pointer-coarse:hidden">
        <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> mover</span>
        <span><Kbd>Enter</Kbd> abrir</span>
        <span><Kbd>Esc</Kbd> cerrar</span>
      </div>
    </>
  );
}

/**
 * Paleta de comandos (Ctrl/⌘ K): ir a cualquier sección, crear algo o cambiar
 * el tema sin soltar el teclado. Flechas para mover (la opción activa lleva el
 * corte oro), Enter para abrir, Esc para cerrar.
 *
 * Esta es la versión **modal** (hoja de búsqueda a pantalla completa en
 * móvil). Con `inlineOnDesktop` solo se muestra bajo 768 px: en PC la
 * búsqueda es el panel que cuelga del buscador de la navbar (`NavbarSearch`).
 * Ctrl K se atiende aquí en ambos casos.
 */
export function CommandPalette({ inlineOnDesktop = false, inline = false }: { inlineOnDesktop?: boolean; /** La búsqueda vive en la barra (PC: `NavbarSearch`, móvil: `MobileTopbarSearch`): la hoja modal no se abre. */ inline?: boolean }) {
  const { open: paletteOpen, setOpen: setPaletteOpen } = usePalette();
  const search = usePaletteSearch();
  const desktop = useIsDesktop();
  const { setQuery } = search;

  const changeOpen = useCallback(
    (open: boolean) => {
      setPaletteOpen(open);
      if (!open) setQuery("");
    },
    [setPaletteOpen, setQuery],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  function run(action: () => void) {
    changeOpen(false);
    window.setTimeout(action, 60);
  }

  return (
    <DialogPrimitive.Root open={paletteOpen && !inline && !(inlineOnDesktop && desktop)} onOpenChange={changeOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-takeover) bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-(--z-takeover) w-[min(600px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--nx-shadow-overlay)] duration-[280ms] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[.97] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[.97]"
        >
          <DialogPrimitive.Title className="sr-only">Buscar o ejecutar</DialogPrimitive.Title>
          <Command loop label="Buscar o ejecutar">
            <div className="relative border-b border-border">
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Command.Input
                autoFocus
                value={search.query}
                onValueChange={search.setQuery}
                placeholder="Busca clientes, pagos, gastos, catálogo o acciones"
                className="h-[54px] w-full bg-transparent pl-[46px] pr-14 text-[15px] outline-none placeholder:text-muted-foreground"
              />
              <AuriAskButton query={search.query} status={search.status} run={run} />
            </div>
            <PaletteList query={search.query} hits={search.hits} status={search.status} run={run} className="max-h-[min(380px,56vh)]" />
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
