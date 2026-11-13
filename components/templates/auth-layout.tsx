"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LifeBuoy } from "lucide-react";
import { BrandLogo } from "@nexus/brand/BrandLogo";
import type { AuthMode } from "@/components/molecules/auth-mode-switch";
import { AuthBrandPanel } from "@/components/organisms/auth-brand-panel";
import styles from "./auth-layout.module.css";

/**
 * Pantalla de acceso: un contenedor blanco grande sobre fondo blanco y, adentro, una grilla de tarjetas redondeadas.
 * A la izquierda (desde 1024 px) AURI en su cuadro; a la derecha el formulario arriba y, debajo, una tarjeta pequeña con la otra
 * entrada (crear cuenta o iniciar sesión) y la ayuda. El modo sale de la URL; como la plantilla vive en el layout del grupo `(auth)`, el
 * panel de AURI no se desmonta al cambiar y su guion se reinicia.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mode: AuthMode = pathname?.startsWith("/sign-up") ? "sign-up" : "sign-in";
  const signIn = mode === "sign-in";

  return (
    <div className={`${styles.page} relative isolate flex h-dvh flex-col items-center justify-center overflow-hidden px-3 py-4 sm:px-8`}>
      <div className={styles.shell}>
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <AuthBrandPanel mode={mode} />

          <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
            <section className={styles.form}>
              {/* El logo oficial: la N con THRIVE debajo, en una pieza blanca. */}
              <span className={styles.logo}>
                <BrandLogo variant="lockup" size={44} className="text-primary" />
              </span>
              <div className="mx-auto flex min-h-0 w-full max-w-[440px] flex-1 flex-col overflow-y-auto py-5 [scrollbar-width:none]">
                {/* `my-auto` centra en vertical sin cortar la parte de arriba cuando el contenido es más alto que el espacio. */}
                <div key={mode} className="nx-view-in my-auto">
                  {children}
                </div>
              </div>
            </section>

            <div className={styles.tile}>
              <Link href={signIn ? "/sign-up" : "/sign-in"} className="group flex min-w-0 flex-1 items-center gap-4 rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-semibold text-foreground">{signIn ? "¿Primera vez en Nexus?" : "¿Ya tienes una cuenta?"}</span>
                  <span className="block text-ui text-muted-foreground">{signIn ? "Crea el espacio de tu negocio. 15 días gratis, sin tarjeta." : "Inicia sesión y sigue donde lo dejaste."}</span>
                </span>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-ink transition-transform group-hover:translate-x-0.5">
                  <ArrowRight aria-hidden="true" className="size-5" />
                </span>
              </Link>
              <a href="mailto:soporte@nexusthrive.com.co" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card px-4 text-ui font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <LifeBuoy aria-hidden="true" className="size-4" />
                Ayuda
              </a>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-3 flex shrink-0 flex-wrap justify-center gap-[18px] text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} NEXUS THRIVE</span>
        <span>Términos</span>
        <span>Privacidad</span>
        <span>Español (CO)</span>
      </footer>
    </div>
  );
}
