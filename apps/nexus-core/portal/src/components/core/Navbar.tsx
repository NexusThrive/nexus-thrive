import Link from "next/link";
import { Logo } from "@nexus/ui";
import { SelectorNegocio } from "@/components/core/SelectorNegocio";
import { MenuCuenta } from "@/components/core/MenuCuenta";

/**
 * NAVBAR (fija arriba, igual en toda la app) — contexto GLOBAL:
 * logo → "Mis negocios", selector de negocio, cuenta.
 * Responde "¿quién soy y en qué negocio estoy?". No navega dentro del
 * negocio: eso es trabajo del SIDEBAR.
 */
export function Navbar({
  org,
  orgs,
  member,
}: {
  org: { id: string; nombre: string; slug: string };
  orgs: { id: string; nombre: string; slug: string }[];
  member: { nombre: string; email: string };
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-nexus-border bg-nexus-surface px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="shrink-0 transition hover:opacity-85">
          <span className="sr-only">Nexus — ir al panel principal</span>
          <Logo size="sm" />
        </Link>
        <div className="hidden h-5 w-px bg-nexus-border/70 sm:block" />
        <SelectorNegocio orgActiva={org} orgs={orgs} />
      </div>

      <MenuCuenta nombre={member.nombre} email={member.email} />
    </header>
  );
}