"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import { connectWompiAction, disconnectPaymentAction, type ConnectionResult } from "@/app/[tenant]/(app)/integrations/actions";

/**
 * Conexión de la cuenta Wompi del negocio desde Integraciones: conectar con la llave pública y los dos secretos,
 * ver la URL de eventos que se pega en Wompi y desconectar. Los secretos solo viajan al servidor; nunca se muestran.
 */
export function WompiConnection({ slug, connection, eventsUrl }: { slug: string; connection: { id: string; connected: boolean } | null; eventsUrl: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [confirm, confirmDialog] = useConfirm();

  const disconnect = async () => {
    if (!connection) return;
    const ok = await confirm({
      title: "¿Desconectar Wompi?",
      description: "Se borran las credenciales y Wompi deja de confirmar pagos aquí. Los cobros nuevos quedan por transferencia o efectivo hasta que lo vuelvas a conectar.",
      confirmLabel: "Desconectar",
      tone: "danger",
    });
    if (!ok) return;
    start(async () => {
      const r = await disconnectPaymentAction(slug, connection.id);
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok) router.refresh();
    });
  };

  return (
    <div className="grid gap-2">
      {connection?.connected && eventsUrl ? (
        <div className="grid gap-1 text-xs">
          <p className="text-muted-foreground">URL de eventos para pegar en Wompi (Desarrolladores → URL de eventos):</p>
          <code className="break-all rounded-md bg-muted px-2 py-1 font-mono text-foreground">{eventsUrl}</code>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {connection?.connected ? null : (
          <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ size: "sm" })}>
            {connection ? "Volver a conectar Wompi" : "Conectar Wompi"}
          </button>
        )}
        {connection ? (
          <button type="button" disabled={pending} onClick={disconnect} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {pending ? "Desconectando…" : "Desconectar"}
          </button>
        ) : null}
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Conectar Wompi"
        description="Los datos están en tu panel de Wompi, en Desarrolladores. Una llave pub_test_ conecta en pruebas; una pub_prod_, en producción. Los secretos se guardan cifrados y no se vuelven a mostrar."
        submitLabel="Conectar"
        pendingLabel="Verificando con Wompi…"
        onSubmit={async (d) => {
          const r: ConnectionResult = await connectWompiAction(slug, {
            publicKey: String(d.get("publicKey") ?? ""),
            integritySecret: String(d.get("integritySecret") ?? ""),
            eventsSecret: String(d.get("eventsSecret") ?? ""),
          });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: r.field ? { [r.field]: r.message } : {} };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Llave pública" required error={fieldErrors.publicKey} hint="Empieza por pub_prod_ o pub_test_.">
              {(c) => <input {...c} name="publicKey" autoComplete="off" spellCheck={false} className={inputClasses} placeholder="pub_prod_…" />}
            </Field>
            <Field label="Secreto de integridad" required error={fieldErrors.integritySecret}>
              {(c) => <input {...c} name="integritySecret" type="password" autoComplete="off" className={inputClasses} />}
            </Field>
            <Field label="Secreto de eventos" required error={fieldErrors.eventsSecret} hint="Con él comprobamos que cada aviso de pago viene de Wompi.">
              {(c) => <input {...c} name="eventsSecret" type="password" autoComplete="off" className={inputClasses} />}
            </Field>
          </div>
        )}
      </FormDialog>
      {confirmDialog}
    </div>
  );
}
