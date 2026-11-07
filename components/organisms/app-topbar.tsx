"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Plus, Search } from "lucide-react";
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
import { MobileTopbarSearch } from "@/components/organisms/mobile-topbar-search";
import { AccountButton } from "@/components/molecules/account-button";
import { RouteBar } from "@/components/molecules/route-bar";
import { useQuickCreate } from "@/components/organisms/quick-create-host";
import { useOptionalPalette, useShell } from "@/components/providers/shell-context";
import type { NavGroup } from "@/lib/core/capabilities/nav-types";
import { cn } from "@/lib/utils";
import styles from "./app-topbar.module.css";

/**
 * Navbar global: fija, a todo el ancho, con fondo sólido y por encima de la
 * barra lateral (`--z-topbar`). A la izquierda, la celda de marca con el logo
 * real (la N con THRIVE debajo; con el riel, THRIVE se desvanece y queda la N más chica) sobre el mismo fondo y ancho que la barra
 * lateral, así forman una sola pieza. En el centro, el buscador (Ctrl K) y
 * «Crear» con todas las acciones del negocio (menú que cuelga del botón); a la derecha, notificaciones,
 * el selector de negocio, tema y cuenta. En móvil se compacta: logo, negocio y sección, y la búsqueda; «Crear»
 * vive en la barra inferior. La barra de ruta corre por el borde al navegar.
 */
