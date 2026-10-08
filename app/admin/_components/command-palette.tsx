"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Download, Plus, TriangleAlert } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

/**
 * Paleta de comandos del panel (⌘K / Ctrl+K): navegación y acciones
 * rápidas. Mantiene la URL como fuente de verdad.
 */
export default function CommandPalette({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Comandos"
      description="Busca negocios o ejecuta acciones"
    >
      <CommandInput
        placeholder="Buscar negocio o ejecutar un comando…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Acciones">
          <CommandItem
            value={`nuevo negocio ${query}`}
            onSelect={() => run(onCreate)}
          >
            <Plus aria-hidden="true" />
            Nuevo negocio
          </CommandItem>
          <CommandItem
            value={`buscar ${query}`}
            onSelect={() =>
              run(() =>
                router.push(`/admin?q=${encodeURIComponent(query.trim())}`),
              )
            }
          >
            <Building2 aria-hidden="true" />
            {query.trim()
              ? `Buscar «${query.trim()}» en negocios`
              : "Ir a negocios"}
          </CommandItem>
          <CommandItem
            value="requieren atencion alertas"
            onSelect={() => run(() => router.push("/admin?attention=1"))}
          >
            <TriangleAlert aria-hidden="true" />
            Negocios que requieren atención
          </CommandItem>
          <CommandSeparator />
          <CommandItem
            value="exportar csv"
            onSelect={() =>
              run(() => {
                const anchor = document.createElement("a");
                anchor.href = "/admin/export";
                anchor.click();
              })
            }
          >
            <Download aria-hidden="true" />
            Exportar negocios a CSV
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
