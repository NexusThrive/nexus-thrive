"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { MAX_FREEZE_DAYS } from "@/lib/business/gym";
import { bogotaDayKey } from "@/lib/finance/series";
import { formatDateShort } from "@/lib/format";
import { cancelMembershipAction, freezeMembershipAction, unfreezeMembershipAction, type AccessActionResult } from "../../crm/[id]/access-actions";
import type { MembershipViewRow } from "./membership-table";

/** Congelar (corre el vencimiento), reactivar o cancelar con motivo. */
export default function MembershipHoldSheet({ tenantSlug, membership, onClose }: { tenantSlug: string; membership: MembershipViewRow; onClose: () => void }) {
  const [from, setFrom] = useState(() => bogotaDayKey(Date.now()));
  const [days, setDays] = useState("15");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const run = (p: () => Promise<AccessActionResult>) =>
    start(async () => {
      const r = await p();
      if (r.ok) {
        toast(r.message ?? "Listo", "success");
        router.refresh();
        onClose();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });

  const n = Number(days);
  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && onClose()} title={membership.customerName} description={`Vence el ${formatDateShort(membership.endDate)}`}>
      <div className="grid gap-6">
        {membership.hold === "cancelled" ? (
          <p className="text-sm text-muted-foreground">Esta membresía está cancelada. Para que vuelva, crea una membresía nueva.</p>
        ) : membership.hold === "frozen" ? (
          <section className="grid gap-3">
            <h3 className="text-[13px] font-semibold">Está congelada</h3>
            <p className="text-[13px] text-muted-foreground">Al reactivarla, los días que no se usaron del congelamiento se descuentan del vencimiento.</p>
            <button type="button" disabled={pending} onClick={() => run(() => unfreezeMembershipAction(tenantSlug, membership.id))} className={buttonVariants({ size: "sm" })}>
              Reactivar ahora
            </button>
          </section>
        ) : (
          <section className="grid gap-3">
            <h3 className="text-[13px] font-semibold">Congelar</h3>
            <p className="text-[13px] text-muted-foreground">Viaje, lesión o incapacidad: mientras está congelada no puede entrar y el vencimiento se corre los mismos días.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde">{(c) => <input {...c} type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClasses} />}</Field>
              <Field label="Días" hint={`De 1 a ${MAX_FREEZE_DAYS}`}>{(c) => <input {...c} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} className={inputClasses} />}</Field>
            </div>
            <button type="button" disabled={pending || !(n >= 1 && n <= MAX_FREEZE_DAYS)} onClick={() => run(() => freezeMembershipAction(tenantSlug, membership.id, from, n))} className={buttonVariants({ size: "sm" })}>
              Congelar {n >= 1 ? `${n} ${n === 1 ? "día" : "días"}` : ""}
            </button>
          </section>
        )}

        {membership.hold !== "cancelled" ? (
          <section className="grid gap-3 border-t border-border pt-5">
            <h3 className="text-[13px] font-semibold">Cancelar</h3>
            <Field label="Motivo" hint="Queda en el historial. Solo el dueño o administración pueden cancelar.">
              {(c) => <input {...c} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Se mudó, retiro voluntario…" className={inputClasses} />}
            </Field>
            <button
              type="button"
              disabled={pending || reason.trim().length < 3}
              onClick={() => window.confirm("¿Cancelar la membresía? No podrá entrar con ella.") && run(() => cancelMembershipAction(tenantSlug, membership.id, reason))}
              className={buttonVariants({ size: "sm", variant: "danger" })}
            >
              Cancelar membresía
            </button>
          </section>
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
