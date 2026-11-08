"use client";

import { MoneyInput } from "@/components/molecules/money-input";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { DEFAULT_METHODS, type PaymentMethodOption } from "@/lib/business/sales/payment-methods";
import Sale, { type PosCategory, type PosCustomer, type PosProduct } from "./pos-sale";
import { createTerminalAction, openTurnAction } from "@/app/[tenant]/(app)/pos/actions";

export type { PosCategory, PosCustomer, PosProduct } from "./pos-sale";
export type PosTerminalOption = { id: string; name: string; busy: boolean };

export default function PosView({ slug, canManage, terminals, turn, products, categories = [], customers = [], methods = DEFAULT_METHODS as PaymentMethodOption[] }: { categories?: PosCategory[]; customers?: PosCustomer[]; methods?: PaymentMethodOption[];  slug: string; canManage: boolean; terminals: PosTerminalOption[]; turn: { sessionId: string; terminalName: string; openingAmount: number } | null; products: PosProduct[] }) {
  return turn ? <Sale slug={slug} turn={turn} products={products} categories={categories} customers={customers} methods={methods} /> : <NoTurn slug={slug} canManage={canManage} terminals={terminals} />;
}

function NoTurn({ slug, canManage, terminals }: { slug: string; canManage: boolean; terminals: PosTerminalOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [terminalId, setTerminalId] = useState(terminals.find((t) => !t.busy)?.id ?? "");
  const [opening, setOpening] = useState<number | null>(0);
  const [naming, setNaming] = useState(false);
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok) router.refresh();
    });
  return (
    <section aria-labelledby="pos-open" className="grid max-w-xl gap-4 rounded-lg border border-border bg-surface p-5">
      <h2 id="pos-open" className="font-display text-[15px] font-semibold">Abrir turno</h2>
      {terminals.length === 0 ? (
        <Alert tone="info">{canManage ? "Aún no hay terminales. Crea la primera para empezar a vender." : "Aún no hay terminales: pídele al dueño o a administración que cree una."}</Alert>
      ) : (
        <div className="grid gap-3">
          <Field label="Terminal" required>
            {(c) => (
              <Select {...c} value={terminalId} onChange={(e) => setTerminalId(e.target.value)}>
                {terminals.map((t) => <option key={t.id} value={t.id} disabled={t.busy}>{t.name}{t.busy ? " (en uso)" : ""}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Efectivo con el que abres" required hint="Lo que hay en la caja al empezar.">
            {(c) => <MoneyInput id={c.id} aria-describedby={c["aria-describedby"]} value={opening} onValueChange={setOpening} />}
          </Field>
          <button type="button" disabled={pending || !terminalId} onClick={() => run(() => openTurnAction(slug, terminalId, opening ?? 0))} className={buttonVariants({ className: "justify-self-start" })}>
            {pending ? "Abriendo…" : "Abrir turno"}
          </button>
        </div>
      )}
      {canManage ? (
        <button type="button" onClick={() => setNaming(true)} className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>
          <Plus aria-hidden="true" className="size-4" /> Nueva terminal
        </button>
      ) : null}
      <FormDialog
        open={naming}
        onOpenChange={setNaming}
        title="Nueva terminal"
        description="Un puesto de venta con su propia caja (mostrador, sede, tablet…)."
        submitLabel="Crear terminal"
        pendingLabel="Creando…"
        onSubmit={async (d) => {
          const r = await createTerminalAction(slug, String(d.get("name") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { name: r.message } };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => <Field label="Nombre" required error={fieldErrors.name}>{(c) => <input {...c} name="name" autoComplete="off" className={inputClasses} placeholder="Nombre de la caja" />}</Field>}
      </FormDialog>
    </section>
  );
}
