"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Blocks, Download, HandCoins, Moon, Package, Receipt, Search, User } from "lucide-react";
import { searchEntitiesAction, type SearchHit } from "@/app/[tenant]/(app)/_actions/search";
import { Kbd } from "@/components/atoms/kbd";
import { setTheme } from "@/components/atoms/theme-toggle";
import { usePwa } from "@/components/providers/pwa";
import { usePalette, useShell } from "@/components/providers/shell-context";
import { CAPABILITIES } from "@/lib/capabilities/registry";
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

const itemClass =
  "relative flex min-h-[42px] cursor-pointer items-center gap-3 rounded-md px-2.5 text-sm outline-none data-[selected=true]:bg-surface-muted data-[selected=true]:before:-ml-2 data-[selected=true]:before:mr-[-5px] data-[selected=true]:before:h-[18px] data-[selected=true]:before:w-[3px] data-[selected=true]:before:-skew-x-[24deg] data-[selected=true]:before:bg-accent data-[selected=true]:before:content-[''] [&_svg]:size-4 [&_svg]:shrink-0";
const groupClass =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground";

/**
 * Lista de la paleta (va dentro de un `<Command>`): resultados, secciones y
 * acciones. `run` cierra la superficie que la contiene y ejecuta la acción.
 */
export function PaletteList({
  hits,
  status,
  run,
  className,
}: {
  hits: SearchHit[];
  status: "idle" | "loading" | "error";
  run: (action: () => void) => void;
  className?: string;
}) {
  const { groups, activeModules, createActions, quickActions, hrefFor } = useShell();
  const router = useRouter();
  const { canInstall, install } = usePwa();
  const actions = createActions ?? quickActions;
  // Lo que el negocio aún no usa también se encuentra: lleva a Funciones para encenderlo.
  const off = activeModules ? CAPABILITIES.filter((c) => c.status !== "PLANNED" && c.id !== "dashboard" && !activeModules.includes(c.id)) : [];

  return (
    <>
      <Command.List className={cn("overflow-y-auto p-1.5", NO_SCROLLBAR, className)}>
        <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">
          {status === "loading" ? "Buscando…" : "Sin resultados."}
        </Command.Empty>
        {hits.length > 0 ? (
          <Command.Group forceMount heading="Resultados" className={groupClass}>
            {hits.map((hit) => (
              <Command.Item
                key={`${hit.kind}-${hit.id}`}
                forceMount
                value={`resultado ${hit.kind} ${hit.id}`}
                onSelect={() => run(() => router.push(hrefFor(hit.href)))}
                className={itemClass}
              >
                {hit.kind === "customer" ? <User aria-hidden="true" /> : hit.kind === "payment" ? <HandCoins aria-hidden="true" /> : hit.kind === "expense" ? <Receipt aria-hidden="true" /> : <Package aria-hidden="true" />}
                <span className="truncate">{hit.title}</span>
                <small className="ml-auto truncate text-xs text-muted-foreground">{hit.subtitle}</small>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        <Command.Group heading="Ir a" className={groupClass}>
          {groups.flatMap((g) => g.items).map((item) => (
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
              onSelect={() => run(() => router.push(hrefFor(action.href)))}
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
      <p role="status" className="sr-only">
        {status === "loading" ? "Buscando" : status === "error" ? "No se pudo buscar" : hits.length ? `${hits.length} resultados` : ""}
      </p>
      {status === "error" ? (
        <p className="border-t border-border px-3.5 py-2 text-xs text-danger">No se pudo buscar ahora. Las secciones siguen disponibles.</p>
      ) : null}
      <div className="flex gap-3.5 border-t border-border px-3.5 py-2.5 text-[11.5px] text-muted-foreground">
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
export function CommandPalette({ inlineOnDesktop = false }: { inlineOnDesktop?: boolean }) {
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
    <DialogPrimitive.Root open={paletteOpen && !(inlineOnDesktop && desktop)} onOpenChange={changeOpen}>
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
                className="h-[54px] w-full bg-transparent pl-[46px] pr-4 text-[15px] outline-none placeholder:text-muted-foreground"
              />
            </div>
            <PaletteList hits={search.hits} status={search.status} run={run} className="max-h-[min(380px,56vh)]" />
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
