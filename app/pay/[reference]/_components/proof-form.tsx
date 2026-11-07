"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { submitProofAction } from "@/app/pay/[reference]/actions";

/** «Ya pagué por transferencia»: el cliente escribe su referencia y el negocio la verifica. No confirma el pago. */
export function ProofForm({ reference }: { reference: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const note = String(new FormData(e.currentTarget).get("proof") ?? "");
        setError(null);
        start(async () => {
          const r = await submitProofAction(reference, note);
          if (r.ok) router.refresh();
          else setError(r.message);
        });
      }}
    >
      <p className="text-ui font-medium">¿Pagaste por transferencia?</p>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label="Número o referencia de tu transferencia" required hint="El negocio la verifica en su banco antes de confirmar tu pago.">
        {(c) => <input {...c} name="proof" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Ej.: Bancolombia 88231" />}
      </Field>
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "outline" })}>
        {pending ? "Enviando…" : "Avisar que ya pagué"}
      </button>
    </form>
  );
}
