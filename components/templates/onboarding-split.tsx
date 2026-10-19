import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { RevealText } from "@/components/atoms/reveal-text";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import { Wordmark } from "@/components/atoms/wordmark";
import { StepRail } from "@/components/molecules/step-rail";
import { cn } from "@/lib/utils";

/**
 * Plantilla del onboarding en pantalla dividida.
 *
 * - Escritorio: a la izquierda el panel de marca (tinta) con la escena
 *   animada del paso y el progreso vertical; a la derecha el formulario con
 *   su barra de acciones fija abajo.
 * - Móvil (tipo app): ocupa todo el alto, barra superior con "atrás" y el
 *   progreso en segmentos, y las acciones fijas abajo (respeta el área
 *   segura); la escena se oculta para dejar el contenido sin distracciones.
 */
export function OnboardingSplit({
  scene,
  steps,
  current,
  eyebrow,
  title,
  description,
  onBack,
  actions,
  stepKey,
  children,
}: {
  /** Escena animada del panel de marca (solo escritorio). */
  scene: ReactNode;
  steps: readonly string[];
  /** 1..n; 0 oculta el progreso (presentación). */
  current: number;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Sin `onBack` no se muestra "atrás". */
  onBack?: () => void;
  /** Barra de acciones fija abajo. */
  actions?: ReactNode;
  /** Cambia en cada paso: reinicia las animaciones de entrada. */
  stepKey: string;
  children: ReactNode;
}) {
  const showProgress = current > 0;
  return (
    <div className="min-h-dvh bg-background font-sans text-foreground lg:grid lg:grid-cols-[minmax(400px,42%)_1fr]">
      <aside className="relative hidden h-dvh overflow-hidden bg-ink text-white lg:sticky lg:top-0 lg:flex lg:flex-col lg:p-10 xl:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_20%,rgba(212,175,55,.14),transparent_70%),radial-gradient(50%_40%_at_80%_90%,rgba(212,175,55,.08),transparent_70%)]"
        />
        <Wordmark size={26} className="relative text-white [&_svg]:text-white!" />
        <div className="relative flex flex-1 items-center justify-center py-8">{scene}</div>
        {showProgress ? <StepRail steps={steps} current={current} className="relative" /> : null}
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/85 px-[max(16px,env(safe-area-inset-left,0px))] pb-3 pt-[max(12px,env(safe-area-inset-top,0px))] backdrop-blur-md lg:static lg:px-14 lg:pt-8 lg:backdrop-blur-none">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Volver al paso anterior"
              data-press=""
              className="-ml-1.5 grid size-9 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-muted"
            >
              <ArrowLeft aria-hidden="true" className="size-[18px]" />
            </button>
          ) : (
            <Wordmark size={22} className="lg:hidden" />
          )}
          {showProgress ? (
            <ol aria-hidden="true" className="flex flex-1 gap-1.5 lg:hidden">
              {steps.map((label, i) => (
                <li
                  key={label}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-500",
                    i + 1 <= current ? "bg-accent" : "bg-border",
                  )}
                />
              ))}
            </ol>
          ) : (
            <span className="flex-1" />
          )}
          {showProgress ? (
            <span className="hidden font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:inline">
              Paso {current} de {steps.length}
            </span>
          ) : null}
          <span className="hidden flex-1 lg:block" />
          <ThemeToggle className="border border-border" />
        </header>

        <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-[max(16px,env(safe-area-inset-left,0px))] pb-6 pt-2 lg:px-14 lg:pt-6">
          <div key={stepKey} className="mb-6">
            {eyebrow ? (
              <p className="nx-rise mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-text">
                {eyebrow}
              </p>
            ) : null}
            <RevealText
              as="h1"
              parts={[title]}
              className="font-display text-[clamp(26px,4vw,34px)] font-bold leading-[1.1] tracking-[-0.02em]"
            />
            {description ? (
              <p className="nx-rise mt-2 max-w-[58ch] text-[14.5px] text-muted-foreground" style={{ ["--i" as string]: 2 }}>
                {description}
              </p>
            ) : null}
          </div>
          <div key={`${stepKey}-body`} className="nx-rise flex min-h-0 flex-1 flex-col" style={{ ["--i" as string]: 3 }}>
            {children}
          </div>
        </main>

        {actions ? (
          <footer className="sticky bottom-0 z-20 border-t border-border bg-background/90 px-[max(16px,env(safe-area-inset-left,0px))] pb-[max(14px,env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-md lg:px-14">
            <div className="mx-auto flex w-full max-w-[720px] items-center gap-3">{actions}</div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
