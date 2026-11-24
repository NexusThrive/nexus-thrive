"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { manageProvisioningAction, retryOwnerDeliveryAction } from "@/app/admin/actions";
import type { ManagedProvisioningStatus, ManagedCommand } from "@/lib/platform/admin/managed-lifecycle";
import SuspendDialog from "../../../_components/suspend-dialog";

export default function ProvisioningControls({ state, name, canEdit, canActivate, canInvite, canSuspend }: { state: ManagedProvisioningStatus; name: string; canEdit: boolean; canActivate: boolean; canInvite: boolean; canSuspend: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ status: string; message?: string } | null>(null);
  const run = (command: Exclude<ManagedCommand, "suspend">) => start(async () => {
    try {
      const result = await manageProvisioningAction(state.tenantId, command);
      setFeedback(result);
      router.refresh();
    } catch { setFeedback({ status: "error", message: "No se pudo completar la solicitud. Inténtalo de nuevo." }); }
  });
  const inviteLabel = { PENDING: "Pendiente de aceptación", ACCEPTED: "Aceptada", REVOKED: "Revocada", EXPIRED: "Vencida" };
  const deliveryLabel: Record<string, string> = { NONE: "Sin entrega", PENDING: "Pendiente de envío", SENDING: "Enviando", SENT: "Aceptada por el proveedor", FAILED: "Entrega fallida", UNKNOWN: "Entrega por confirmar", CANCELLED: "Cancelada" };
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5" aria-busy={pending}>
      <h2 className="font-display text-lg font-semibold">Preparación y acceso del propietario</h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Estado</dt><dd>{!state.activated ? state.ready ? "Listo para activar" : "En preparación" : state.active ? "Activo" : "Suspendido"}</dd></div>
        <div><dt className="text-muted-foreground">Correo autorizado</dt><dd>{state.ownerEmail}</dd></div>
        <div><dt className="text-muted-foreground">Invitación OWNER</dt><dd>{state.invite ? inviteLabel[state.invite.status as keyof typeof inviteLabel] : "Todavía no emitida"}</dd></div>
        <div><dt className="text-muted-foreground">Entrega</dt><dd>{state.invite ? deliveryLabel[state.invite.delivery] ?? "Pendiente de revisión" : "Se emitirá al activar"}</dd></div>
      </dl>
      {state.invite && <p className="text-xs text-muted-foreground">Vence: {new Date(state.invite.expiresAt).toLocaleString("es-CO", { timeZone: "UTC" })} UTC · Intentos de entrega: {state.invite.attempts}</p>}
      {state.invite?.deliveryError && <p role="alert" className="text-sm text-destructive">{state.invite.deliveryError}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => router.refresh()} className={buttonVariants({ variant: "outline" })}>Actualizar estado</button>
        {state.active && canInvite && state.invite?.status === "PENDING" && state.invite.delivery !== "SENT" && <button type="button" disabled={pending} onClick={() => start(async () => { try { setFeedback(await retryOwnerDeliveryAction(state.tenantId)); router.refresh(); } catch { setFeedback({ status: "error", message: "No se pudo reintentar. Inténtalo de nuevo." }); } })} className={buttonVariants({ variant: "outline" })}>Reintentar entrega</button>}
        {!state.activated && !state.ready && canEdit && <button type="button" disabled={pending} onClick={() => run("ready")} className={buttonVariants()}>Marcar preparación lista</button>}
        {!state.activated && state.ready && canActivate && <button type="button" disabled={pending} onClick={() => run("activate")} className={buttonVariants()}>Activar y emitir invitación</button>}
        {state.activated && !state.active && canActivate && <button type="button" disabled={pending} onClick={() => run("activate")} className={buttonVariants()}>Reactivar acceso</button>}
        {state.active && canSuspend && <SuspendDialog tenantId={state.tenantId} tenantName={name} onSuspended={() => router.refresh()} />}
        {state.active && canInvite && (!state.invite || ["EXPIRED", "REVOKED"].includes(state.invite.status)) && <button type="button" disabled={pending} onClick={() => run("renew")} className={buttonVariants({ variant: "outline" })}>Renovar invitación</button>}
        {canInvite && state.invite?.status === "PENDING" && <button type="button" disabled={pending} onClick={() => run("revoke")} className={buttonVariants({ variant: "outline" })}>Revocar invitación pendiente</button>}
      </div>
      {pending && <p role="status">Guardando…</p>}
      {feedback?.message && <p role={feedback.status === "error" ? "alert" : "status"}>{feedback.message}</p>}
    </section>
  );
}
