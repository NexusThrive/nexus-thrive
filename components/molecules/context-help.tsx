"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const HOVER_OPEN_MS = 180;
const HOVER_CLOSE_MS = 240;

/**
 * Ayuda contextual "?" (patrón *toggletip* de WAI-ARIA APG).
 *
 * - Ratón: se abre al pasar por encima y se queda fija si se hace clic.
 * - Teclado: Tab llega al botón; Enter o Espacio la abren; Escape la cierra.
 * - Táctil: un toque la abre y otro (o tocar fuera) la cierra.
 * - Lector de pantalla: el botón se llama "Ayuda sobre {topic}" y, al
 *   abrirse, el texto se anuncia por una región `status` junto al botón.
 *
 * Va en un portal en la capa `--z-popover`: no la recorta una tarjeta, una
 * tabla ni un panel. La información **imprescindible** no va aquí sino en la
 * descripción visible del campo (`Field description`): esto es un extra.
 * Si hay `href`, muestra un enlace a la guía del centro de ayuda.
 */
export function ContextHelp({
  topic,
  children,
  href,
  hrefLabel = "Ver la guía",
  side = "top",
  className,
}: {
  /** Sobre qué es la ayuda, en minúscula: "el correo electrónico". */
  topic: string;
  /** Texto breve y concreto: qué significa, qué se espera y para qué se usa. */
  children: ReactNode;
  href?: string;
  hrefLabel?: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const schedule = (next: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), ms);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        window.clearTimeout(timer.current);
        pinned.current = next;
        setOpen(next);
      }}
    >
      <PopoverTrigger
        type="button"
        aria-label={`Ayuda sobre ${topic}`}
        className={cn(
          // 24 × 24 px: el mínimo de WCAG 2.5.8 para un control pequeño junto a texto.
          "inline-grid size-6 shrink-0 place-items-center rounded-full align-middle text-muted-foreground transition-colors duration-(--motion-hover) hover:text-foreground data-[state=open]:text-foreground",
          className,
        )}
        onClick={(event) => {
          // Abierta por hover: el clic la fija en vez de cerrarla.
          if (open && !pinned.current) {
            event.preventDefault();
            window.clearTimeout(timer.current);
            pinned.current = true;
          }
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse" && !open) schedule(true, HOVER_OPEN_MS);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && !pinned.current) schedule(false, HOVER_CLOSE_MS);
        }}
      >
        <CircleHelp aria-hidden="true" className="size-4" />
      </PopoverTrigger>
      {/* Anuncio para lectores de pantalla (el contenido no recibe el foco). */}
      <span role="status" className="sr-only">
        {open ? children : null}
      </span>
      <PopoverContent
        side={side}
        className="leading-relaxed"
        // Sin enlace, el foco se queda en el botón (Escape y Tab siguen
        // funcionando); con enlace, entra al contenido para poder seguirlo.
        onOpenAutoFocus={href ? undefined : (event) => event.preventDefault()}
        onPointerEnter={() => window.clearTimeout(timer.current)}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && !pinned.current) schedule(false, HOVER_CLOSE_MS);
        }}
      >
        <div>{children}</div>
        {href ? (
          <Link
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            className="mt-2 inline-flex items-center gap-1 font-medium text-accent-text underline-offset-2 hover:underline"
          >
            {hrefLabel}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
