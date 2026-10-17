"use client";

import { useEffect, useState } from "react";
import { Banknote, Check, Send } from "lucide-react";
import { AmountDisplay } from "@/components/atoms/amount-display";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { inputClasses, selectClasses } from "@/components/atoms/input";
import { NMark } from "@/components/atoms/n-mark";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { Keypad, applyKey, type KeypadKey } from "@/components/molecules/keypad";
import { ReceiptPrinter, type ReceiptData } from "@/components/organisms/receipt-printer";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { cn } from "@/lib/utils";

export type PaymentChargeInput = {
  amount: number;
  customerId: string;
  method: string;
  description: string;
};

export type PaymentChargeResult =
  | { ok: true; reference: string; createdAt: string }
  | { ok: false; message: string };

const cop = (n: number) => `$ ${n.toLocaleString("es-CO")}`;

/**
 * Cobro completo del artefacto (FLU·04): cifra que salta con cada tecla,
 * teclado numérico (también el del computador), cliente, medio de pago en
 * chips y concepto. "Cobrar" gira la N mientras el servidor guarda y, al
 * confirmar, la hoja muestra la impresora de recibos con el comprobante.
 * Genérico: la escritura real la hace `onCharge`.
 */
export function PaymentSheet({
  open,
  onOpenChange,
  customers,
  methods,
  business,
  defaultCustomerId = "",
  onCharge,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: { id: string; name: string; hint?: string; phone?: string | null }[];
  methods: readonly { value: string; label: string }[];
  business: { name: string; subtitle?: string };
  defaultCustomerId?: string;
  onCharge: (input: PaymentChargeInput) => Promise<PaymentChargeResult>;
}) {
  const [amount, setAmount] = useState(0);
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [method, setMethod] = useState(methods[0]?.value ?? "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [printed, setPrinted] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  const methodLabel = methods.find((m) => m.value === method)?.label ?? method;

  const press = (key: KeypadKey) => setAmount((value) => applyKey(value, key));

  // Teclado del computador: dígitos y borrar, salvo escribiendo en un campo.
  useEffect(() => {
    if (!open || receipt) return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (/^\d$/.test(event.key)) setAmount((value) => applyKey(value, event.key as KeypadKey));
      else if (event.key === "Backspace") setAmount((value) => applyKey(value, "back"));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, receipt]);

  const reset = () => {
    setAmount(0);
    setCustomerId(defaultCustomerId);
    setMethod(methods[0]?.value ?? "");
    setDescription("");
    setError(null);
    setReceipt(null);
    setPrinted(false);
  };

  const close = (next: boolean) => {
    if (busy) return;
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 300);
  };

  const charge = async () => {
    if (!amount || busy) return;
    setBusy(true);
    setError(null);
    const concept = description.trim() || "Pago de servicio";
    const result = await onCharge({ amount, customerId, method, description: description.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const date = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(result.createdAt));
    setReceipt({
      business: business.name,
      subtitle: business.subtitle,
      client: customer?.name ?? "Venta de mostrador",
      concept,
      total: cop(amount),
      meta: [
        { label: "Recibo", value: result.reference },
        { label: "Cliente", value: customer?.name ?? "Mostrador" },
        { label: "Medio", value: methodLabel },
        { label: "Fecha", value: date },
      ],
    });
  };

  const whatsappHref = receipt
    ? `https://wa.me/${(customer?.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola${customer ? ` ${customer.name.split(" ")[0]}` : ""}, este es tu comprobante de ${business.name}: ${receipt.total} por ${receipt.concept} (${receipt.meta[0].value}). ¡Gracias por tu pago!`,
      )}`
    : "";

  const footer = receipt ? (
    <>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        onClick={() => close(false)}
        className={cn(buttonVariants({ variant: "outline" }), "flex-1 sm:flex-none", !printed && "pointer-events-none opacity-45")}
      >
        <Send aria-hidden="true" className="size-4" />
        Enviar por WhatsApp
      </a>
      <button type="button" onClick={() => close(false)} className={cn(buttonVariants(), "flex-1 sm:flex-none")}>
        <Check aria-hidden="true" className="size-4" />
        Listo
      </button>
    </>
  ) : (
    <>
      <button type="button" onClick={() => close(false)} disabled={busy} className={cn(buttonVariants({ variant: "outline" }), "flex-1 sm:flex-none")}>
        Cancelar
      </button>
      <button
        type="button"
        onClick={charge}
        disabled={!amount || busy}
        aria-busy={busy || undefined}
        className={cn(buttonVariants(), "min-w-44 flex-1 sm:flex-none")}
      >
        {busy ? <NMark size={16} state="loop" className="text-current" /> : <Banknote aria-hidden="true" className="size-4" />}
        {busy ? "Procesando…" : `Cobrar ${cop(amount)}`}
      </button>
    </>
  );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={close}
      title="Registrar pago"
      description={receipt ? "Comprobante listo para entregar." : "Cobra y genera el comprobante."}
      footer={footer}
    >
      {receipt ? (
        <ReceiptPrinter data={receipt} onPrinted={() => setPrinted(true)} className="py-2" />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <AmountDisplay value={amount} />
            <p className="mt-0.5 text-center text-[12.5px] text-muted-foreground">Escribe el valor con el teclado</p>
          </div>
          <Keypad onKey={press} />
          <Field label="Cliente">
            {(control) => (
              <select
                {...control}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className={selectClasses}
              >
                <option value="">Venta sin cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.hint ? ` · ${c.hint}` : ""}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-medium">Medio de pago</p>
            <ChipRow role="group" aria-label="Medio de pago">
              {methods.map((m) => (
                <Chip key={m.value} selected={m.value === method} onClick={() => setMethod(m.value)}>
                  {m.label}
                </Chip>
              ))}
            </ChipRow>
          </div>
          <Field label="Concepto" hint="Opcional. Sale en el comprobante.">
            {(control) => (
              <input
                {...control}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={300}
                placeholder="Ej. Corte y barba"
                className={inputClasses}
              />
            )}
          </Field>
          {error ? <Alert tone="danger">{error}</Alert> : null}
        </div>
      )}
    </ResponsiveSheet>
  );
}
