"use client";

import { useSyncExternalStore } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";

const noop = () => () => undefined;

/**
 * Menú de la cuenta de Clerk. Clerk lo monta solo en el navegador, así que el HTML
 * del servidor no lo trae y React avisaba de «hydration mismatch». Se pinta tras
 * hidratar y, mientras tanto, un hueco del mismo tamaño evita el salto de diseño.
 * `showName` muestra el nombre al lado del avatar (la hoja «Más» del móvil). Sin foto en la cuenta, el avatar es su blobatar.
 */
export function AccountButton({ showName = false, compact = false }: { showName?: boolean; /** Avatar de 28px (barra de módulo). */ compact?: boolean }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const { user } = useUser();
  const box = compact ? "size-7 pointer-coarse:size-10 rounded-md" : "size-[34px] pointer-coarse:size-11 rounded-md";
  if (!mounted) return <span aria-hidden="true" className={`inline-block ${box} bg-surface-muted`} />;
  // Sin foto propia en la cuenta, su avatar es el blobatar de la persona (como los clientes), encima del de Clerk. El clic pasa al botón.
  const noPhoto = user && !(user as { hasImage?: boolean }).hasImage;
  if (!noPhoto || showName) return <UserButton showName={showName} appearance={{ elements: { userButtonAvatarBox: box } }} />;
  return (
    <span className="relative inline-grid">
      <UserButton showName={showName} appearance={{ elements: { userButtonAvatarBox: box } }} />
      <CustomerAvatar identity={{ name: user.fullName, email: user.primaryEmailAddress?.emailAddress, id: user.id }} className={`pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 ${box}`} />
    </span>
  );
}
