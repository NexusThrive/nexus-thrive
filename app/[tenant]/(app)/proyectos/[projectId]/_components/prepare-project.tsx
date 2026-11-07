"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/atoms/button";
import { EmptyState } from "@/components/molecules/empty-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Preparando…" : "Preparar obra"}
    </Button>
  );
}

/**
 * Estado vacío para obras creadas antes de que presupuesto, plan y bitácora
 * nacieran con la obra. Crearlos es una acción explícita del usuario.
 */
export default function PrepareProject({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <EmptyState
      className="rounded-lg border border-border bg-card"
      title="Esta obra todavía no tiene presupuesto, plan ni bitácora"
      description="Se creó antes de que se generaran automáticamente. Prepárala una vez y todas las pestañas quedan disponibles."
      action={<><form action={action}>
        <SubmitButton />
      </form></>}
    />
  );
}
