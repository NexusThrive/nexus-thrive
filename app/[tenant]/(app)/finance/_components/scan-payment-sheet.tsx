"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, ImageUp, RefreshCcw } from "lucide-react";
import { AmountDisplay } from "@/components/atoms/amount-display";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { inputClasses, selectClasses } from "@/components/atoms/input";
import { NMark } from "@/components/atoms/n-mark";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { Keypad, applyKey, type KeypadKey } from "@/components/molecules/keypad";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { PAYMENT_METHODS, type PaymentMethodValue } from "@/lib/finance";
import { spring } from "@/lib/motion";
import { bestCopAmount, guessPaymentMethod, parseQrPaymentPayload } from "@/lib/payment-scan";
import { cn } from "@/lib/utils";
import { registerScannedPaymentAction, type ScannedPaymentFormState } from "../actions";

const cop = (n: number) => `$ ${n.toLocaleString("es-CO")}`;

/** Tope defensivo del lado cliente; el servidor valida el real (8 MB). */
const MAX_PHOTO_BYTES = 7.5 * 1024 * 1024;

type Detector = { detect: (src: CanvasImageSource | Blob) => Promise<{ rawValue: string }[]> };

/** Reduce la imagen al ancho máximo y la convierte en JPEG (lo que acepta el Attachment). */
async function toJpegFile(source: CanvasImageSource, sw: number, sh: number, name: string): Promise<File> {
  const max = 1600;
  const scale = Math.min(1, max / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("No se pudo procesar la imagen.");
  if (blob.size > MAX_PHOTO_BYTES) throw new Error("La imagen es demasiado pesada; toma la foto de nuevo más de cerca del monto.");
  return new File([blob], name, { type: "image/jpeg" });
}

/**
 * Hoja de "Escanear pago" (FLU·05): el personal fotografía el comprobante
 * del cliente (captura de Nequi, recibo de transferencia…), la app intenta
 * leer el monto (QR con `BarcodeDetector` y, si no, OCR con tesseract.js
 * cargado bajo demanda) y muestra la confirmación con foto, cliente,
 * monto editable (mismo teclado del cobro), medio y concepto. Al confirmar,
 * `registerScannedPaymentAction` guarda el pago con la foto como soporte.
 * Sin cámara o sin OCR, el flujo sigue: todo es editable a mano.
 */
export function ScanPaymentSheet({
  open,
  onOpenChange,
  tenantSlug,
  business,
  customers,
  defaultCustomerId = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  business: { name: string; subtitle?: string };
  customers: { id: string; name: string; hint?: string; phone?: string | null }[];
  defaultCustomerId?: string;
}) {
  type Stage = "camera" | "reading" | "confirm" | "done";
  const [stage, setStage] = useState<Stage>("camera");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [method, setMethod] = useState<PaymentMethodValue>("TRANSFER");
  const [description, setDescription] = useState("");
  const [providerRefId, setProviderRefId] = useState("");
  const [detected, setDetected] = useState<string[]>([]); // notas de lo que se pudo leer
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ScannedPaymentFormState["receipt"] | null>(null);
  const [pending, start] = useTransition();
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const photoWrapRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const { toast } = useToast();

  const customer = customers.find((c) => c.id === customerId);

  // --- Cámara (solo mientras se muestra el paso de foto) --------------------
  useEffect(() => {
    if (!open || stage !== "camera") return;
    let stream: MediaStream | null = null;
    let alive = true;
    void navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        if (!alive) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = s;
        await v.play();
        if (alive) setCameraOn(true);
      })
      .catch(() => {
        // Sin permiso o sin cámara: el botón de subir foto sigue disponible.
        if (alive) setCameraOn(false);
      });
    return () => {
      alive = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, stage]);

  // La foto revelada entra con resorte (nx-pop + spring), como el resto del sistema.
  useEffect(() => {
    if (stage !== "confirm" || !photo) return;
    spring(photoWrapRef.current, "scale", 0.94, 1, { stiffness: 380, damping: 18 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const reset = () => {
    setStage("camera");
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(photoUrl ?? "");
      return null;
    });
    setPhotoUrl(null);
    setAmount(0);
    setCustomerId(defaultCustomerId);
    setMethod("TRANSFER");
    setDescription("");
    setProviderRefId("");
    setDetected([]);
    setError(null);
    setReceipt(null);
    setCameraOn(false);
  };

  const close = (next: boolean) => {
    if (pending) return;
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 300);
  };

  /** QR + OCR sobre la foto capturada. Best-effort: si algo falla, se sigue a mano. */
  const readPhoto = async (file: File) => {
    const notes: string[] = [];
    let foundAmount: string | null = null;
    let foundMethod: PaymentMethodValue | null = null;
    let foundRef: string | null = null;

    try {
      const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      if (Ctor) {
        const codes = await new Ctor({ formats: ["qr_code"] }).detect(file).catch(() => []);
        if (codes[0]?.rawValue) {
          const qr = parseQrPaymentPayload(codes[0].rawValue);
          foundAmount = qr.amount;
          foundMethod = qr.method;
          foundRef = qr.reference;
          if (foundAmount) notes.push("Monto leído del QR");
        }
      }
    } catch {
      // BarcodeDetector no soportado: el OCR intenta igual.
    }

    if (!foundAmount) {
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const result = await worker.recognize(file);
        await worker.terminate();
        const text = result.data?.text ?? "";
        foundAmount = bestCopAmount(text);
        foundMethod = foundMethod ?? guessPaymentMethod(text);
        if (foundAmount) notes.push("Monto leído de la imagen");
      } catch {
        notes.push("No se pudo leer el monto automáticamente");
      }
    }

    return { amount: foundAmount, method: foundMethod, reference: foundRef, notes };
  };

  const accept = async (file: File) => {
    if (busy.current) return;
    busy.current = true;
    const url = URL.createObjectURL(file);
    setPhoto(file);
    setPhotoUrl(url);
    setStage("reading");
    setDetected([]);
    const scan = await readPhoto(file);
    setDetected(scan.notes);
    if (scan.amount) setAmount(Math.round(Number(scan.amount)) || 0);
    if (scan.method) setMethod(scan.method);
    if (scan.reference) setProviderRefId(scan.reference);
    setStage("confirm");
    busy.current = false;
  };

  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || busy.current) return;
    try {
      const file = await toJpegFile(v, v.videoWidth, v.videoHeight, `comprobante-${Date.now()}.jpg`);
      await accept(file);
    } catch (e) {
      toast({ title: "No se pudo tomar la foto", description: (e as Error).message, variant: "error" });
    }
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      // Recarga por <img> para medir y reducir igual que la cámara.
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("No se pudo leer la imagen."));
        el.src = url;
      });
      const reduced = await toJpegFile(img, img.naturalWidth, img.naturalHeight, `comprobante-${Date.now()}.jpg`);
      URL.revokeObjectURL(url);
      await accept(reduced);
    } catch (e) {
      toast({ title: "Archivo no válido", description: (e as Error).message, variant: "error" });
    }
  };

  const press = (key: KeypadKey) => setAmount((value) => applyKey(value, key));

  const register = () => {
    if (!photo || !amount || pending) return;
    setError(null);
    start(async () => {
      const form = new FormData();
      form.set("tenantSlug", tenantSlug);
      form.set("status", "APPROVED");
      form.set("amount", String(amount));
      form.set("customerId", customerId);
      form.set("provider", method);
      form.set("providerRefId", providerRefId);
      form.set("description", description.trim() || "Pago escaneado");
      form.set("photo", photo);
      const state = await registerScannedPaymentAction({ status: "idle" }, form);
      if (state.status === "ok" && state.receipt) {
        setReceipt(state.receipt);
        setStage("done");
        return;
      }
      const fieldError = state.errors ? Object.values(state.errors).find(Boolean) : undefined;
      setError(state.message ?? fieldError ?? "No se pudo registrar el pago.");
    });
  };

  const footer =
    stage === "done" ? (
      <button type="button" onClick={() => close(false)} className={cn(buttonVariants(), "flex-1 sm:flex-none")}>
        <CheckCircle2 aria-hidden="true" className="size-4" />
        Listo
      </button>
    ) : stage === "confirm" ? (
      <>
        <button type="button" onClick={() => { setCameraOn(false); setStage("camera"); }} disabled={pending} className={cn(buttonVariants({ variant: "outline" }), "flex-1 sm:flex-none")}>
          <RefreshCcw aria-hidden="true" className="size-4" />
          Otra foto
        </button>
        <button type="button" onClick={register} disabled={!amount || pending} aria-busy={pending || undefined} className={cn(buttonVariants(), "min-w-44 flex-1 sm:flex-none")}>
          {pending ? <NMark size={16} state="loop" className="text-current" /> : <Camera aria-hidden="true" className="size-4" />}
          {pending ? "Registrando…" : `Registrar ${cop(amount)}`}
        </button>
      </>
    ) : (
      <>
        <button type="button" onClick={() => close(false)} disabled={pending || stage === "reading"} className={cn(buttonVariants({ variant: "outline" }), "flex-1 sm:flex-none")}>
          Cancelar
        </button>
        <button type="button" onClick={capture} disabled={!cameraOn || stage === "reading" || !!photo} className={cn(buttonVariants(), "min-w-44 flex-1 sm:flex-none")}>
          <Camera aria-hidden="true" className="size-4" />
          Tomar foto
        </button>
      </>
    );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={close}
      title="Escanear pago"
      description={stage === "done" ? "Pago registrado con su comprobante." : "Fotografía el comprobante del cliente."}
      footer={footer}
    >
      {stage === "done" && receipt ? (
        <section aria-live="assertive" className="nx-rise grid gap-3 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 p-5 text-center">
          <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-emerald-600 dark:text-emerald-400" />
          <p className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400">Pago registrado</p>
          <p className="text-sm text-muted-foreground">
            Recibo <b className="font-mono text-foreground">{receipt.reference}</b> de {business.name}
            {customer ? ` para ${customer.name}` : ""}.
          </p>
          <a href={receipt.link} target="_blank" rel="noreferrer" className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
            Ver recibo verificable
          </a>
        </section>
      ) : stage === "confirm" && photoUrl ? (
        <div className="nx-rise grid grid-cols-1 gap-4">
          <div ref={photoWrapRef} className="mx-auto w-full max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={photoRef} src={photoUrl} alt="Comprobante fotografiado" className="aspect-[3/4] w-full rounded-lg border border-border bg-surface-muted object-contain" />
            <p className="mt-1 text-center text-[12.5px] text-muted-foreground">
              {detected.length ? detected.join(" · ") : "No se leyó el monto; escríbelo abajo."}
            </p>
          </div>
          <div>
            <AmountDisplay value={amount} />
            <p className="mt-0.5 text-center text-[12.5px] text-muted-foreground">Confirma o corrige el monto</p>
          </div>
          <Keypad onKey={press} />
          <Field label="Cliente">
            {(control) => (
              <select {...control} value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={selectClasses}>
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
              {PAYMENT_METHODS.map((m) => (
                <Chip key={m.value} selected={m.value === method} onClick={() => setMethod(m.value)}>
                  {m.label}
                </Chip>
              ))}
            </ChipRow>
          </div>
          <Field label="Concepto" hint="Opcional. Sale en el comprobante.">
            {(control) => (
              <input {...control} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} placeholder="Ej. Mensualidad octubre" className={inputClasses} />
            )}
          </Field>
          {error ? <Alert tone="danger">{error}</Alert> : null}
        </div>
      ) : stage === "reading" && photoUrl ? (
        <div className="grid gap-4 py-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" className="mx-auto max-h-56 rounded-lg border border-border object-contain" />
          <div className="grid justify-items-center gap-2">
            <NMark size={36} state="loop" />
            <p className="text-sm font-medium">Leyendo el comprobante…</p>
            <p className="text-xs text-muted-foreground">Buscando el monto en el QR y en la imagen.</p>
          </div>
        </div>
      ) : (
        <div className="nx-rise grid gap-4">
          <div className="relative overflow-hidden rounded-lg border border-border bg-black">
            <video ref={videoRef} muted playsInline className={cn("aspect-[3/4] w-full object-cover transition-opacity duration-300", cameraOn ? "opacity-100" : "opacity-0")} />
            {!cameraOn ? (
              <div className="absolute inset-0 grid place-items-center gap-2 p-6 text-center text-muted-foreground">
                <Camera aria-hidden="true" className="size-8" />
                <p className="text-sm">Abre la cámara o sube la foto del comprobante.</p>
              </div>
            ) : null}
          </div>
          <label className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer justify-center")}>
            <ImageUp aria-hidden="true" className="size-4" />
            Subir foto del comprobante
            <input type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" aria-label="Subir foto del comprobante" />
          </label>
          <p className="text-center text-xs text-muted-foreground">{business.name}: la foto se guarda como soporte del pago.</p>
        </div>
      )}
    </ResponsiveSheet>
  );
}
