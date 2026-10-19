"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banknote, Camera, MinusCircle } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ExpenseSheet } from "@/components/organisms/expense-sheet";
import { PaymentSheet } from "@/components/organisms/payment-sheet";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { createExpenseAction, createPaymentAction } from "../actions";
import { ScanPaymentSheet } from "./scan-payment-sheet";

export type CustomerOption = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

type Open = "pago" | "gasto" | "escaneo" | null;

/**
 * Registrar pago (teclado + recibo impreso), registrar gasto (chips de
 * categoría) y escanear pago (foto del comprobante con lectura OCR/QR
 * best-effort). Los botones van dentro de la tarjeta de balance
 * (`tone="dark"`) o sobre fondo claro. `?nuevo=pago|gasto` y `?scan=1` abren
 * la hoja al llegar (acciones rápidas del inicio y del botón Crear). Las
 * escrituras son las Server Actions de siempre: validan, guardan y
 * revalidan Finanzas e Inicio.
 */
export default function FinanceActions({
  tenantSlug,
  business,
  customers,
  initial = null,
  initialCustomerId = "",
  tone = "dark",
  cashOpen = false,
}: {
  tenantSlug: string;
  business: { name: string; subtitle?: string };
  customers: CustomerOption[];
  initial?: Open;
  /** Cliente preseleccionado en el cobro (?cliente=, desde la ficha o la lista). */
  initialCustomerId?: string;
  tone?: "dark" | "light";
  /** Hay un turno de caja abierto: el gasto sale de caja por defecto. */
  cashOpen?: boolean;
}) {
  const [open, setOpen] = useState<Open>(initial);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setSheet = (next: Open) => {
    setOpen(next);
    // Quita ?nuevo=/?scan= al cerrar para que recargar no la vuelva a abrir.
    if (!next && (searchParams.has("nuevo") || searchParams.has("cliente") || searchParams.has("scan"))) {
      const params = new URLSearchParams(searchParams);
      params.delete("nuevo");
      params.delete("cliente");
      params.delete("scan");
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setSheet("pago")}
        className={cn(buttonVariants({ variant: "accent" }), "w-full sm:w-auto", tone === "light" && "sm:order-2")}
        data-mag=""
      >
        <Banknote aria-hidden="true" className="size-4" />
        Registrar pago
      </button>
      <button
        type="button"
        onClick={() => setSheet("escaneo")}
        className={cn(buttonVariants({ variant: "outline" }), "w-full sm:order-1 sm:w-auto")}
      >
        <Camera aria-hidden="true" className="size-4" />
        Escanear pago
      </button>
      <button
        type="button"
        onClick={() => setSheet("gasto")}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full sm:w-auto",
          tone === "dark" && "border-[#3A3A40] text-[#F7F6F3] hover:border-[#55555c] hover:bg-[#1E1E21]",
        )}
      >
        <MinusCircle aria-hidden="true" className="size-4" />
        Registrar gasto
      </button>

      <ScanPaymentSheet
        open={open === "escaneo"}
        onOpenChange={(next) => setSheet(next ? "escaneo" : null)}
        tenantSlug={tenantSlug}
        business={business}
        customers={customers.map((c) => ({ id: c.id, name: c.name, hint: c.email || undefined, phone: c.phone }))}
        defaultCustomerId={customers.some((c) => c.id === initialCustomerId) ? initialCustomerId : ""}
      />

      <PaymentSheet
        open={open === "pago"}
        onOpenChange={(next) => setSheet(next ? "pago" : null)}
        business={business}
        defaultCustomerId={customers.some((c) => c.id === initialCustomerId) ? initialCustomerId : ""}
        methods={PAYMENT_METHODS}
        customers={customers.map((c) => ({ id: c.id, name: c.name, hint: c.email || undefined, phone: c.phone }))}
        onCharge={async ({ amount, customerId, method, description }) => {
          const form = new FormData();
          form.set("tenantSlug", tenantSlug);
          form.set("status", "APPROVED");
          form.set("amount", String(amount));
          form.set("customerId", customerId);
          form.set("provider", method);
          form.set("providerRefId", "");
          form.set("description", description);
          const state = await createPaymentAction({ status: "idle" }, form);
          if (state.status === "ok" && state.receipt) return { ok: true, ...state.receipt };
          const fieldError = state.errors ? Object.values(state.errors).find(Boolean) : undefined;
          return { ok: false, message: state.message ?? fieldError ?? "No se pudo registrar el pago." };
        }}
      />

      <ExpenseSheet
        open={open === "gasto"}
        onOpenChange={(next) => setSheet(next ? "gasto" : null)}
        categories={EXPENSE_CATEGORIES}
        defaultPaidFrom={cashOpen ? "CASH" : "BANK"}
        onSave={async ({ amount, category, description, supplier, paidFrom, file }) => {
          const form = new FormData();
          form.set("tenantSlug", tenantSlug);
          form.set("amount", String(amount));
          form.set("category", category);
          form.set("description", description);
          form.set("supplier", supplier ?? "");
          form.set("paidFrom", paidFrom ?? "BANK");
          if (file) form.set("receipt", file);
          const state = await createExpenseAction({ status: "idle" }, form);
          if (state.status === "ok") return { ok: true };
          const field = state.errors?.amount ? "amount" : state.errors?.description ? "description" : state.errors?.category ? "category" : undefined;
          return {
            ok: false,
            field,
            message: state.message ?? (field ? state.errors?.[field] : undefined) ?? "No se pudo registrar el gasto.",
          };
        }}
      />
    </>
  );
}
