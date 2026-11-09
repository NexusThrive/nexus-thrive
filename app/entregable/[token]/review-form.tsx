"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { decideDeliverableAction, type DecisionResult } from "@/app/entregable/[token]/actions";

/** Formulario del cliente: su nombre, un comentario y dos salidas claras (aprobar o pedir cambios). */
export default function ReviewForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const submit = (decision: "APPROVED" | "CHANGES_REQUESTED") => (event: React.MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form!;
    const data = new FormData(form);
    start(async () => {
      const r: DecisionResult = await decideDeliverableAction(token, { decision, name: String(data.get("name") ?? ""), comment: String(data.get("comment") ?? "") });
      if (r.ok) router.refresh();
      else setError({ message: r.message, field: r.field });
    });
  };
  return (
    <form onSubmit={(e) => e.preventDefault()} className="grid gap-3">
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      <Field label="Tu nombre" required error={error?.field === "name" ? error.message : undefined}>{(c) => <input {...c} name="name" autoComplete="name" maxLength={120} className={inputClasses} />}</Field>
      <Field label="Comentario" error={error?.field === "comment" ? error.message : undefined} hint="Obligatorio si pides cambios.">{(c) => <textarea {...c} name="comment" rows={3} maxLength={1000} className={inputClasses} />}</Field>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={submit("APPROVED")} className={buttonVariants()}>Aprobar</button>
        <button type="button" disabled={pending} onClick={submit("CHANGES_REQUESTED")} className={buttonVariants({ variant: "outline" })}>Pedir cambios</button>
      </div>
    </form>
  );
}
