"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Plus, Search } from "lucide-react";
import { N_PATH, THRIVE_LETTERS } from "@nexus/brand/BrandLogo";
import { Button } from "@/components/atoms/button";
import { Kbd } from "@/components/atoms/kbd";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/molecules/dropdown-menu";
import { RouteBar } from "@/components/molecules/route-bar";
import { useQuickCreate } from "@/components/organisms/quick-create-host";
import { useShell } from "@/components/providers/shell-context";
import { cn } from "@/lib/utils";
import styles from "./app-topbar.module.css";

const noop = () => () => undefined;

/**
 * Menú de la cuenta de Clerk. Clerk lo monta solo en el navegador, así que el HTML
 * del servidor no lo trae y React avisaba de «hydration mismatch». Se pinta tras
 * hidratar y, mientras tanto, un hueco del mismo tamaño evita el salto de diseño.
 */
function AccountButton() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return <span aria-hidden="true" className="inline-block size-[34px] rounded-[4px] bg-surface-muted" />;
  return <UserButton appearance={{ elements: { userButtonAvatarBox: "size-[34px] rounded-[4px]" } }} />;
}

/**
 * Navbar global: fija, a todo el ancho, con fondo sólido y por encima de la
 * barra lateral (`--z-topbar`). A la izquierda, la celda de marca con el logo
 * real (la N con THRIVE debajo; con el riel, THRIVE se desvanece y queda la N más chica) sobre el mismo fondo y ancho que la barra
 * lateral, así forman una sola pieza. En el centro, el buscador (Ctrl K) y
 * «Crear» con todas las acciones del negocio (menú que cuelga del botón); a la derecha, notificaciones,
 * el selector de negocio, tema y cuenta. En móvil se compacta: logo, negocio y sección, y la búsqueda; «Crear»
 * vive en la barra inferior. La barra de ruta corre por el borde al navegar.
 */
export function AppTopbar({ actions, search, switcher }: { actions?: ReactNode; /** Selector de negocio (PC), a la derecha. */ switcher?: ReactNode; /** Buscador en línea de PC (`NavbarSearch`); sin él, el botón abre la paleta modal. */ search?: ReactNode }) {
  const { title, brandName, hrefFor, openSearch, quickActions, createActions = quickActions } = useShell();
  const router = useRouter();
  const quick = useQuickCreate();

  return (
    <header
      data-app-topbar=""
      className="fixed inset-x-0 top-0 z-(--z-topbar) flex h-[calc(var(--topbar-height)+env(safe-area-inset-top,0px))] items-stretch pt-[env(safe-area-inset-top,0px)]"
    >
      <Link
        href={hrefFor("")}
        aria-label={`${brandName}: inicio`}
        className={cn(styles.brand, "pl-[max(16px,env(safe-area-inset-left,0px))] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:pl-3")}
      >
        <span className={cn(styles.logo, styles.mark)}>
          <svg role="img" aria-label="NEXUS THRIVE" viewBox="387.6 239.9 744.4 779.5" shapeRendering="geometricPrecision">
            <path d={N_PATH} fill="currentColor" />
            <g className={styles.letters}>
              {THRIVE_LETTERS.map((l, i) => (
                <path key={i} transform={`translate(${l.x} ${l.y})`} d={l.d} fill="currentColor" />
              ))}
            </g>
          </svg>
        </span>
        <span className={cn(styles.ident, "flex min-w-0 flex-col leading-tight")}>
          <b className="truncate font-display text-sm font-semibold">{brandName}</b>
          <small className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <i aria-hidden="true" className="inline-block size-1.5 -skew-x-[24deg] bg-accent" />
            {title}
          </small>
        </span>
      </Link>

      <div className="relative flex min-w-0 flex-1 items-center justify-end gap-2 border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-3 text-[var(--sidebar-fg)] md:gap-4 md:px-6 xl:px-8">
        {/* Izquierda: contexto (negocio) y búsqueda. `suppressHydrationWarning`:
            Proton Pass marca con `data-protonpass-form` los contenedores con
            botones/inputs antes de que React hidrate y dispara el aviso de
            "hydration mismatch"; no es nuestro HTML (ver `CheckinStation`). */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 md:justify-start" suppressHydrationWarning>
          {switcher ? <div className="hidden shrink-0 md:block" suppressHydrationWarning>{switcher}</div> : null}
          {switcher ? <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-[var(--sidebar-border)] md:block" /> : null}
          <div className="min-w-0 md:w-full md:max-w-[520px]" suppressHydrationWarning>
            {search ?? (
              <button
                type="button"
                onClick={openSearch}
                className="group hidden h-10 w-full items-center gap-2.5 rounded-md border border-border bg-surface-muted pl-3.5 pr-2.5 text-[13px] text-muted-foreground transition-[border-color,color,background-color] duration-200 hover:border-border-input hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:flex"
              >
                <Search aria-hidden="true" className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span className="truncate">Buscar clientes, pagos, gastos o secciones…</span>
                <Kbd className="ml-auto shrink-0">Ctrl K</Kbd>
              </button>
            )}
            <button
              type="button"
              onClick={openSearch}
              aria-label="Buscar"
              data-press=""
              className="grid size-10 place-items-center rounded-md hover:bg-surface-muted md:hidden"
            >
              <Search aria-hidden="true" className="size-[18px]" />
            </button>
          </div>
        </div>

        {/* Derecha: acción principal, avisos y preferencias, y la cuenta al final. */}
        <div className="flex shrink-0 items-center justify-end gap-2">
          {createActions.length > 0 ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="accent" className="hidden md:inline-flex" data-press="">
                  <Plus aria-hidden="true" className="size-4" />
                  Crear
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-[min(340px,calc(100vw-24px))] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <DropdownMenuLabel className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Crear nuevo
                </DropdownMenuLabel>
                {createActions.map((action) => (
                  <DropdownMenuItem
                    key={action.key}
                    onSelect={() => {
                      if (!quick.open(action.key)) router.push(hrefFor(action.href));
                    }}
                    className="min-h-12 items-center gap-3 px-2.5"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-muted text-foreground">
                      <action.icon aria-hidden="true" strokeWidth={1.6} className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-sm font-medium text-foreground">{action.label}</span>
                      <span className="truncate text-xs text-muted-foreground">{action.hint}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-[var(--sidebar-border)] md:block" />
          {actions}
          <ThemeToggle />
          <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-[var(--sidebar-border)] md:block" />
          <AccountButton />
        </div>

      </div>

      {/* Debajo de la navbar, fuera de su fila y desde el borde de la barra lateral (`--sw`): no se mete en ella ni deforma la navbar. */}
      <RouteBar className="absolute inset-x-auto left-[var(--sw)] right-0 top-full" />
    </header>
  );
}
