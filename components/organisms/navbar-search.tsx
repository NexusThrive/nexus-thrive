"use client";

import { useEffect, useRef } from "react";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { Kbd } from "@/components/atoms/kbd";
import { usePalette } from "@/components/providers/shell-context";
import { PaletteList, useIsDesktop, usePaletteSearch } from "@/components/organisms/command-palette";
import { cn } from "@/lib/utils";

/**
 * Buscador de la navbar (PC): un campo real que, al enfocarlo o con Ctrl K, se
 * ensancha hacia los lados y despliega, justo debajo y del mismo ancho, un
 * panel con resultados, secciones y acciones que crece desde el borde de la barra. No es un
 * modal: sin fondo oscuro, la página sigue visible y el foco no queda atrapado.
 * Se cierra con Escape, al elegir algo o al salir del campo; sin barra de
 * scroll visible. Combobox de cmdk: flechas para mover, Enter para abrir.
 * En móvil no se muestra: ahí la búsqueda es la hoja de `CommandPalette`.
 */
export function NavbarSearch({ className }: { className?: string }) {
  const { open, setOpen } = usePalette();
  const search = usePaletteSearch();
  const { setQuery } = search;
  const desktop = useIsDesktop();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelOpen = open && desktop;

  // Ctrl K abre el estado compartido; aquí se lleva el foco al campo.
  useEffect(() => {
    if (panelOpen) inputRef.current?.focus();
  }, [panelOpen]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function run(action: () => void) {
    close();
    inputRef.current?.blur();
    window.setTimeout(action, 60);
  }

  return (
    <div
      ref={rootRef}
      data-open={panelOpen ? "" : undefined}
      // Al enfocar se ensancha hacia los dos lados dentro del espacio libre de la navbar (de 380 a 600 px como máximo); 320 ms.
      className={cn(
        "relative hidden min-w-0 max-w-[380px] flex-1 transition-[max-width] duration-[var(--d3)] ease-[var(--nx-ease-out)] data-[open]:max-w-[600px] md:block",
        className,
      )}
      onBlur={(event) => {
        // Salir del campo y del panel cierra; pasar entre ellos no.
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <Command
        loop
        label="Buscar o ejecutar"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
            inputRef.current?.blur();
          }
        }}
      >
        <div className="group relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200 group-focus-within:scale-110 group-focus-within:text-foreground" />
          <Command.Input
            ref={inputRef}
            value={search.query}
            onValueChange={search.setQuery}
            onFocus={() => setOpen(true)}
            placeholder="Buscar o ejecutar…"
            className="h-10 w-full rounded-md border border-border bg-surface-muted pl-10 pr-16 text-[13px] outline-none transition-[border-color,background-color] duration-200 placeholder:text-muted-foreground hover:border-border-input focus:border-border-input focus:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <Kbd
            aria-hidden="true"
            className={cn("pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-opacity duration-200", panelOpen && "opacity-0")}
          >
            Ctrl K
          </Kbd>
        </div>

        {panelOpen ? (
          // preventDefault en mousedown: pulsar un resultado no le quita el foco al campo.
          <div
            onMouseDown={(event) => event.preventDefault()}
            className="nx-drop-down absolute inset-x-0 top-[calc(100%+6px)] min-w-[320px] z-(--z-popover) overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-popover)]"
          >
            <PaletteList hits={search.hits} status={search.status} run={run} className="max-h-[min(420px,calc(100vh-var(--topbar-height)-48px))]" />
          </div>
        ) : null}
      </Command>
    </div>
  );
}
