"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Banknote, HandCoins, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Input } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Switch } from "@/components/atoms/switch";
import { Textarea } from "@/components/atoms/textarea";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import { METHOD_KINDS, MAX_METHODS, type PaymentMethodOption } from "@/lib/business/sales/payment-methods";
import { deleteMethodAction, moveMethodAction, saveMethodAction, setMethodActiveAction } from "@/app/[tenant]/(app)/pos/medios-de-pago/actions";

/** Medios de pago del negocio: lista ordenable, con activar/desactivar, edición con nombre e instrucciones, y borrado con confirmación. */
export default function PaymentMethodsView({ slug, methods }: { slug: string; methods: PaymentMethodOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<PaymentMethodOption | "new" | null>(null);
  const [kind, setKind] = useState("TRANSFER");
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");

  const open = (m: PaymentMethodOption | "new") => {
    setKind(m === "new" ? "TRANSFER" : m.kind);
    setName(m === "new" ? "" : m.name);
    setInstructions(m === "new" ? "" : (m.instructions ?? ""));
    setEditing(m);
  };
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, done?: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast(r.message ?? "No se pudo guardar.", "error");
      if (done) toast(done, "success");
      router.refresh();
    });
  const activeCount = methods.filter((m) => m.active).length;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{activeCount} {activeCount === 1 ? "medio activo" : "medios activos"} de {methods.length}</p>
        <Button type="button" onClick={() => open("new")} disabled={methods.length >= MAX_METHODS}><Plus aria-hidden="true" className="size-4" /> Nuevo medio</Button>
      </div>

      <ul className="grid gap-2.5">
        {methods.map((m, i) => (
          <li key={m.id} className="grid gap-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-accent-subtle text-accent-text">{m.kind === "CASH" ? <Banknote className="size-5" /> : m.kind === "CREDIT" ? <HandCoins className="size-5" /> : <Smartphone className="size-5" />}</span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2"><b className="truncate text-sm font-semibold">{m.name}</b>{m.active ? null : <Badge tone="muted">Apagado</Badge>}</span>
              <span className="block text-ui text-muted-foreground">{m.kind === "CASH" ? "Efectivo: entra a la caja del turno" : m.kind === "CREDIT" ? "Crédito: queda en la cartera del cliente" : "Transferencia o billetera"}{m.instructions ? ` · ${m.instructions}` : ""}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <button type="button" aria-label={`Subir ${m.name}`} disabled={pending || i === 0} onClick={() => run(() => moveMethodAction(slug, m.id, -1))} className={buttonVariants({ variant: "ghost", size: "icon" })}><ArrowUp aria-hidden="true" className="size-4" /></button>
              <button type="button" aria-label={`Bajar ${m.name}`} disabled={pending || i === methods.length - 1} onClick={() => run(() => moveMethodAction(slug, m.id, 1))} className={buttonVariants({ variant: "ghost", size: "icon" })}><ArrowDown aria-hidden="true" className="size-4" /></button>
              <Switch checked={m.active} disabled={pending} aria-label={`${m.active ? "Apagar" : "Encender"} ${m.name}`} onCheckedChange={(on) => run(() => setMethodActiveAction(slug, m.id, on), on ? "Medio encendido" : "Medio apagado")} />
              <button type="button" aria-label={`Editar ${m.name}`} onClick={() => open(m)} className={buttonVariants({ variant: "outline", size: "icon" })}><Pencil aria-hidden="true" className="size-4" /></button>
              <button
                type="button"
                aria-label={`Borrar ${m.name}`}
                disabled={pending}
                onClick={async () => {
                  const ok = await confirm({ title: `¿Borrar «${m.name}»?`, description: "Los cobros que ya hiciste con este medio conservan su nombre. Dejará de ofrecerse al cobrar.", confirmLabel: "Borrar", tone: "danger" });
                  if (ok) run(() => deleteMethodAction(slug, m.id), "Medio borrado");
                }}
                className={buttonVariants({ variant: "ghost", size: "icon" })}
              ><Trash2 aria-hidden="true" className="size-4" /></button>
            </span>
          </li>
        ))}
      </ul>

      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? "Nuevo medio de pago" : "Editar medio de pago"}
        description="Elige cómo se registra el dinero y cómo lo verá quien cobra."
        submitLabel={editing === "new" ? "Crear medio" : "Guardar"}
        onSubmit={async () => {
          const result = await saveMethodAction(slug, { kind, name, instructions }, editing && editing !== "new" ? editing.id : undefined);
          return result.ok ? { ok: true, message: "Medio guardado" } : { ok: false, message: result.message, fieldErrors: { nombre: result.message } };
        }}
        onSuccess={() => { toast("Medio guardado", "success"); router.refresh(); }}
      >
        {({ fieldErrors }) => (
          <>
            <Field label="Tipo" required hint={METHOD_KINDS.find((k) => k.value === kind)?.hint}>
              {(c) => (
                <Select {...c} value={kind} onChange={(e) => setKind(e.target.value)}>
                  {METHOD_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Nombre" required error={fieldErrors.nombre}>{(c) => <Input {...c} name="nombre" value={name} maxLength={40} autoFocus placeholder="Nequi, Daviplata, Bancolombia…" onChange={(e) => setName(e.target.value)} />}</Field>
            <Field label="Dónde pagar" optional hint="Número, cuenta o llave. Se muestra en el cobro del punto de venta.">{(c) => <Textarea {...c} value={instructions} maxLength={300} onChange={(e) => setInstructions(e.target.value)} />}</Field>
          </>
        )}
      </FormDialog>
      {confirmDialog}
    </div>
  );
}
