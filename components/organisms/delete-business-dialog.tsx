"use client";

import { ConfirmDialog } from "./confirm-dialog";

/**
 * Confirmación de borrado de raíz.
 *
 * Eliminar un negocio se lleva sus clientes, su dinero, su asistencia, sus
 * proyectos y su equipo: es irreversible. Por eso no vale un clic: hay que
 * ESCRIBIR "eliminar". El servidor vuelve a comprobarlo (no basta con que el
 * formulario lo pida).
 *
 * Sobre `ConfirmDialog`: foco atrapado, Escape, devolución del foco y no se
 * cierra mientras borra.
 */
export function DeleteBusinessDialog({
  open,
  onClose,
  businessName,
  onConfirm,
  description,
}: {
  open: boolean;
  onClose: () => void;
  businessName: string;
  onConfirm: (confirm: string) => Promise<{ ok: boolean; message?: string; total?: number }>;
  /** Qué se lleva por delante (para el texto). */
  description?: string;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={`Eliminar ${businessName}`}
      description={
        description ??
        "Se borra el negocio y todo lo que tiene dentro: clientes, membresías, dinero, asistencia, agenda, proyectos y tickets. No se puede deshacer."
      }
      confirmText="eliminar"
      confirmLabel="Eliminar definitivamente"
      pendingLabel="Eliminando…"
      onConfirm={(typed) => onConfirm(typed)}
    >
      Las cuentas de tu equipo quedan libres: pueden entrar de nuevo y crear otro negocio.
    </ConfirmDialog>
  );
}
