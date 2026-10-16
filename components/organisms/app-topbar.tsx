"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Search } from "lucide-react";
import { BrandLogo } from "@nexus/brand/BrandLogo";
import { Kbd } from "@/components/atoms/kbd";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import { RouteBar } from "@/components/molecules/route-bar";
import { useShell } from "@/components/providers/shell-context";
import { cn } from "@/lib/utils";

/**
 * Barra superior de 60 px con fondo de vidrio (desenfoque 14 px). En móvil:
 * la N y el negocio; desde 768 px: el título de la sección y el buscador
 * (Ctrl K). A la derecha, tema y cuenta. El borde inferior aparece al hacer
 * scroll y la barra de ruta corre por su borde al navegar.
 */
export function AppTopbar() {
  const { title, brandName, hrefFor, openSearch } = useShell();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 4);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-[env(safe-area-inset-top,0px)] z-40 flex h-[var(--topbar-height)] items-center gap-2.5 border-b px-[max(16px,env(safe-area-inset-left,0px))] backdrop-blur-[14px] backdrop-saturate-[1.4] transition-[border-color] duration-200 md:px-6 xl:px-8",
        "bg-glass",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <Link href={hrefFor("")} aria-label="Inicio" className="flex min-w-0 items-center gap-2.5 md:hidden">
        <BrandLogo variant="mark" size={26} className="shrink-0 text-primary" />
        <span className="flex min-w-0 flex-col leading-tight">
          <b className="truncate font-display text-sm font-semibold">{brandName}</b>
          <small className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <i aria-hidden="true" className="inline-block size-1.5 -skew-x-[24deg] bg-accent" />
            {title}
          </small>
        </span>
      </Link>

      <h1 className="hidden truncate font-display text-[15px] font-semibold md:block">{title}</h1>

      <div className="flex-1" />

      <button
        type="button"
        onClick={openSearch}
        className="hidden h-[38px] min-w-[240px] items-center gap-2.5 rounded-md border border-border bg-surface pl-3 pr-2.5 text-[13px] text-muted-foreground transition-colors duration-200 hover:border-border-input md:flex"
      >
        <Search aria-hidden="true" className="size-4" />
        <span>Buscar o ejecutar…</span>
        <Kbd className="ml-auto">Ctrl K</Kbd>
      </button>
      <button
        type="button"
        onClick={openSearch}
        aria-label="Buscar"
        data-press=""
        className="grid size-10 place-items-center rounded-md hover:bg-surface-muted md:hidden"
      >
        <Search aria-hidden="true" className="size-[18px]" />
      </button>
      <ThemeToggle />
      <UserButton appearance={{ elements: { userButtonAvatarBox: "size-[34px] rounded-[4px]" } }} />

      <RouteBar className="absolute inset-x-0 -bottom-px top-auto z-0" />
    </header>
  );
}
