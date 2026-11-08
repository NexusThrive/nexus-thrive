"use client";

import { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { AuriAskButton, PaletteList, usePaletteSearch } from "@/components/organisms/command-palette";

/** ¿El foco está en algo donde se escribe? Ahí las teclas son del campo, no del buscador. */
function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * Búsqueda por teclado en Inicio: al teclear una letra o un número (sin tocar ningún campo) se abre un buscador flotante con esa
 * tecla ya escrita, para llegar a una sección, una función, un cliente, un pago o un gasto sin buscar el icono. Si nada coincide,
 * AURI AI está al final del campo, en su círculo y mirando al frente: un clic o Enter (si nada coincide) le pasa la consulta. Es la misma lista de la paleta (Ctrl K): mismos resultados y mismas reglas de acceso.
 *
 * Espacio y Enter no la abren: son las teclas con que se mueve y se abre un icono del cajón. Con otro panel abierto, tampoco.
 */
export function HomeQuickSearch() {
  const search = usePaletteSearch();
  const [open, setOpen] = useState(false);
  const { setQuery } = search;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      // Una sola tecla imprimible; Espacio queda para el cajón de apps.
      if (event.key.length !== 1 || event.key === " ") return;
      if (isEditable(event.target)) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      event.preventDefault();
      setQuery(event.key);
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setQuery]);

  const changeOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) setQuery("");
    },
    [setQuery],
  );

  function run(action: () => void) {
    changeOpen(false);
    window.setTimeout(action, 60);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={changeOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-takeover) bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-(--z-takeover) w-[min(600px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--nx-shadow-overlay)] duration-[280ms] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[.97] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[.97]"
        >
          <DialogPrimitive.Title className="sr-only">Buscar en NEXUS o preguntarle a AURI</DialogPrimitive.Title>
          <Command loop label="Buscar o preguntarle a AURI">
            <div className="relative border-b border-border">
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Command.Input
                autoFocus
                value={search.query}
                onValueChange={search.setQuery}
                placeholder="Busca una sección, función, cliente, pago… o pregúntale a AURI"
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
