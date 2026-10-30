"use client";

import { useEffect, useState } from "react";
import { Banknote, Check, Send } from "lucide-react";
import { AmountDisplay } from "@/components/atoms/amount-display";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { inputClasses } from "@/components/atoms/input";
import { NMark } from "@/components/atoms/n-mark";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { FullPanelLink } from "@/components/molecules/full-panel-link";
import { Keypad, applyKey, type KeypadKey } from "@/components/molecules/keypad";
import { ReceiptPrinter, type ReceiptData } from "@/components/organisms/receipt-printer";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { drawReceiptPng, shareReceiptOnWhatsapp } from "@/lib/business/receipt-share";
import { receiptQrDataUrl, receiptQrPayload } from "@/lib/business/receipt-qr";
import { useToast } from "@/components/molecules/toast";
import { cn } from "@/lib/utils";
import { Select } from "@/components/atoms/select";

export type PaymentChargeInput = {
  amount: number;
  customerId: string;
  method: string;
  description: string;
};

export type PaymentChargeResult =
  | { ok: true; reference: string; createdAt: string; /** Enlace público del recibo. */ link?: string }
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
  fullHref,
  onCharge,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: { id: string; name: string; hint?: string; phone?: string | null }[];
  methods: readonly { value: string; label: string }[];
  business: { name: string; subtitle?: string };
  defaultCustomerId?: string;
  /** Mini-modal de «Crear»: enlace «Abrir en el panel completo» a la sección del módulo. */
  fullHref?: string;
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
    setLink(result.link ?? null);
    const date = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(result.createdAt));
    const qr = await receiptQrDataUrl(
      receiptQrPayload({ link: result.link, reference: result.reference, total: cop(amount), business: business.name }),
    ).catch(() => undefined);
    setReceipt({
      business: business.name,
      subtitle: business.subtitle,
      client: customer?.name ?? "Mostrador",
      concept,
      total: cop(amount),
      qr,
      meta: [
        { label: "Recibo", value: result.reference },
        { label: "Cliente", value: customer?.name ?? "Mostrador" },
        { label: "Medio", value: methodLabel },
        { label: "Fecha", value: date },
      ],
    });
  };

  const [link, setLink] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const { toast } = useToast();

  /** Imagen del recibo + texto + enlace: hoja de compartir en celular, portapapeles + chat en computador. */
  const sendWhatsapp = async () => {
    if (!receipt || sharing) return;
    setSharing(true);
    try {
      const image = await drawReceiptPng({
        business: receipt.business,
        subtitle: receipt.subtitle,
        total: receipt.total,
        concept: receipt.concept,
        rows: receipt.meta,
        qr: receipt.qr,
        footer: link ? "Recibo verificable en el enlace" : undefined,
      });
      const first = customer ? ` ${customer.name.split(" ")[0]}` : "";
      const text = `Hola${first}, este es tu comprobante de ${business.name}: ${receipt.total} por ${receipt.concept} (${receipt.meta[0].value}).${link ? `\nVer recibo: ${link}` : ""}\n¡Gracias por tu pago!`;
      const r = await shareReceiptOnWhatsapp({ image, fileName: `recibo-${receipt.meta[0].value}.png`, text, phone: customer?.phone });
      if (r === "copied") toast({ title: "Imagen del recibo copiada", description: "En el chat de WhatsApp pégala con Ctrl+V (o Cmd+V) y envía.", variant: "success" });
      if (r === "text-only") toast({ title: "Abrimos WhatsApp con el texto", description: "Tu navegador no permite copiar la imagen; el enlace del recibo va en el mensaje.", variant: "info" });
      if (r !== "cancelled") close(false);
    } catch {
      toast({ title: "No se pudo preparar el recibo", variant: "error" });
    } finally {
      setSharing(false);
    }
  };

  const footer = receipt ? (
    <>
      <button
        type="button"
        onClick={sendWhatsapp}
        disabled={!printed || sharing}
        className={cn(buttonVariants({ variant: "outline" }), "flex-1 sm:flex-none")}
      >
        <Send aria-hidden="true" className="size-4" />
        {sharing ? "Preparando…" : "Enviar por WhatsApp"}
      </button>
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
      description={
        <>
          {receipt ? "Comprobante listo para entregar." : "Cobra y genera el comprobante."}
          {fullHref && !receipt ? <> <FullPanelLink href={fullHref} /></> : null}
        </>
      }
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
              <Select
                {...control}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">Venta sin cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.hint ? ` · ${c.hint}` : ""}
                  </option>
                ))}
              </Select>
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
