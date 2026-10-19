"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, selectClasses } from "@/components/atoms/input";
import { useToast } from "@/components/molecules/toast";
import { PAYMENT_METHODS } from "@/lib/finance";
import { payInvoiceAction, voidInvoiceAction } from "../actions";

export default function InvoiceActions({ slug, id, status, canManage }: { slug: string; id: string; status: string; canManage: boolean }) {
  const [method, setMethod] = useState("TRANSFER");
  const [reason, setReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast(r.message ?? "Listo", "success");
        router.refresh();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Printer aria-hidden="true" className="size-3.5" /> Imprimir o guardar PDF
      </button>
      {status === "ISSUED" ? (
        <>
          <select aria-label="Medio de pago" value={method} onChange={(e) => setMethod(e.target.value)} className={`${selectClasses} h-8 w-auto text-[13px]`}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button type="button" disabled={pending} onClick={() => run(() => payInvoiceAction(slug, id, method))} className={buttonVariants({ size: "sm" })}>
            Marcar como pagada
          </button>
          {canManage ? (
            voiding ? (
              <span className="flex items-center gap-2">
                <input aria-label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" className={`${inputClasses} h-8 w-48`} />
                <button type="button" disabled={pending || reason.trim().length < 3} onClick={() => run(() => voidInvoiceAction(slug, id, reason))} className={buttonVariants({ size: "sm", variant: "danger" })}>
                  Anular
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setVoiding(true)} className={buttonVariants({ size: "sm", variant: "ghost", className: "text-danger" })}>
                Anular
              </button>
            )
          ) : null}
        </>
      ) : null}
    </div>
  );
}
