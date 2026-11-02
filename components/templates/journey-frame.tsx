import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import { Wordmark } from "@/components/atoms/wordmark";
import { GrowthLine } from "@/components/organisms/journey/growth-line";
import { cn } from "@/lib/utils";
import styles from "./journey-frame.module.css";

/**
 * Pantalla del recorrido de alta de NEXUS THRIVE (acceso, preguntas, onboarding): una sola columna centrada, una cosa a la
 * vez, y la línea de crecimiento al fondo que sube con el avance. Sin paneles divididos ni escenas: el foco es la pregunta.
 *
 * - `progress` (0..1): altura de la línea de crecimiento.
 * - `stepKey` + `dir`: al cambiar, el contenido entra desde el sentido del avance.
 * - `trail`: lo que la persona ya respondió (se acumula arriba, como un recibo que crece).
 * - `footer`: acciones fijas abajo (móvil) o al pie del contenido (escritorio).
 */
export function JourneyFrame({
  progress,
  stepKey,
  dir = 1,
  status,
  trail,
  onBack,
  footer,
  wide = false,
  children,
}: {
  progress: number;
  stepKey: string;
  dir?: 1 | -1;
  /** Texto corto del avance («Paso 2 de 4»), también para lectores de pantalla. */
  status?: string;
  trail?: ReactNode;
  onBack?: () => void;
  footer?: ReactNode;
  /** Contenido más ancho (formularios con dos columnas, catálogos). */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.root}>
      <div className={styles.growth}>
        <GrowthLine progress={progress} />
      </div>
      <header className={styles.top}>
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Volver" className={styles.back}>
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
        ) : null}
        <Wordmark size={24} />
        <span className="flex-1" />
        {status ? (
          <p className="hidden font-mono text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:block" aria-live="polite">
            {status}
          </p>
        ) : null}
        <a href="mailto:soporte@nexusthrive.com.co" className="px-1 py-1.5 text-ui font-medium text-muted-foreground hover:text-foreground">
          Ayuda
        </a>
        <ThemeToggle className="border border-border" />
      </header>

      <main className={cn(styles.main, wide && styles.wide)}>
        {trail ? <div className={styles.trail}>{trail}</div> : null}
        <div key={stepKey} className={styles.step} data-dir={dir === 1 ? "fwd" : "back"}>
          {children}
        </div>
      </main>

      {footer ? (
        <footer className={styles.footer}>
          <div className={cn(styles.footerInner, wide && styles.wide)}>{footer}</div>
        </footer>
      ) : null}
    </div>
  );
}
