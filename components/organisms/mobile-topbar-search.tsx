"use client";

import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { ArrowLeft, X } from "lucide-react";
import { usePalette } from "@/components/providers/shell-context";
import { PaletteList, useIsDesktop, usePaletteSearch } from "@/components/organisms/command-palette";

/**
 * Búsqueda del móvil dentro de la barra superior: al pulsar la lupa, toda la barra se vuelve un campo (flecha para
 * volver, texto y borrar) y debajo salen las sugerencias en un panel que baja de la barra. El campo queda arriba, así
 * el teclado nunca tapa lo que se escribe ni los resultados. Comparte el estado de Ctrl K (`usePalette`) y la lista
 * de la paleta (`PaletteList`). Solo bajo 768 px: en PC es `NavbarSearch`.
 */
/** Duración de la salida: la de `--d3` (320 ms) más un respiro. */
const CLOSE_MS = 340;

export function MobileTopbarSearch() {
  const { open, setOpen } = usePalette();
  const search = usePaletteSearch();
  const { setQuery } = search;
  const desktop = useIsDesktop();
  const inputRef = useRef<HTMLInputElement>(null);
  const active = open && !desktop;
  // Al cerrar se queda montada lo que dura la animación de salida (espejo de la entrada) y luego se desmonta.
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  if (active && phase !== "open") setPhase("open");
  if (!active && phase === "open") setPhase("closing");

  useEffect(() => {
    if (phase === "open") inputRef.current?.focus();
    if (phase !== "closing") return;
    const timer = window.setTimeout(() => {
      setPhase("closed");
      setQuery(""); // el texto se queda visible mientras el panel se cierra
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [phase, setQuery]);

  if (phase === "closed") return null;
  const closing = phase === "closing";

  function close() {
    inputRef.current?.blur();
    setOpen(false);
  }

  function run(action: () => void) {
    close();
    window.setTimeout(action, 60);
  }

  return (
    <Command
      loop
      label="Buscar o ejecutar"
      shouldFilter
      className="contents"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <div data-closing={closing ? "" : undefined} className="nx-search-row absolute inset-0 z-(--z-raised) flex items-center gap-1 bg-[var(--sidebar-bg)] px-2 text-[var(--sidebar-fg)] pl-[max(8px,env(safe-area-inset-left,0px))] pr-[max(8px,env(safe-area-inset-right,0px))]">
        <button type="button" onClick={close} aria-label="Cerrar la búsqueda" data-press="" className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowLeft aria-hidden="true" className="size-5" />
        </button>
        <Command.Input
          ref={inputRef}
          value={search.query}
          onValueChange={search.setQuery}
          placeholder="Buscar clientes, pagos, gastos…"
          enterKeyHint="search"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {search.query ? (
          <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Borrar lo escrito" className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <X aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>

      {/* Panel de sugerencias: ocupa todo el alto bajo la barra, hasta el teclado (`--kb`), que es quien lo acomoda. */}
      <div data-closing={closing ? "" : undefined} className="nx-search-panel fixed inset-x-0 bottom-[var(--kb,0px)] top-[calc(var(--topbar-height)+env(safe-area-inset-top,0px))] flex flex-col overflow-hidden bg-surface">
        <PaletteList query={search.query} hits={search.hits} status={search.status} run={run} className="min-h-0 flex-1" />
      </div>
    </Command>
  );
}
