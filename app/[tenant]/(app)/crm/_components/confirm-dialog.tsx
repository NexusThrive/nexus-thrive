"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { IconTile } from "@/components/atoms/icon-tile";
import { ResponsiveSheet, SheetCloseButton } from "@/components/organisms/responsive-sheet";

/**
 * Confirmación de una acción destructiva (eliminar clientes…). Hoja inferior
 * en móvil y modal en PC; el foco inicial va al botón seguro ("Cancelar") y
 * no se puede cerrar mientras la acción está en curso.
 */
export default function ConfirmDialog({
  title,
  description,
  detail,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  /** Línea extra (ej. "3 seleccionados…"). */
  detail?: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => {
        if (!open && !pending) onCancel();
      }}
      title={title}
      description={description}
      footer={
        <>
          <SheetCloseButton asChild>
            <Button variant="outline" disabled={pending} data-autofocus="">
              Cancelar
            </Button>
          </SheetCloseButton>
          <Button variant="danger" loading={pending} loadingText="Eliminando…" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <IconTile tone="danger">
          <TriangleAlert />
        </IconTile>
        {detail ? (
          <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
