"use client";

import { MoneyInput } from "@/components/molecules/money-input";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardCheck, Plus, ShoppingBag, Store } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { cn } from "@/lib/utils";
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
  const card = "rounded-(--radius-widget) border border-border/60 bg-card p-6";
  const steps = [
    { icon: Store, title: "Abre tu turno", text: "Elige la terminal y cuenta el efectivo con el que empiezas." },
    { icon: ShoppingBag, title: "Vende", text: "Toca los productos, cobra con el medio que prefieras e imprime el tiquete." },
    { icon: ClipboardCheck, title: "Cierra con arqueo", text: "Cuenta la caja al terminar: el sistema calcula la diferencia." },
  ];
  const newTerminal = canManage ? (
    <button type="button" onClick={() => setNaming(true)} className={cn(terminals.length === 0 ? buttonVariants({ variant: "accent" }) : buttonVariants({ variant: "outline" }), "h-11 rounded-full px-5 text-sm font-semibold", terminals.length === 0 ? "justify-self-center" : "justify-self-start", terminals.length > 0 && "border-border/60 bg-transparent font-medium")}>
      <Plus aria-hidden="true" className="size-4" /> {terminals.length === 0 ? "Crear la primera terminal" : "Nueva terminal"}
    </button>
  ) : null;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-labelledby="pos-open" className={cn(card, "grid gap-6")}>
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent-text">
            <Store className="size-6" strokeWidth={1.6} />
          </span>
          <div className="grid gap-1">
            <h2 id="pos-open" className="font-display text-xl font-semibold">Abrir turno</h2>
            <p className="text-ui text-muted-foreground">Elige tu terminal y la base de efectivo para empezar a vender.</p>
          </div>
        </div>
        {terminals.length === 0 ? (
          <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed border-border-strong px-6 py-10 text-center">
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-surface-muted text-muted-foreground">
              <Store className="size-5" strokeWidth={1.6} />
            </span>
            <p className="font-display text-base font-semibold">Aún no hay terminales</p>
            <p className="max-w-sm text-ui text-muted-foreground">{canManage ? "Una terminal es un puesto de venta con su propia caja (mostrador, sede, tablet…). Crea la primera para empezar." : "Pídele al dueño o a administración que cree una terminal para poder vender."}</p>
            {newTerminal}
          </div>
        ) : (
          <div className="grid gap-5">
            <fieldset className="grid gap-2.5">
              <legend className="mb-1 text-ui font-medium">Terminal</legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {terminals.map((t) => (
                  <button key={t.id} type="button" disabled={t.busy} aria-pressed={terminalId === t.id} onClick={() => setTerminalId(t.id)} className={cn("flex items-center gap-3 rounded-2xl border p-3.5 text-left outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50", terminalId === t.id ? "border-accent bg-accent-subtle" : "border-border/60 bg-surface-muted/60 hover:bg-accent-subtle/40")}>
                    <span aria-hidden="true" className={cn("grid size-10 shrink-0 place-items-center rounded-full", terminalId === t.id ? "bg-accent text-ink" : "bg-card text-muted-foreground")}>
                      {terminalId === t.id ? <Check className="size-4" strokeWidth={2.6} /> : <Store className="size-4" />}
                    </span>
                    <span className="grid min-w-0">
                      <span className="truncate text-ui font-semibold">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.busy ? "En uso por otra persona" : "Disponible"}</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="Efectivo con el que abres" required hint="Lo que hay en la caja al empezar.">
              {(c) => <MoneyInput id={c.id} className="h-12 rounded-2xl" aria-describedby={c["aria-describedby"]} value={opening} onValueChange={setOpening} />}
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={pending || !terminalId} onClick={() => run(() => openTurnAction(slug, terminalId, opening ?? 0))} className={cn(buttonVariants({ variant: "accent" }), "h-12 rounded-full px-8 text-base font-semibold")}>
                {pending ? "Abriendo…" : "Abrir turno"}
              </button>
              {newTerminal}
            </div>
          </div>
        )}
      </section>

      <aside aria-label="Cómo funciona" className={cn(card, "grid gap-4")}>
        <h2 className="text-ui font-semibold">Cómo funciona</h2>
        <ol className="grid gap-3">
          {steps.map((st, n) => (
            <li key={st.title} className="flex items-start gap-3 rounded-2xl bg-surface-muted/60 p-3.5">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-accent-text">
                <st.icon className="size-4" strokeWidth={1.7} />
              </span>
              <span className="grid gap-0.5">
                <span className="text-ui font-semibold">{n + 1}. {st.title}</span>
                <span className="text-xs text-muted-foreground">{st.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>
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
    </div>
  );
}
