"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import { Wordmark } from "@/components/atoms/wordmark";
import type { AuthMode } from "@/components/molecules/auth-mode-switch";
import { AuthBrandPanel } from "@/components/organisms/auth-brand-panel";

/**
 * Pantalla de acceso dividida: a la izquierda el panel de marca (desde 1024
 * px), a la derecha el formulario sin tarjeta; en iniciar sesión, debajo, la entrada
 * para quien es nuevo. El modo sale de la URL; como la plantilla vive en el layout del grupo
 * `(auth)`, el panel no se desmonta al cambiar y anima la transición.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mode: AuthMode = pathname?.startsWith("/sign-up") ? "sign-up" : "sign-in";

  return (
    <div className="grid min-h-screen grid-cols-1 bg-surface lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)]">
      <AuthBrandPanel mode={mode} />
      <main className="flex min-h-screen min-w-0 flex-col bg-surface">
        <header className="flex items-center gap-2.5 px-[max(20px,env(safe-area-inset-left,0px))] py-[18px]">
          <Wordmark size={26} className="lg:invisible" />
          <span className="flex-1" />
          <a href="mailto:soporte@nexusthrive.com.co" className="px-1 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            Ayuda
          </a>
          <ThemeToggle className="border border-border" />
        </header>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-[max(20px,env(safe-area-inset-left,0px))] pb-6 pt-2">
          <div key={mode} className="nx-view-in">
            {children}
          </div>
          {mode === "sign-in" ? (
            <Link
              href="/sign-up"
              className="group mt-6 flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-display text-sm font-semibold text-foreground">¿Primera vez en Nexus?</span>
                <span className="block text-ui text-muted-foreground">Crea el espacio de tu negocio. 15 días gratis, sin tarjeta.</span>
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground transition-transform group-hover:translate-x-0.5">
                <ArrowRight aria-hidden="true" className="size-4" />
              </span>
            </Link>
          ) : null}
        </div>
        <footer className="flex flex-wrap justify-center gap-[18px] px-5 pb-[calc(18px+env(safe-area-inset-bottom,0px))] pt-4 text-xs text-muted-foreground">
          <span>Términos</span>
          <span>Privacidad</span>
          <span>Español (CO)</span>
        </footer>
      </main>
    </div>
  );
}
