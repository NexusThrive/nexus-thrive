import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { CAPABILITIES } from "@/lib/core/capabilities/registry";
import { cn } from "@/lib/utils";

/** Cuántas sugerencias se muestran a la vez. */
const MAX = 3;

/**
 * Módulos que le convienen al negocio y aún no usa: los de la receta de su rubro que están apagados, con qué hacen y un
 * enlace a Funciones para encenderlos. Si no hay nada que sugerir, no pinta nada. Es del servidor (sin estado).
 */
export function ModuleSuggestions({
  suggestedIds,
  activeModules,
  functionsHref,
  className,
}: {
  /** Módulos de la receta del rubro (`suggestedModules`). */
  suggestedIds: readonly string[];
  activeModules: readonly string[];
  functionsHref: string;
  className?: string;
}) {
  const items = suggestedIds
    .filter((id) => !activeModules.includes(id))
    .map((id) => CAPABILITIES.find((c) => c.id === id))
    .filter((c): c is (typeof CAPABILITIES)[number] => Boolean(c) && c!.status !== "PLANNED" && c!.id !== "dashboard")
    .slice(0, MAX);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="module-suggestions-title" className={cn("nx-rise flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card", className)}>
      <div className="flex items-start gap-3 border-b border-border px-4 py-3.5 sm:px-[18px] sm:py-4">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md bg-accent-subtle text-accent-text">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 id="module-suggestions-title" className="font-display text-[15px] font-semibold text-foreground">Módulos para tu negocio</h2>
          <p className="text-xs text-muted-foreground">Sugeridos según tu rubro; actívalos cuando quieras.</p>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={functionsHref} className="group flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-[18px]">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-muted">
                <item.icon className="size-4" strokeWidth={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ui font-semibold">{item.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.pitch}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto border-t border-border px-4 py-2.5 sm:px-[18px]">
        <Link href={functionsHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>Ver todas las funciones</Link>
      </div>
    </section>
  );
}
