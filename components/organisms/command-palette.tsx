"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Moon, Search } from "lucide-react";
import { Kbd } from "@/components/atoms/kbd";
import { setTheme } from "@/components/atoms/theme-toggle";
import { useShell } from "@/components/providers/shell-context";

/**
 * Paleta de comandos (Ctrl/⌘ K): ir a cualquier sección, crear algo o cambiar
 * el tema sin soltar el teclado. Búsqueda difusa de cmdk, flechas para mover
 * (la opción activa lleva el corte oro), Enter para abrir, Esc para cerrar.
 */
export function CommandPalette() {
  const { groups, quickActions, hrefFor, paletteOpen, setPaletteOpen } = useShell();
  const router = useRouter();

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
    setPaletteOpen(false);
    window.setTimeout(action, 60);
  }

  const itemClass =
    "relative flex min-h-[42px] cursor-pointer items-center gap-3 rounded-md px-2.5 text-sm outline-none data-[selected=true]:bg-surface-muted data-[selected=true]:before:-ml-2 data-[selected=true]:before:mr-[-5px] data-[selected=true]:before:h-[18px] data-[selected=true]:before:w-[3px] data-[selected=true]:before:-skew-x-[24deg] data-[selected=true]:before:bg-accent data-[selected=true]:before:content-[''] [&_svg]:size-4 [&_svg]:shrink-0";
  const groupClass =
    "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground";

  return (
    <DialogPrimitive.Root open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[75] bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-[76] w-[min(600px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--nx-shadow-overlay)] duration-[280ms] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[.97] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[.97]"
        >
          <DialogPrimitive.Title className="sr-only">Buscar o ejecutar</DialogPrimitive.Title>
          <Command loop label="Buscar o ejecutar">
            <div className="relative border-b border-border">
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder="Busca secciones o acciones"
                className="h-[54px] w-full bg-transparent pl-[46px] pr-4 text-[15px] outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Command.List className="max-h-[min(380px,56vh)] overflow-y-auto p-1.5">
              <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">Sin resultados.</Command.Empty>
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
              <Command.Group heading="Acciones" className={groupClass}>
                {quickActions.map((action) => (
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
                  onSelect={() =>
                    run(() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark"))
                  }
                  className={itemClass}
                >
                  <Moon aria-hidden="true" />
                  <span>Cambiar tema</span>
                </Command.Item>
              </Command.Group>
            </Command.List>
            <div className="flex gap-3.5 border-t border-border px-3.5 py-2.5 text-[11.5px] text-muted-foreground">
              <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> mover</span>
              <span><Kbd>Enter</Kbd> abrir</span>
              <span><Kbd>Esc</Kbd> cerrar</span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