export function AppTopbar({ actions, notifications, search, switcher }: { actions?: ReactNode; /** Notificaciones (las muestra la barra de módulo y la general). */ notifications?: ReactNode; /** Selector de negocio (PC), a la derecha. */ switcher?: ReactNode; /** Buscador en línea de PC (`NavbarSearch`); sin él, el botón abre la paleta modal. */ search?: ReactNode }) {
  const { title, brandName, hrefFor, openSearch, quickActions, createActions = quickActions, groups, activeKey } = useShell();
  // El buscador móvil comparte la paleta del negocio; el Operations Center no la tiene y usa su botón de búsqueda.
  const hasPalette = useOptionalPalette() !== null;
  const router = useRouter();
  const quick = useQuickCreate();
  const pathname = usePathname();
  // En la raíz (pantalla de aplicaciones) la barra queda reducida y transparente: solo logo, cambio de empresa y cuenta.
  const atHome = pathname.replace(/\/$/, "") === hrefFor("");
  // Dentro de un módulo (no en Inicio ni en Sistema) la barra cambia a la barra de módulo: «<», módulo, secciones y utilidades.
  const moduleGroup = atHome ? undefined : groups.find((g) => g.label !== "Sistema" && g.items.some((i) => i.key === activeKey));
  if (moduleGroup) return <ModuleBar group={moduleGroup} activeKey={activeKey} hrefFor={hrefFor} openSearch={openSearch} notifications={notifications} brandName={brandName} />;

  return (
    <header
      data-app-topbar=""
      data-home={atHome ? "" : undefined}
      className={cn(
        "fixed inset-x-0 top-0 z-(--z-topbar) flex items-stretch pt-[env(safe-area-inset-top,0px)]",
        atHome ? "h-[calc(4rem+env(safe-area-inset-top,0px))] bg-transparent" : "h-[calc(var(--topbar-height)+env(safe-area-inset-top,0px))]",
      )}
    >
      <Link
        href={hrefFor("")}
        aria-label={`${brandName}: inicio`}
        className={cn(styles.brand, "pl-[max(16px,env(safe-area-inset-left,0px))] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:pl-3", atHome && "!w-auto !border-0 bg-transparent !pl-6 !pr-0 text-foreground")}
      >
        <span className={cn(styles.logo, styles.mark)} style={atHome ? { ["--w" as string]: "40px" } : undefined}>
          <svg role="img" aria-label="NEXUS THRIVE" viewBox="387.6 239.9 744.4 779.5" shapeRendering="geometricPrecision">
            <path d={N_PATH} fill="currentColor" />
            <g className={styles.letters}>
              {THRIVE_LETTERS.map((l, i) => (
                <path key={i} transform={`translate(${l.x} ${l.y})`} d={l.d} fill="currentColor" />
              ))}
            </g>
          </svg>
        </span>
        <span className={cn(styles.ident, atHome ? "!hidden" : "flex min-w-0 flex-col leading-tight")}>
          <b className="truncate font-display text-sm font-semibold">{brandName}</b>
          <small className="flex items-center gap-1.5 text-2xs text-muted-foreground">
            <i aria-hidden="true" className="inline-block size-1.5 -skew-x-[24deg] bg-accent" />
            {title}
          </small>
        </span>
      </Link>

      {atHome ? (
        <div className="relative flex flex-1 items-center justify-end gap-3 pe-3">
          <span className="truncate text-sm font-medium text-muted-foreground">{brandName}</span>
          <ThemeToggle />
          <AccountButton />
        </div>
      ) : (
      <div className="relative flex min-w-fit flex-1 items-center justify-end gap-2 md:min-w-0 lg:grid lg:grid-cols-[minmax(max-content,1fr)_minmax(0,440px)_minmax(max-content,1fr)] border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-3 text-[var(--sidebar-fg)] md:gap-4 md:px-6 xl:px-8">
        {/* Izquierda: contexto (negocio) y búsqueda. `suppressHydrationWarning`:
            Proton Pass marca con `data-protonpass-form` los contenedores con
            botones/inputs antes de que React hidrate y dispara el aviso de
            "hydration mismatch"; no es nuestro HTML (ver `CheckinStation`). */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-4 lg:contents" suppressHydrationWarning>
          {switcher ? <div className="hidden shrink-0 md:block lg:col-start-1 lg:row-start-1 lg:justify-self-start" suppressHydrationWarning>{switcher}</div> : null}
                    <div data-tour="search" className="min-w-0 md:w-full md:max-w-[520px] lg:col-start-2 lg:row-start-1 lg:max-w-none" suppressHydrationWarning>
            {search ?? (
              <button
                type="button"
                onClick={openSearch}
                className="group hidden h-10 pointer-coarse:h-11 w-full items-center gap-2.5 rounded-md border border-border bg-surface-muted pl-3.5 pr-2.5 text-ui text-muted-foreground transition-[border-color,color,background-color] duration-200 hover:border-border-input hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:flex"
              >
                <Search aria-hidden="true" className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span className="truncate">Buscar clientes, pagos, gastos o secciones…</span>
                <Kbd className="ml-auto shrink-0 pointer-coarse:hidden">Ctrl K</Kbd>
              </button>
            )}
            <button
              type="button"
              onClick={openSearch}
              aria-label="Buscar"
              data-press=""
              className="grid size-10 pointer-coarse:size-11 place-items-center rounded-md hover:bg-surface-muted md:hidden"
            >
              <Search aria-hidden="true" className="size-[18px]" />
            </button>
          </div>
        </div>

        {/* Derecha: acción principal, avisos y preferencias, y la cuenta al final. */}
        <div className="flex shrink-0 items-center justify-end gap-2 md:gap-3 lg:col-start-3 lg:row-start-1 lg:justify-self-end">
          {createActions.length > 0 ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="accent" className="hidden md:inline-flex" data-press="" data-tour="create">
                  <Plus aria-hidden="true" className="size-4" />
                  Crear
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} data-nx-create-menu="" className="w-[min(340px,calc(100vw-24px))] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <DropdownMenuLabel className="px-2.5 pb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
          {/* Móvil: lupa, lo que falta por completar y las notificaciones; el tema y la cuenta viven en «Más». */}
          <div className="flex items-center gap-1 md:gap-0.5">
            {actions}
            {notifications}
            <ThemeToggle className="max-md:hidden" />
          </div>
          <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-[var(--sidebar-border)] md:block" />
          {/* En móvil la cuenta vive en «Más» (barra inferior). */}
          <span className="max-md:hidden"><AccountButton /></span>
        </div>

      </div>
      )}

      {/* Debajo de la navbar, fuera de su fila y desde el borde de la barra lateral (`--sw`): no se mete en ella ni deforma la navbar. */}
      {hasPalette && !atHome ? <MobileTopbarSearch /> : null}

      {atHome ? null : <RouteBar className="absolute inset-x-auto left-[var(--sw)] right-0 top-full" />}
    </header>
  );
}

/**
 * Barra de módulo (Nexus): una sola fila de 56 px. «<» vuelve siempre a Inicio; después el módulo con su ícono y sus secciones en
 * texto (la activa resaltada); a la derecha, buscar (Ctrl K), notificaciones y cuenta. Sin logo, sin «Crear» y sin el aviso de prueba.
 */
function ModuleBar({
  group,
  activeKey,
  hrefFor,
  openSearch,
  notifications,
  brandName,
}: {
  brandName: string;
  group: NavGroup;
  activeKey: string | undefined;
  hrefFor: (href: string) => string;
  openSearch: () => void;
  notifications?: ReactNode;
}) {
  const Icon = group.icon ?? group.items[0]!.icon;
  return (
    <header
      data-app-topbar=""
      data-module-bar=""
      className="fixed inset-x-0 top-0 z-(--z-topbar) flex h-[calc(56px+env(safe-area-inset-top,0px))] items-center gap-3 border-b border-[#1f1f23] bg-background px-3 pt-[env(safe-area-inset-top,0px)] md:px-4"
    >
      <Link
        href={hrefFor("")}
        aria-label="Volver al inicio"
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Link>
      <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-border sm:block" />
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Icon aria-hidden="true" className="size-5 text-accent-text" />
        <span className="truncate text-base font-semibold text-foreground">{group.label === "General" ? group.items[0]!.label : group.label}</span>
      </div>
      <nav aria-label={`Secciones de ${group.label}`} className="ms-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {group.items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={hrefFor(item.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active ? "bg-surface-muted font-medium text-foreground" : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={openSearch}
          aria-label="Buscar (Ctrl K)"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-sm text-muted-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Search aria-hidden="true" className="size-4" />
          <span className="max-md:hidden">Buscar</span>
          <Kbd className="max-md:hidden">Ctrl K</Kbd>
        </button>
        {notifications}
        <ThemeToggle />
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground max-md:hidden">{brandName}</span>
          <AccountButton />
        </span>
      </div>
    </header>
  );
}
