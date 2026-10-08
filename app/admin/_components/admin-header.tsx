"use client";

import { useState } from "react";
import { Command, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TenantForm from "./tenant-form";
import CommandPalette from "./command-palette";

/**
 * Cabecera de la página. Controla el alta de negocios y la paleta de
 * comandos (⌘K). El usuario y el rol se muestran en el sidebar del shell.
 */
export default function AdminHeader() {
  const [formOpen, setFormOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Resumen general
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestión global de negocios, verticales y módulos de la plataforma.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 text-sm text-slate-500 transition hover:bg-slate-50 md:inline-flex"
          >
            <Command className="h-4 w-4" aria-hidden />
            Buscar o comando
            <kbd className="rounded border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              ⌘K
            </kbd>
          </button>
          <Button
            type="button"
            onClick={() => setFormOpen(true)}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            <Plus aria-hidden />
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
