import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import { Wordmark } from "@/components/atoms/wordmark";

/**
 * Plantilla de páginas públicas (precios y futuras de marketing): firma de
 * marca y tema arriba, contenido centrado a 1180 px y pie legal.
 */
export function PublicLayout({ children, footerNote }: { children: ReactNode; footerNote?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1180px] px-[max(16px,env(safe-area-inset-left,0px))]">
        <header className="flex items-center gap-3 py-[18px]">
          <Link href="/" aria-label="NEXUS THRIVE">
            <Wordmark />
          </Link>
          <span className="flex-1" />
          <Link href="/sign-in" className="px-1 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            Iniciar sesión
          </Link>
          <ThemeToggle className="border border-border" />
        </header>
        {children}
        <footer className="flex flex-wrap justify-between gap-3 pb-24 pt-7 text-xs text-muted-foreground min-[960px]:pb-8">
          <span>© {new Date().getFullYear()} NEXUS THRIVE · nexusthrive.com.co</span>
          {footerNote}
        </footer>
      </div>
    </div>
  );
}
