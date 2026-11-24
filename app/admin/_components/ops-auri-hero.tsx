"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { EyeTracker } from "@/components/atoms/eye-tracker";
import { RevealText } from "@/components/atoms/reveal-text";
import { useOps } from "./ops-shell";

/**
 * Saludo del Inicio del Operations Center, con AURI como en el Inicio de los negocios (`AppHome`): a la izquierda la fecha, el
 * saludo con el nombre en oro y en una línea lo que pide atención hoy; a la derecha AURI, mirando al cursor sobre su halo. El panel
 * todavía no tiene el chat de AURI (vive en el negocio), así que AURI abre el buscador y los comandos del panel (Ctrl K).
 */
export function OpsAuriHero({ date, greeting, name, summary, actions }: { date: string; greeting: string; name: string; summary: string; actions?: ReactNode }) {
  const { openSearch } = useOps();
  return (
    <section
      aria-labelledby="ops-saludo"
      className="relative isolate mb-5 grid items-center gap-6 overflow-hidden rounded-sheet bg-accent-subtle/40 px-6 py-7 min-[820px]:grid-cols-[minmax(0,1fr)_auto] min-[820px]:px-9 min-[820px]:py-8"
      style={{ backgroundImage: "radial-gradient(90% 130% at 100% 10%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 75%), radial-gradient(70% 100% at 0% 100%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 75%)" }}
    >
      <div className="nx-rise grid min-w-0 gap-4">
        <p className="font-mono text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{date}</p>
        <h1 id="ops-saludo" className="font-display text-[clamp(1.875rem,4.2vw,3rem)] font-bold leading-[1.04] tracking-[-0.035em] text-balance text-foreground">
          <RevealText parts={[`${greeting}, `, { text: name, gold: true }]} />
        </h1>
        <p className="max-w-[52ch] text-base text-muted-foreground">{summary}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openSearch}
            data-press=""
            className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-colors duration-(--d2) hover:bg-foreground/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Pregúntale a AURI
          </button>
          {actions}
        </div>
      </div>

      {/* AURI grande desde 820 px; en el celular basta el botón de arriba. */}
      <button
        type="button"
        onClick={openSearch}
        aria-label="Abrir AURI: buscar y ejecutar comandos del panel"
        className="eyt-gold relative hidden shrink-0 place-items-center rounded-full outline-none transition-transform duration-(--d2) hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none min-[820px]:grid"
        style={{ width: 220, height: 220 }}
      >
        <span aria-hidden="true" className="absolute rounded-full bg-card/35" style={{ width: 220, height: 220 }} />
        <span aria-hidden="true" className="absolute rounded-full bg-card/50" style={{ width: 160, height: 160 }} />
        <span className="size-[128px]">
          <EyeTracker fit decorative poke={false} follow={50} size={128} shape="Ball" eyeScale={1.2} mood="joy" />
        </span>
      </button>
    </section>
  );
}
