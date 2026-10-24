"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { findSaleAction, returnSaleAction } from "@/app/[tenant]/(app)/pos/actions";
import { PAYMENT_METHODS } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import type { SaleToReturn } from "@/lib/pos/returns-db";

/** Modal pequeño de devolución: busca la venta por su número y elige qué unidades vuelven. */
export default function ReturnDialog({ slug, open, onClose }: { slug: string; open: boolean; onClose: () => void }) {
  const [number, setNumber] = useState("");
  const [sale, setSale] = useState<SaleToReturn | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [searchError, setSearchError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const reset = () => {
    setSale(null);
    setQty({});
    setNumber("");
    setSearchError(null);
  };
  const search = async () => {
    setSearchError(null);
    const r = await findSaleAction(slug, Number(number));
    if (r.ok) setSale(r.sale);
    else setSearchError(r.message);
  };
  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
      title="Devolución"
      description="Busca la venta por su número y elige lo que vuelve: se emite la nota crédito y las unidades regresan a la bodega."
      submitLabel="Registrar devolución"
      pendingLabel="Registrando…"
      submitDisabled={!sale}
      onSubmit={async (d) => {
        if (!sale) return { ok: false, message: "Busca primero la venta." };
        const lines = sale.lines.map((l) => ({ productId: l.productId, quantity: Number(qty[l.productId] ?? 0) || 0 }));
        const r = await returnSaleAction(slug, { documentId: sale.documentId, lines, reason: String(d.get("reason") ?? ""), refundMethod: String(d.get("method") ?? "CASH") });
        return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
      }}
      onSuccess={({ message }) => {
        if (message) toast(message, "success");
        reset();
        onClose();
        router.refresh();
      }}
    >
      {() => (
        <div className="grid gap-3">
          <div className="flex items-end gap-2">
            <Field label="N.º de la venta" error={searchError ?? undefined}>{(c) => <input {...c} inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} className={inputClasses} />}</Field>
            <button type="button" onClick={search} disabled={!number} className={buttonVariants({ variant: "outline", className: "mb-0.5" })}>Buscar</button>
          </div>
          {sale ? (
            <>
              <p className="text-[13px] text-muted-foreground">Venta N.º {sale.number} · {formatCurrency(sale.total)}</p>
              <ul className="grid gap-2">
                {sale.lines.map((l) => (
                  <li key={l.productId} className="flex items-center gap-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate">{l.description}<small className="block text-xs text-muted-foreground">Vendidas {l.sold} · devueltas {l.returned} · por devolver {l.remaining}</small></span>
                    <input aria-label={`Devolver de ${l.description}`} inputMode="numeric" disabled={l.remaining === 0} value={qty[l.productId] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [l.productId]: e.target.value }))} className={`${inputClasses} h-8 w-16 px-2`} />
                  </li>
                ))}
              </ul>
              <Field label="Motivo" required>{(c) => <input {...c} name="reason" autoComplete="off" maxLength={200} className={inputClasses} />}</Field>
              <Field label="Se devuelve el dinero por" required>
                {(c) => (
                  <Select {...c} name="method" defaultValue="CASH">
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select>
                )}
              </Field>
            </>
          ) : null}
        </div>
      )}
    </FormDialog>
  );
}
