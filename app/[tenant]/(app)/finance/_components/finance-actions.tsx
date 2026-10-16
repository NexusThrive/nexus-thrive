"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import PaymentForm from "./payment-form";
import ExpenseForm from "./expense-form";
import { buttonVariants } from "@/components/atoms/button-variants";

export type CustomerOption = {
  id: string;
  name: string;
  email: string;
};

const ACTION_BUTTON =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground/80 transition hover:bg-muted";

/**
 * Controles de registro (Server Actions vía `useActionState` en cada modal).
 * Solo este componente es cliente: la página RSC sigue siendo la fuente de
 * datos y los modales cierran cuando el servidor confirma la escritura.
 */
export default function FinanceActions({
  tenantSlug,
  customers,
}: {
  tenantSlug: string;
  customers: CustomerOption[];
}) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpenseOpen(true)}
          className={ACTION_BUTTON}
        >
          <Plus aria-hidden="true" className="h-4 w-4 text-destructive" />
          Registrar gasto
        </button>
        <button
          type="button"
          onClick={() => setPaymentOpen(true)}
          className={buttonVariants()}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Registrar pago
        </button>
      </div>

      {paymentOpen ? (
        <PaymentForm
          tenantSlug={tenantSlug}
          customers={customers}
          onClose={() => setPaymentOpen(false)}
        />
      ) : null}

      {expenseOpen ? (
        <ExpenseForm
          tenantSlug={tenantSlug}
          onClose={() => setExpenseOpen(false)}
        />
      ) : null}
    </>
  );
}