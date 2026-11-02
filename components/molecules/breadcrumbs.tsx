import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/**
 * Ruta de navegación («Inicio › Finanzas › Gastos»): lista ordenada dentro de un
 * `<nav>`; el último elemento es la página actual (`aria-current="page"`, sin
 * enlace). Los pasos intermedios sin `href` son categorías: se muestran, no se enlazan.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Ruta de navegación" className={cn("mb-5 text-ui text-muted-foreground", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2.5">
              {index > 0 ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 opacity-50" /> : null}
              {item.href && !last ? (
                <Link href={item.href} className="truncate rounded-sm px-0.5 py-1 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn("truncate px-0.5 py-1", last && "font-medium text-foreground")}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
