"use client";

import { MoneyInput } from "@/components/molecules/money-input";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import { connectWompiAction, disconnectPaymentAction, saveWompiTariffAction, type ConnectionResult } from "@/app/[tenant]/(app)/integrations/actions";

/**
 * Conexión de la cuenta Wompi del negocio desde Integraciones: conectar con la llave pública y los dos secretos,
 * ver la URL de eventos que se pega en Wompi y desconectar. Los secretos solo viajan al servidor; nunca se muestran.
 */
export function WompiConnection({ slug, connection, eventsUrl, tariff }: { slug: string; connection: { id: string; connected: boolean } | null; eventsUrl: string | null; tariff: { feePct: number; feeFixed: number; feeVatPct: number } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tariffOpen, setTariffOpen] = useState(false);
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
          <code className="break-all rounded-xl bg-surface-muted px-3 py-2 font-mono text-foreground">{eventsUrl}</code>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {connection?.connected ? null : (
          <button type="button" onClick={() => setOpen(true)} className={cn(buttonVariants({ variant: "accent" }), "h-10 rounded-full px-5 text-sm font-semibold")}>
            {connection ? "Volver a conectar Wompi" : "Conectar Wompi"}
          </button>
        )}
        {connection?.connected ? (
          <button type="button" onClick={() => setTariffOpen(true)} className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full border-border/60 bg-transparent px-4 text-sm")}>
            {tariff.feePct > 0 || tariff.feeFixed > 0 ? "Cambiar comisión" : "Configurar comisión"}
          </button>
        ) : null}
        {connection ? (
          <button type="button" disabled={pending} onClick={disconnect} className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full border-border/60 bg-transparent px-4 text-sm")}>
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
            <Field label="Secreto de integridad" required error={fieldErrors.integritySecret} hint="Empieza por test_integrity_ o prod_integrity_. No es la llave privada (prv_).">
              {(c) => <input {...c} name="integritySecret" type="password" autoComplete="off" className={inputClasses} />}
            </Field>
            <Field label="Secreto de eventos" required error={fieldErrors.eventsSecret} hint="Empieza por test_events_ o prod_events_. Con él comprobamos que cada aviso de pago viene de Wompi.">
              {(c) => <input {...c} name="eventsSecret" type="password" autoComplete="off" className={inputClasses} />}
            </Field>
          </div>
        )}
      </FormDialog>
      <FormDialog
        open={tariffOpen}
        onOpenChange={setTariffOpen}
        title="Comisión de Wompi"
        description="Con tu tarifa, cada cobro muestra su comisión estimada y el neto que esperas recibir. Es una estimación: la liquidación de Wompi confirma la real."
        submitLabel="Guardar tarifa"
        pendingLabel="Guardando…"
        onSubmit={async (d) => {
          const n = (key: string) => Number(String(d.get(key) ?? "0").replace(",", ".")) || 0;
          const r = await saveWompiTariffAction(slug, { feePct: n("feePct"), feeFixed: n("feeFixed"), feeVatPct: n("feeVatPct") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { feePct: r.message } };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Porcentaje sobre el valor (%)" required error={fieldErrors.feePct} hint="Lo encuentras en el contrato o en tu panel de Wompi.">
              {(c) => <input {...c} name="feePct" inputMode="decimal" autoComplete="off" defaultValue={String(tariff.feePct)} className={inputClasses} />}
            </Field>
            <Field label="Valor fijo por transacción (COP)" required>
              {(c) => <MoneyInput {...c} name="feeFixed" defaultValue={tariff.feeFixed} />}
            </Field>
            <Field label="IVA sobre la comisión (%)" required hint="0 si no aplica.">
              {(c) => <input {...c} name="feeVatPct" inputMode="decimal" autoComplete="off" defaultValue={String(tariff.feeVatPct)} className={inputClasses} />}
            </Field>
          </div>
        )}
      </FormDialog>
      {confirmDialog}
    </div>
  );
}
