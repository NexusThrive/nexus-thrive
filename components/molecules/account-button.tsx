"use client";

import { useSyncExternalStore } from "react";
import { UserButton } from "@clerk/nextjs";

const noop = () => () => undefined;

/**
 * Menú de la cuenta de Clerk. Clerk lo monta solo en el navegador, así que el HTML
 * del servidor no lo trae y React avisaba de «hydration mismatch». Se pinta tras
 * hidratar y, mientras tanto, un hueco del mismo tamaño evita el salto de diseño.
 * `showName` muestra el nombre al lado del avatar (la hoja «Más» del móvil).
 */
export function AccountButton({ showName = false }: { showName?: boolean }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return <span aria-hidden="true" className="inline-block size-[34px] pointer-coarse:size-11 rounded-[4px] bg-surface-muted" />;
  return <UserButton showName={showName} appearance={{ elements: { userButtonAvatarBox: "size-[34px] pointer-coarse:size-11 rounded-[4px]" } }} />;
}
