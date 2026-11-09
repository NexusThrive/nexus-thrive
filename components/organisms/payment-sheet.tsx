"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Send } from "lucide-react";
import { AmountDisplay } from "@/components/atoms/amount-display";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { inputClasses } from "@/components/atoms/input";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { Keypad, applyKey, type KeypadKey } from "@/components/molecules/keypad";
import { SlideToConfirm } from "@/components/molecules/slide-to-confirm";
import type { ReceiptData } from "@/components/organisms/receipt-printer";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { drawReceiptPng, shareReceiptOnWhatsapp } from "@/lib/business/sales/receipt-share";
import { receiptQrDataUrl, receiptQrPayload } from "@/lib/business/sales/receipt-qr";
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
 * confirmar, la hoja se cierra y el comprobante sale abajo a la derecha
 * (aviso tipo recibo de `useToast`) con «Compartir» y «Ver»; luego se oculta.
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
  const [showConcept, setShowConcept] = useState(false);
  const conceptRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customer = customers.find((c) => c.id === customerId);
  const methodLabel = methods.find((m) => m.value === method)?.label ?? method;

  const press = (key: KeypadKey) => setAmount((value) => applyKey(value, key));

  // Teclado del computador: dígitos y borrar, salvo escribiendo en un campo.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (/^\d$/.test(event.key)) setAmount((value) => applyKey(value, event.key as KeypadKey));
      else if (event.key === "Backspace") setAmount((value) => applyKey(value, "back"));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const reset = () => {
    setAmount(0);
    setCustomerId(defaultCustomerId);
    setMethod(methods[0]?.value ?? "");
    setDescription("");
    setShowConcept(false);
    setError(null);
  };

  const close = (next: boolean) => {
    if (busy) return;
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 300);
  };

  /** Devuelve si se cobró: el deslizador vuelve al inicio si no. */
  const charge = async (): Promise<boolean> => {
    if (!amount || busy) return false;
    setBusy(true);
    setError(null);
    const concept = description.trim() || "Pago de servicio";
    const result = await onCharge({ amount, customerId, method, description: description.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      toast({ title: "No se registró el cobro", description: result.message, variant: "error" });
      return false;
    }
    const link = result.link ?? null;
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
    const receipt: ReceiptData = {
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
    };
    const phone = customer?.phone;
    const firstName = customer?.name.split(" ")[0];
    // El modal se cierra y el comprobante sale abajo a la derecha (sube y, al rato, baja y se oculta).
    close(false);
    toast({
      title: "Comprobante generado",
      receipt: { total: receipt.total, concept, client: receipt.client, reference: result.reference },
      actions: [
        { label: "Compartir", icon: Send, onClick: () => shareReceipt(receipt, link, phone, firstName) },
        ...(link ? [{ label: "Ver", icon: ExternalLink, onClick: () => void window.open(link, "_blank", "noopener") }] : []),
      ],
    });
    return true;
  };

  const { toast } = useToast();

  /** Imagen del recibo + texto + enlace: hoja de compartir en celular, portapapeles + chat en computador. Sirve con la hoja cerrada. */
  const shareReceipt = async (receipt: ReceiptData, link: string | null, phone: string | null | undefined, firstName: string | undefined) => {
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
      const first = firstName ? ` ${firstName}` : "";
      const text = `Hola${first}, este es tu comprobante de ${business.name}: ${receipt.total} por ${receipt.concept} (${receipt.meta[0].value}).${link ? `\nVer recibo: ${link}` : ""}\n¡Gracias por tu pago!`;
      const r = await shareReceiptOnWhatsapp({ image, fileName: `recibo-${receipt.meta[0].value}.png`, text, phone });
      if (r === "copied") toast({ title: "Imagen del recibo copiada", description: "En el chat de WhatsApp pégala con Ctrl+V (o Cmd+V) y envía.", variant: "success" });
      if (r === "text-only") toast({ title: "Abrimos WhatsApp con el texto", description: "Tu navegador no permite copiar la imagen; el enlace del recibo va en el mensaje.", variant: "info" });
    } catch {
      toast({ title: "No se pudo preparar el recibo", variant: "error" });
    }
  };

  // Cobrar es deslizar hasta el final (o Enter en el asa): un toque suelto no cobra. Cancelar queda al lado.
  const footer = (
    <div className="flex w-full items-center gap-2.5">
      <button type="button" onClick={() => close(false)} disabled={busy} className={cn(buttonVariants({ variant: "outline" }), "h-[52px] shrink-0 rounded-full px-4 sm:px-5")}>
        Cancelar
      </button>
      <SlideToConfirm
        key={open ? "abierto" : "cerrado"}
        className="min-w-0 flex-1"
        label={amount ? `Cobrar ${cop(amount)}` : "Escribe el valor"}
        busy={busy}
        busyLabel="Procesando…"
        doneLabel="Cobrado"
        disabled={!amount}
        onConfirm={charge}
      />
    </div>
  );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={close}
      title="Registrar pago"
      description="Cobra y genera el comprobante."
      size="lg"
      footer={footer}
      initialFocus="panel"
    >
      {/* PC: la cifra y el teclado a la izquierda, los datos del cobro a la derecha. Celular: una columna compacta. Sin scroll. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2 md:gap-3">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div>
            <AmountDisplay value={amount} className="[@media(max-height:700px)]:text-3xl" />
            {/* En el celular se usa el teclado de la pantalla: la nota del teclado del computador sobra. */}
            <p className="hidden text-center text-xs text-muted-foreground md:block">Escribe el valor con el teclado</p>
          </div>
          <Keypad onKey={press} />
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2.5 md:gap-4">
          <Field label="Cliente">
            {(control) => (
              <Select {...control} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
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
          {/* Medio de pago al lado de su etiqueta (en el celular ahorra una fila; en PC queda igual de claro). */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p className="text-ui font-medium">Medio de pago</p>
            <ChipRow role="group" aria-label="Medio de pago">
              {methods.map((m) => (
                <Chip key={m.value} selected={m.value === method} onClick={() => setMethod(m.value)}>
                  {m.label}
                </Chip>
              ))}
            </ChipRow>
          </div>
          {/* En el celular el concepto (opcional) se abre con un toque: así el cobro cabe sin scroll. En PC siempre está. */}
          {!showConcept ? (
            <button
              type="button"
              onClick={() => {
                setShowConcept(true);
                // El botón desaparece: el foco pasa al campo que abre (ya está montado, solo oculto).
                requestAnimationFrame(() => conceptRef.current?.focus());
              }}
              className="justify-self-start text-ui font-medium text-accent-text underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring md:hidden">
              + Agregar concepto
            </button>
          ) : null}
          <Field label="Concepto" className={cn(!showConcept && "max-md:hidden")}>
            {(control) => (
              <input
                {...control}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={300}
                ref={conceptRef}
                placeholder="Opcional · sale en el comprobante"
                className={inputClasses}
              />
            )}
          </Field>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
