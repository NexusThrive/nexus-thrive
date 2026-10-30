import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * «Abrir en el panel completo →»: la salida de un mini-modal de creación hacia
 * la sección del módulo (donde está todo: historial, filtros, más campos). Va
 * en la descripción del panel; quien lo usa cierra el modal al navegar.
 */
export function FullPanelLink({ href, className }: { href: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-0.5 font-medium text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", className)}>
      Abrir en el panel completo <ArrowUpRight aria-hidden="true" className="size-3.5" />
    </Link>
  );
}
