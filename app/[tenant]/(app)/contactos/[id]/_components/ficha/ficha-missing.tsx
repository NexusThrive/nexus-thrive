"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/molecules/popover";
import { cn } from "@/lib/utils";

/**
 * El «!» de la tarjeta de información: avisa que faltan datos del cliente y, al pulsarlo, los sugiere uno por uno (cada uno abre la edición
 * con ese campo enfocado) o todos a la vez. Sin datos que faltan no se muestra.
 */
export default function FichaMissing({ items, editHref }: { items: { label: string; href: string }[]; editHref: string }) {
  if (items.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Faltan ${items.length} ${items.length === 1 ? "dato" : "datos"} de este cliente. Ver cuáles`}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-subtle font-display text-base font-extrabold leading-none text-accent-text outline-none transition-colors hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span aria-hidden="true">!</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(340px,calc(100vw-24px))] p-5">
        <h3 className="font-display text-base font-medium text-foreground">Completa la ficha</h3>
        <p className="mt-1 text-ui text-muted-foreground">
          {items.length === 1 ? "Falta 1 dato" : `Faltan ${items.length} datos`} para tener a este cliente al día.
        </p>
        <ul className="mt-4 grid gap-1.5">
          {items.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted/60 px-3.5 py-2.5 text-ui text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring">
                <span className="truncate">{item.label}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent-text">
                  <Plus aria-hidden="true" className="size-3.5" />
                  Añadir
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href={editHref} className={cn(buttonVariants({ variant: "accent" }), "mt-4 h-11 w-full rounded-full text-sm font-semibold")}>
          Completar todo
        </Link>
      </PopoverContent>
    </Popover>
  );
}
