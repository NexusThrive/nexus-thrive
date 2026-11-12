import type { ReactNode } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { ScrollHint } from "@/components/providers/scroll-hint";
import { RevealText } from "@/components/atoms/reveal-text";
import { cn } from "@/lib/utils";
import { stepCaption } from "@/lib/experience/onboarding/guide";
import auth from "./auth-layout.module.css";
import styles from "./onboarding-split.module.css";

/**
 * Plantilla del onboarding: el mismo lenguaje del acceso (contenedor blanco flotando sobre un fondo difuminado) con dos cuadros redondeados.
 *
 * - Escritorio: a la izquierda el cuadro de AURI (`scene`: ella explicando cada paso y el relleno de datos que se arma en vivo); a la
 *   derecha el cuadro del formulario con el progreso arriba, el contenido que se desplaza dentro y las acciones fijas abajo.
 * - Móvil: una sola columna a todo el alto (la escena se oculta para dejar el contenido sin distracciones), con «atrás» y el progreso
 *   arriba y las acciones fijas abajo (respeta el área segura).
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
  /** Escena de AURI y el relleno de datos (solo escritorio). */
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
    <div className={`${auth.page} relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-2 py-2 font-sans text-foreground sm:px-6 sm:py-4 lg:h-dvh`}>
      <span className={auth.backdrop} aria-hidden="true">
        <i className={auth.blobA} />
        <i className={auth.blobB} />
        <i className={auth.blobC} />
      </span>

      <div className={cn(auth.shell, "lg:flex-[0_1_880px]")}>
        <div className="grid h-full min-h-[calc(100dvh-16px)] gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <aside className={cn(styles.stage, "hidden lg:flex")} aria-label="AURI te guía">
            <span className={styles.fx} aria-hidden="true">
              <i className={styles.blobA} />
              <i className={styles.blobB} />
              <i className={styles.dots} />
            </span>
            {scene}
          </aside>

          <section className={cn(styles.form, "lg:min-h-0")}>
            <header className="flex items-center gap-3 px-5 pb-2 pt-5 sm:px-8 sm:pt-7">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Volver al paso anterior"
                  data-press=""
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-card text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ArrowLeft aria-hidden="true" className="size-[18px]" />
                </button>
              ) : null}
              {showProgress ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <p className="truncate text-xs font-semibold text-foreground">{stepCaption(current, steps.length, steps[current - 1])}</p>
                  {/* La línea de los pasos: cada paso es un punto; lo hecho se rellena en oro y la línea avanza con él. */}
                  <ol aria-label="Progreso" className="flex items-center">
                    {steps.map((label, i) => {
                      const n = i + 1;
                      const done = n < current;
                      const active = n === current;
                      return (
                        <li key={label} aria-current={active ? "step" : undefined} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
                          <span
                            className={cn(
                              "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-all duration-500",
                              done && "bg-accent text-ink",
                              active && "bg-card text-foreground ring-2 ring-accent ring-offset-2 ring-offset-[color-mix(in_srgb,var(--surface-muted)_78%,var(--card))]",
                              !done && !active && "bg-border-strong/40 text-muted-foreground",
                            )}
                          >
                            {done ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : n}
                            <span className="sr-only">{label}{done ? " (completado)" : ""}</span>
                          </span>
                          {i < steps.length - 1 ? <span aria-hidden="true" className={cn("mx-1.5 h-0.5 flex-1 rounded-full transition-colors duration-500", done ? "bg-accent" : "bg-border-strong/40")} /> : null}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : (
                <span className="flex-1" />
              )}
            </header>

            <main className="relative mx-auto flex min-h-0 w-full max-w-[640px] flex-1 flex-col overflow-y-auto px-5 pb-6 pt-4 sm:px-8 lg:pt-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div key={stepKey} className="mb-6">
                {eyebrow ? (
                  <p className="nx-rise mb-2 text-xs font-semibold text-accent-text">{eyebrow}</p>
                ) : null}
                <RevealText as="h1" parts={[title]} className="font-display text-[clamp(26px,3.4vw,34px)] font-semibold leading-[1.1] tracking-[-0.02em]" />
                {description ? (
                  <p className="nx-rise mt-2 max-w-[58ch] text-[14.5px] text-muted-foreground" style={{ ["--i" as string]: 2 }}>
                    {description}
                  </p>
                ) : null}
              </div>
              <div key={`${stepKey}-body`} className="nx-rise flex min-h-0 flex-1 flex-col" style={{ ["--i" as string]: 3 }}>
                {children}
              </div>
              {/* Sin barra de scroll al lado: un círculo con flecha, abajo en el centro, avisa que hay más contenido. */}
              <ScrollHint />
            </main>

            {actions ? (
              <footer className="px-5 pb-[max(20px,env(safe-area-inset-bottom,0px))] pt-4 sm:px-8">
                <div className="mx-auto flex w-full max-w-[640px] items-center gap-3 border-t border-border/60 pt-4">{actions}</div>
              </footer>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
