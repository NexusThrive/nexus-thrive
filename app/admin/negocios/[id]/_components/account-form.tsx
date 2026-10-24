"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { NMark } from "@/components/atoms/n-mark";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ACCOUNT_STAGES, type AccountStageValue } from "@/lib/ops/account-stages";
import { updateAccountAction } from "../../actions";
import { Select } from "@/components/atoms/select";

/** Etapa comercial y responsable de la cuenta (permiso accounts.edit). */
export default function AccountForm({
  tenantId,
  stage,
  managerId,
  managers,
  canEdit,
}: {
  tenantId: string;
  stage: AccountStageValue;
  managerId: string | null;
  managers: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [value, setValue] = useState({ stage: stage as string, managerId: managerId ?? "" });
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const dirty = value.stage !== stage || value.managerId !== (managerId ?? "");

  return (
    <form
      className="grid gap-4 p-[18px]"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateAccountAction(tenantId, value);
          if (r.ok) {
            toast("Cuenta actualizada", "success");
            router.refresh();
          } else toast({ title: "No se pudo guardar", description: r.message, variant: "error" });
        });
      }}
    >
      <Field label="Etapa de la cuenta" hint="Distinta del estado del servicio (activo o suspendido).">
        {(c) => (
          <Select {...c} disabled={!canEdit} value={value.stage} onChange={(e) => setValue({ ...value, stage: e.target.value })}>
            {ACCOUNT_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Responsable de cuenta" hint="Toda cuenta activa necesita un responsable en el equipo NEXUS.">
        {(c) => (
          <Select {...c} disabled={!canEdit} value={value.managerId} onChange={(e) => setValue({ ...value, managerId: e.target.value })}>
            <option value="">Sin asignar</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {canEdit ? (
        <button type="submit" disabled={!dirty || pending} className={buttonVariants({ className: "justify-self-start" })}>
          {pending ? <NMark size={16} state="loop" className="text-current" /> : <Check aria-hidden="true" className="size-4" />}
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      ) : null}
    </form>
  );
}
