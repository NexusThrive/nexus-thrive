"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Select } from "@/components/atoms/select";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { PAYMENT_METHODS } from "@/lib/foundation/kernel/payment-vocabulary";
import { formatCurrency } from "@/lib/foundation/format";
import { cn } from "@/lib/utils";
import { assignMembershipAction, customerFormDataAction } from "../../profile-actions";

type Plan = { id: string; name: string; price: number; days: number };

/**
 * Botón «Agregar membresía» de la ficha: elige un tipo de membresía del
 * catálogo (la duración sale del tipo) y, si quien registra maneja dinero,
 * cómo paga. No hace falta abrir la edición del cliente.
 */
export default function AssignMembership({
  tenantSlug,
  customerId,
  customerName,
  hasActive,
  canCharge,
  className,
}: {
  tenantSlug: string;
  customerId: string;
  customerName: string;
  hasActive: boolean;
  canCharge: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [planId, setPlanId] = useState("");
  const [method, setMethod] = useState("NONE");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open || plans) return;
    let alive = true;
    void customerFormDataAction(tenantSlug).then((data) => alive && setPlans(data?.plans ?? []));
    return () => {
      alive = false;
    };
  }, [open, plans, tenantSlug]);

  const close = () => {
    setOpen(false);
    setPlanId("");
    setMethod("NONE");
  };

  const save = () =>
    start(async () => {
      const result = await assignMembershipAction(tenantSlug, customerId, planId, method === "NONE" ? "" : method);
      if (!result.ok) {
        toast({ title: "No se pudo asignar", description: result.message, variant: "error" });
        return;
      }
      toast(result.message, "success");
      close();
      router.refresh();
    });

  const selected = plans?.find((p) => p.id === planId);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(buttonVariants({ variant: "accent" }), className)}>
        <CreditCard aria-hidden="true" className="size-4" />
        {hasActive ? "Cambiar membresía" : "Agregar membresía"}
      </button>
      {open ? (
        <ResponsiveSheet
          open
          onOpenChange={(next) => !next && !pending && close()}
          title={hasActive ? "Cambiar membresía" : "Agregar membresía"}
          description={`Para ${customerName}. El vencimiento se calcula con la duración del tipo elegido.`}
          footer={
            <>
              <button type="button" onClick={close} disabled={pending} className={buttonVariants({ variant: "outline" })}>
                Cancelar
              </button>
              <button type="button" onClick={save} disabled={pending || !planId} data-save="" className={buttonVariants()}>
                {pending ? "Guardando…" : "Asignar membresía"}
              </button>
            </>
          }
        >
          <div className="grid gap-4">
            {plans === null ? (
              <p className="text-sm text-muted-foreground">Cargando tipos de membresía…</p>
            ) : plans.length === 0 ? (
              <p className="rounded-md bg-surface-muted p-3 text-sm text-muted-foreground">Aún no hay tipos de membresía. Créalos en Membresías → Tipos de membresía.</p>
            ) : (
              <>
                <Field label="Tipo de membresía" required hint={selected ? `${selected.days} días de vigencia desde hoy.` : undefined}>
                  {(c) => (
                    <Select {...c} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                      <option value="">Elige un tipo</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {formatCurrency(p.price)} · {p.days} días
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                {canCharge ? (
                  <Field label="Cobro" hint="Opcional: la membresía queda asignada aunque aún no pague.">
                    {(c) => (
                      <Select {...c} value={method} onChange={(e) => setMethod(e.target.value)}>
                        <option value="NONE">Aún no paga</option>
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                ) : null}
                {hasActive ? <p className="text-xs text-muted-foreground">La membresía vigente se reemplaza y queda en el histórico.</p> : null}
              </>
            )}
          </div>
        </ResponsiveSheet>
      ) : null}
    </>
  );
}
