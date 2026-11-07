"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import { connectWhatsappAction, disconnectWhatsappAction } from "@/app/[tenant]/(app)/integrations/actions";

/** Conexión del WhatsApp Business propio del negocio: credenciales de Meta, el webhook que se pega allá y desconectar. */
export function WhatsappConnection({ slug, connection, webhookUrl }: { slug: string; connection: { id: string; connected: boolean } | null; webhookUrl: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [confirm, confirmDialog] = useConfirm();
  const disconnect = async () => {
    if (!connection) return;
    if (!(await confirm({ title: "¿Desconectar WhatsApp?", description: "Se borran las credenciales y dejas de recibir y enviar por tu número desde Nexus. Tus conversaciones se conservan y los avisos siguen saliendo con un toque por wa.me.", confirmLabel: "Desconectar", tone: "danger" }))) return;
    start(async () => {
      const r = await disconnectWhatsappAction(slug, connection.id);
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok) router.refresh();
    });
  };
  return (
    <div className="grid gap-2">
      {connection?.connected && webhookUrl ? (
        <div className="grid gap-1 text-xs">
          <p className="text-muted-foreground">Webhook para pegar en Meta (WhatsApp → Configuración → Webhook):</p>
          <code className="break-all rounded-md bg-muted px-2 py-1 font-mono text-foreground">{webhookUrl}</code>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {connection?.connected ? null : <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ size: "sm" })}>{connection ? "Volver a conectar WhatsApp" : "Conectar WhatsApp"}</button>}
        {connection ? <button type="button" disabled={pending} onClick={disconnect} className={buttonVariants({ variant: "outline", size: "sm" })}>{pending ? "Desconectando…" : "Desconectar"}</button> : null}
      </div>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Conectar tu WhatsApp Business"
        description="Los datos están en tu cuenta de Meta para desarrolladores (WhatsApp → Configuración de la API). Se guardan cifrados y no se vuelven a mostrar. Mientras no lo conectes, sigues enviando con un toque por wa.me."
        submitLabel="Conectar"
        pendingLabel="Verificando con Meta…"
        onSubmit={async (d) => {
          const r = await connectWhatsappAction(slug, { phoneNumberId: String(d.get("phoneNumberId") ?? ""), accessToken: String(d.get("accessToken") ?? ""), appSecret: String(d.get("appSecret") ?? ""), verifyToken: String(d.get("verifyToken") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: r.field ? { [r.field]: r.message } : {} };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Identificador del número" required error={fieldErrors.phoneNumberId}>{(c) => <input {...c} name="phoneNumberId" inputMode="numeric" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Token de acceso permanente" required error={fieldErrors.accessToken}>{(c) => <input {...c} name="accessToken" type="password" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Secreto de la app" required error={fieldErrors.appSecret} hint="Con él comprobamos que cada mensaje viene de Meta.">{(c) => <input {...c} name="appSecret" type="password" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Token de verificación" required error={fieldErrors.verifyToken} hint="Inventa uno (8 caracteres o más) y pégalo también en Meta.">{(c) => <input {...c} name="verifyToken" type="password" autoComplete="off" className={inputClasses} />}</Field>
          </div>
        )}
      </FormDialog>
      {confirmDialog}
    </div>
  );
}
