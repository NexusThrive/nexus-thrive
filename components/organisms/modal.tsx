"use client";

import { ResponsiveSheet } from "./responsive-sheet";

/**
 * Modal de los formularios de construcción. Delega en `ResponsiveSheet`:
 * hoja inferior arrastrable en móvil y modal centrado en PC (576 px, o 768 px
 * con `wide` para editores como el APU). Cierra con Escape, el fondo o la X.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      wide={!wide}
      extraWide={wide}
    >
      {children}
    </ResponsiveSheet>
  );
}
