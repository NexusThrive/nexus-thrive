"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useQuickCreate } from "@/components/organisms/quick-create-host";

/**
 * Enlace de una acción de «Crear»: con mini-modal, un clic normal lo abre sin
 * salir de la pantalla; sin él (o con Ctrl/⌘/Mayús, clic central o «abrir en
 * pestaña nueva») es un enlace de siempre a la sección. Así el `href` sigue
 * siendo el «panel completo» y nada se rompe sin JavaScript.
 */
export function QuickActionLink({ actionKey, onClick, ...props }: ComponentProps<typeof Link> & { actionKey: string }) {
  const quick = useQuickCreate();
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (quick.open(actionKey)) event.preventDefault();
      }}
    />
  );
}
