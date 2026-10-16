import type { ReactNode } from "react";
import { RevealText } from "@/components/atoms/reveal-text";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import { Wordmark } from "@/components/atoms/wordmark";
import { Eyebrow } from "@/components/molecules/page-header";

/**
 * Plantilla de los flujos de configuración (onboarding): la firma de marca y
 * el tema arriba (como el acceso), antetítulo con el paso, título letra por
 * letra, el indicador de progreso y el contenido del paso en una tarjeta.
 */
export function OnboardingLayout({
  eyebrow,
  title,
  description,
  progress,
  footer,
  width = "max-w-3xl",
  children,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  progress?: ReactNode;
  /** Nota bajo la tarjeta. */
  footer?: ReactNode;
  width?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="flex items-center gap-2.5 px-[max(20px,env(safe-area-inset-left,0px))] py-[18px]">
        <Wordmark size={26} />
        <span className="flex-1" />
        <ThemeToggle className="border border-border" />
      </header>
      <main className={`mx-auto flex w-full ${width} flex-col px-4 pb-12 pt-4 sm:px-6`}>
        <div className="mb-7">
          <Eyebrow>{eyebrow}</Eyebrow>
          <RevealText
            key={title}
            as="h1"
            parts={[title]}
            className="font-display text-[clamp(26px,4.4vw,36px)] font-bold leading-[1.1] tracking-[-0.02em]"
          />
          {description ? <p className="nx-rise mt-2 max-w-[56ch] text-muted-foreground">{description}</p> : null}
        </div>
        {progress}
        {children}
        {footer ? <p className="mt-6 text-center text-xs text-muted-foreground">{footer}</p> : null}
      </main>
    </div>
  );
}
