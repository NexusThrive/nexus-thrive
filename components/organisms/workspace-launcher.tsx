"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { useShell } from "@/components/providers/shell-context";

/** Botón de aplicaciones de la barra superior: lleva a la pantalla de aplicaciones (App Home), no abre un panel. */
export function WorkspaceLauncher() {
  const { hrefFor } = useShell();
  return (
    <Link href={hrefFor("")} aria-label="Aplicaciones" className={buttonVariants({ variant: "ghost", size: "icon" })}>
      <LayoutGrid aria-hidden="true" className="size-5" />
    </Link>
  );
}
