"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/molecules/dropdown-menu";
import { cn } from "@/lib/utils";

export type SwitcherBusiness = { slug: string; name: string };

const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || "N";

/**
 * Selector de negocio de la navbar (PC): un cuadro con la inicial y el nombre
 * que se despliega con los negocios de la cuenta y «Crear otro negocio». Se
 * dibuja con divs (no es un `<select>` nativo) sobre el menú de Radix, así
 * conserva flechas, Enter, Escape y el foco de vuelta al cuadro.
 *
 * Una cuenta puede tener varias organizaciones, cada una con sus datos, equipo
 * y plan. Elegir otra conserva la sesión y la recuerda como la última usada;
 * «Crear otro negocio» abre el asistente de alta de una organización nueva.
 */
export function BusinessSwitcher({
  currentSlug,
  currentName,
  businesses,
  onSwitch,
  className,
}: {
  currentSlug: string;
  currentName: string;
  businesses: SwitcherBusiness[];
  /** Se avisa al servidor del cambio (recordar la última organización usada). */
  onSwitch?: (slug: string) => void | Promise<void>;
  className?: string;
}) {
  const router = useRouter();
  // Si la lista no trae el actual (p. ej. staff entrando a un negocio), se agrega.
  const list = businesses.some((b) => b.slug === currentSlug)
    ? businesses
    : [{ slug: currentSlug, name: currentName }, ...businesses];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-press=""
          className={cn(
            "group hidden h-10 max-w-[220px] min-w-0 items-center gap-2.5 rounded-md border border-border bg-surface-muted py-0 pl-1.5 pr-2.5 text-left transition-[border-color,background-color] duration-200 outline-none hover:border-border-input hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:border-border-input data-[state=open]:bg-surface md:flex",
            className,
          )}
        >
          {/* La inicial va por CSS (attr): decora, no es parte del nombre accesible. */}
          <span aria-hidden="true" data-initial={initialOf(currentName)} className="grid size-7 shrink-0 place-items-center rounded-[4px] bg-primary font-display text-[13px] font-bold text-primary-foreground before:content-[attr(data-initial)]" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{currentName}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(300px,calc(100vw-24px))] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <DropdownMenuLabel className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Tus negocios
        </DropdownMenuLabel>
        {list.map((business) => {
          const current = business.slug === currentSlug;
          return (
            <DropdownMenuItem
              key={business.slug}
              onSelect={() => {
                if (current) return;
                void onSwitch?.(business.slug);
                router.push(`/${business.slug}`);
              }}
              aria-current={current ? "true" : undefined}
              className="min-h-12 items-center gap-3 px-2.5"
            >
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-[4px] bg-primary font-display text-sm font-bold text-primary-foreground">
                {initialOf(business.name)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">{business.name}</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">{business.slug}</span>
              </span>
              {current ? <Check aria-hidden="true" className="size-4 shrink-0 text-accent-text" /> : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-12 items-center gap-3 px-2.5">
          <Link href="/onboarding?nuevo=1">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-[4px] border border-dashed border-border-strong">
              <Plus className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm font-medium text-foreground">Crear otro negocio</span>
              <span className="text-xs text-muted-foreground">Una organización nueva, con su propio equipo</span>
            </span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
