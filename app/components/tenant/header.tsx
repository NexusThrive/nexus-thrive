"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@nexus/brand/BrandLogo";
import { Badge, StatusDot } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/brand/theme";
import { useSidebar } from "./sidebar-context";

type HeaderProps = {
  /** Nombre del negocio activo (serializable: nunca pasar el record de Prisma). */
  tenantName: string;
};

/**
 * Barra superior (topbar 56 px) del shell del negocio: nombre + badge de estado
 * a la izquierda; tema y cuenta a la derecha. Comparte superficie con la sidebar
 * (blanca en claro, Ink en oscuro). Client Component.
 */
export default function Header({ tenantName }: HeaderProps) {
  const { isOpen, toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 sm:px-6">
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isOpen}
        aria-controls="tenant-sidebar"
        className="grid size-9 shrink-0 place-items-center rounded border border-border text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
      >
        {isOpen ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
      </button>

      <BrandLogo
        variant="mark"
        size={28}
        className="shrink-0 text-foreground lg:hidden"
      />

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">
          {tenantName}
        </span>
        <Badge variant="default" className="shrink-0">
          <StatusDot tone="success" />
          Activo
        </Badge>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <ThemeToggle />
        <UserButton
          appearance={{ elements: { userButtonAvatarBox: "size-8 rounded" } }}
        />
      </div>
    </header>
  );
}
