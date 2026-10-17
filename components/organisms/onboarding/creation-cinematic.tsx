"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { NMark } from "@/components/atoms/n-mark";
import { RevealText } from "@/components/atoms/reveal-text";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";

const MESSAGES = ["Creando negocio…", "Activando tus módulos…", "Preparando tu panel…", "Últimos detalles…"];

export type CinematicStatus = "creating" | "ready" | "error";

/**
 * Cinemática al terminar el onboarding, a pantalla completa sobre tinta:
 *
 * 1. `creating`: la N se traza en bucle con "Creando negocio…".
 * 2. `ready`: la N se llena y sube; aparece "Continuar".
 * 3. Al continuar: "Bienvenido a Thrive {plan}" letra por letra y el botón
 *    para entrar (la recarga completa dispara la intro de la N de la app).
 * 4. `error`: mensaje y volver a la confirmación.
 */
export function CreationCinematic({
  status,
  planName,
  businessName,
  error,
  onEnter,
  onBack,
}: {
  status: CinematicStatus;
  planName: string;
  businessName: string;
  error?: string;
  onEnter: () => void;
  onBack: () => void;
}) {
  const [welcome, setWelcome] = useState(false);
  const [message, setMessage] = useState(0);

  useEffect(() => {
    if (status !== "creating") return;
    const id = window.setInterval(() => setMessage((m) => (m + 1) % MESSAGES.length), 1100);
    return () => window.clearInterval(id);
  }, [status]);

  const ready = status === "ready";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={welcome ? `Bienvenido a Thrive ${planName}` : "Creando tu negocio"}
      className="fixed inset-0 z-[120] grid place-items-center overflow-hidden bg-ink text-white motion-safe:animate-[nx-view-in_.5s_var(--nx-ease-out)]"
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[90px] transition-opacity duration-1000",
          ready ? "opacity-100" : "opacity-40",
        )}
      />
      <div className="relative flex flex-col items-center px-6 text-center">
        <div
          className={cn(
            "transition-transform duration-[1100ms] ease-[var(--nx-ease-out)] motion-reduce:transition-none",
            ready && (welcome ? "-translate-y-6 scale-[.55]" : "-translate-y-10 scale-75"),
          )}
        >
          <NMark size={132} state={status === "creating" ? "loop" : "done"} className="text-white" />
        </div>

        <div className="mt-8 min-h-[150px]">
          {status === "creating" ? (
            <p key={message} aria-live="polite" className="nx-rise text-[15px] font-medium text-white/75">
              {MESSAGES[message]}
            </p>
          ) : null}

          {status === "error" ? (
            <div className="nx-rise grid justify-items-center gap-4">
              <p role="alert" className="max-w-[40ch] text-[15px] text-white/80">
                {error ?? "No pudimos crear tu negocio. Inténtalo de nuevo."}
              </p>
              <button type="button" onClick={onBack} className={buttonVariants({ variant: "outline", className: "border-white/25 text-white hover:bg-white/10" })}>
                Volver a revisar
              </button>
            </div>
          ) : null}

          {ready && !welcome ? (
            <div className="grid justify-items-center gap-5">
              <RevealText as="p" parts={["Tu negocio está listo"]} className="font-display text-[clamp(24px,4vw,32px)] font-bold" />
              <button
                type="button"
                onClick={() => setWelcome(true)}
                data-mag=""
                autoFocus
                className={cn(buttonVariants({ variant: "accent", size: "lg" }), "nx-rise min-w-48")}
                style={{ ["--i" as string]: 6 }}
              >
                Continuar
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          {ready && welcome ? (
            <div className="grid justify-items-center gap-3">
              <p className="nx-rise font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">Bienvenido a</p>
              <RevealText
                as="h1"
                parts={["Thrive ", { text: planName, gold: true }]}
                className="font-display text-[clamp(34px,7vw,64px)] font-bold leading-none tracking-[-0.02em]"
              />
              <p className="nx-rise mt-1 text-[15px] text-white/70" style={{ ["--i" as string]: 8 }}>
                {businessName} ya está en NEXUS.
              </p>
              <button
                type="button"
                onClick={onEnter}
                data-mag=""
                autoFocus
                className={cn(buttonVariants({ variant: "accent", size: "lg" }), "nx-rise mt-5 min-w-56")}
                style={{ ["--i" as string]: 12 }}
              >
                Entrar a mi negocio
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
