"use client";

import { UserButton } from "@clerk/nextjs";
import { Building2, Menu, X } from "lucide-react";
import { Brand } from "@/components/brand/brand";
import { useSidebar } from "./sidebar-context";

type HeaderProps = {
  /** Nombre del negocio activo (serializable: nunca pasar el record de Prisma). */
  tenantName: string;
};

/**
 * Barra superior del shell del negocio.
 *
 * Client Component: solo recibe strings serializables desde el layout y usa
 * el estado local del sidebar para abrir/cerrar el menú mobile.
 * Importa exclusivamente desde `@clerk/nextjs` (nunca `/server`).
 */
export default function Header({ tenantName }: HeaderProps) {
  const { isOpen, toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      {/* Menú mobile: abre/cierra el sidebar */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isOpen}
        aria-controls="tenant-sidebar"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
      >
        {isOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {/* Marca NEXUS THRIVE */}
      <div className="flex shrink-0 items-center gap-3 lg:hidden">
        <Brand className="[&_.nx-wordmark]:text-sm" />
      </div>

      <span aria-hidden="true" className="hidden h-6 w-px bg-border md:block" />

      {/* Negocio activo + estado */}
      <div className="flex min-w-0 items-center gap-2">
        <Building2
          aria-hidden="true"
          className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block"
        />
        <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground sm:block lg:max-w-[16rem]">
          {tenantName}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
          Activo
        </span>
      </div>

      {/* Cuenta */}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <UserButton />
      </div>
    </header>
  );
}