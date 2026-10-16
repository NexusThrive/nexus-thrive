"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

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
    <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <p className="text-sm font-medium text-foreground">
        Esta obra todavía no tiene presupuesto, plan ni bitácora
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        Se creó antes de que se generaran automáticamente. Prepárala una vez y
        todas las pestañas quedan disponibles.
      </p>
      <form action={action} className="mt-4">
        <SubmitButton />
      </form>
    </div>
  );
}
