"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banknote, MinusCircle } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ExpenseSheet } from "@/components/organisms/expense-sheet";
import { PaymentSheet } from "@/components/organisms/payment-sheet";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { createExpenseAction, createPaymentAction } from "../actions";

export type CustomerOption = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

type Open = "pago" | "gasto" | null;

/**
 * Registrar pago (teclado + recibo impreso) y registrar gasto (chips de
 * categoría). Los botones van dentro de la tarjeta de balance (`tone="dark"`)
 * o sobre fondo claro. `?nuevo=pago|gasto` abre la hoja al llegar (acciones
 * rápidas del inicio y del botón Crear). Las escrituras son las Server
 * Actions de siempre: validan, guardan y revalidan Finanzas e Inicio.
 */
export default function FinanceActions({
  tenantSlug,
  business,
  customers,
  initial = null,
  initialCustomerId = "",
  tone = "dark",
}: {
  tenantSlug: string;
  business: { name: string; subtitle?: string };
  customers: CustomerOption[];
  initial?: Open;
  /** Cliente preseleccionado en el cobro (?cliente=, desde la ficha o la lista). */
  initialCustomerId?: string;
  tone?: "dark" | "light";
}) {
  const [open, setOpen] = useState<Open>(initial);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setSheet = (next: Open) => {
    setOpen(next);
    // Quita ?nuevo= al cerrar para que recargar no la vuelva a abrir.
    if (!next && (searchParams.has("nuevo") || searchParams.has("cliente"))) {
      const params = new URLSearchParams(searchParams);
      params.delete("nuevo");
      params.delete("cliente");
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setSheet("pago")}
        className={cn(buttonVariants({ variant: "accent" }), tone === "light" && "order-2")}
        data-mag=""
      >
        <Banknote aria-hidden="true" className="size-4" />
        Registrar pago
      </button>
      <button
        type="button"
        onClick={() => setSheet("gasto")}
        className={cn(
          buttonVariants({ variant: "outline" }),
          tone === "dark" && "border-[#3A3A40] text-[#F7F6F3] hover:border-[#55555c] hover:bg-[#1E1E21]",
        )}
      >
        <MinusCircle aria-hidden="true" className="size-4" />
        Registrar gasto
      </button>

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
        onSave={async ({ amount, category, description }) => {
          const form = new FormData();
          form.set("tenantSlug", tenantSlug);
          form.set("amount", String(amount));
          form.set("category", category);
          form.set("description", description);
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
