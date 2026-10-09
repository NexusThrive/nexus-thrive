"use client";

import { useState } from "react";
import { Command, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TenantForm from "./tenant-form";
import CommandPalette from "./command-palette";

/**
 * Cabecera de la página: `h1` Montserrat + subtítulo, botón outline de 40 px
 * "Buscar o comando ⌘K" y botón ACENTO oro "Nuevo negocio". El usuario y el rol
 * se muestran en el sidebar del shell.
 */
export default function AdminHeader() {
  const [formOpen, setFormOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-semibold leading-8 tracking-[-0.01em] text-foreground">
            Resumen general
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestión global de negocios, verticales y módulos de la plataforma.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPaletteOpen(true)}
            className="hidden md:inline-flex"
          >
            <Command aria-hidden="true" />
            Buscar o comando
            <kbd className="ml-1 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={() => setFormOpen(true)}
          >
            <Plus aria-hidden="true" />
            Nuevo negocio
          </Button>
        </div>
      </header>

      {formOpen ? <TenantForm onClose={() => setFormOpen(false)} /> : null}

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onCreate={() => setFormOpen(true)}
      />
    </>
  );
}
