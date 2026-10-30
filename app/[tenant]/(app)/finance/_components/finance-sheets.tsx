"use client";

import { ExpenseSheet } from "@/components/organisms/expense-sheet";
import { PaymentSheet } from "@/components/organisms/payment-sheet";
import { requestNotificationsRefresh } from "@/lib/dashboard/notifications-client";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { createExpenseAction, createPaymentAction } from "@/app/[tenant]/(app)/finance/actions";

export type CustomerOption = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

type Common = {
  tenantSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «Abrir en el panel completo» (mini-modal): a dónde lleva. */
  fullHref?: string;
};

/**
 * Cobro conectado a su Server Action: lo usan la pantalla de Finanzas y el
 * mini-modal de «Crear». Una sola escritura (`createPaymentAction`), una sola
 * lógica de aviso a la campana.
 */
export function ConnectedPaymentSheet({
  tenantSlug,
  open,
  onOpenChange,
  fullHref,
  business,
  customers,
  defaultCustomerId = "",
}: Common & { business: { name: string; subtitle?: string }; customers: CustomerOption[]; defaultCustomerId?: string }) {
  return (
    <PaymentSheet
      open={open}
      onOpenChange={onOpenChange}
      fullHref={fullHref}
      business={business}
      defaultCustomerId={customers.some((c) => c.id === defaultCustomerId) ? defaultCustomerId : ""}
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
        if (state.status === "ok" && state.receipt) {
          // La campana avisa (el servidor confirma por detrás).
          requestNotificationsRefresh({
            kind: "payment",
            title: `Pago recibido · ${formatCurrency(amount)}`,
            detail: customers.find((c) => c.id === customerId)?.name ?? "Venta de mostrador",
            href: "/finance",
          });
          return { ok: true, ...state.receipt };
        }
        const fieldError = state.errors ? Object.values(state.errors).find(Boolean) : undefined;
        return { ok: false, message: state.message ?? fieldError ?? "No se pudo registrar el pago." };
      }}
    />
  );
}

/** Gasto conectado a su Server Action (pantalla de Finanzas y mini-modal de «Crear»). */
export function ConnectedExpenseSheet({ tenantSlug, open, onOpenChange, fullHref, cashOpen }: Common & { cashOpen: boolean }) {
  return (
    <ExpenseSheet
      open={open}
      onOpenChange={onOpenChange}
      fullHref={fullHref}
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
        if (state.status === "ok") {
          requestNotificationsRefresh({ kind: "expense", title: `Gasto · ${formatCurrency(amount)}`, detail: description, href: "/finance" });
          return { ok: true };
        }
        const field = state.errors?.amount ? "amount" : state.errors?.description ? "description" : state.errors?.category ? "category" : undefined;
        return {
          ok: false,
          field,
          message: state.message ?? (field ? state.errors?.[field] : undefined) ?? "No se pudo registrar el gasto.",
        };
      }}
    />
  );
}
