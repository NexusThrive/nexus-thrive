"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Select } from "@/components/atoms/select";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { EmptyState } from "@/components/molecules/empty-state";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { FormDialog } from "@/components/organisms/form-sheet";
import { SOLUTION_IDS, SOLUTIONS } from "@/lib/core/capabilities/solutions";
import type { SolutionRow } from "@/lib/platform/admin/solutions-db";
import { setSolutionAction } from "@/app/admin/soluciones/actions";

/** Lista de negocios con su solución; los dudosos primero. Cambiar la solución abre un diálogo (revisión manual). */
export default function SolutionsView({ rows, canEdit }: { rows: SolutionRow[]; canEdit: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "review">("all");
  const [editing, setEditing] = useState<SolutionRow | null>(null);
  const list = rows.filter((r) => filter === "all" || r.doubtful);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar negocios">
        {(["all", "review"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={buttonVariants({ variant: filter === f ? "default" : "outline", size: "sm" })}>
            {f === "all" ? "Todos" : "Por revisar"}
          </button>
        ))}
      </div>

      <AdaptiveTable
        caption="Negocios con su solución"
        rows={list}
        getRowId={(r) => r.id}
        empty={<EmptyState title="Nada por revisar" description="Todos los negocios tienen una solución clara." />}
        columns={[
          { key: "name", header: "Negocio", role: "primary", cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: "solution", header: "Solución", role: "secondary", cell: (r) => SOLUTIONS[r.solution].label },
          { key: "source", header: "Origen", role: "detail", cell: (r) => (r.source === "manual" ? "Fijada a mano" : `Por rubro (${r.vertical})`) },
          {
            key: "review",
            header: "Revisión",
            role: "detail",
            cell: (r) =>
              r.doubtful ? (
                <span className="grid gap-1">
                  <Badge tone="warning">Por revisar</Badge>
                  {r.reasons.map((t) => (
                    <small key={t} className="text-xs text-muted-foreground">{t}</small>
                  ))}
                </span>
              ) : r.outside.length ? (
                <small className="text-xs text-muted-foreground">Revisado; conserva: {r.outside.join(", ")}</small>
              ) : (
                <Badge tone="success">Claro</Badge>
              ),
          },
          {
            key: "actions",
            header: "Acciones",
            role: "action",
            cell: (r) =>
              canEdit ? (
                <button type="button" onClick={() => setEditing(r)} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label={`Cambiar la solución de ${r.name}`}>
                  Cambiar
                </button>
              ) : null,
          },
        ]}
      />

      <FormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing ? `Solución de ${editing.name}` : "Solución"}
        description="Fija la solución a mano para un negocio híbrido, o vuelve a la que le corresponde por su rubro. No cambia sus datos ni apaga nada."
        submitLabel="Guardar"
        pendingLabel="Guardando…"
        onSubmit={async (d) => {
          const r = await setSolutionAction(editing!.id, String(d.get("solution") ?? "auto"));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {() => (
          <Field label="Solución" required>
            {(c) => (
              <Select {...c} name="solution" defaultValue={editing?.source === "manual" ? editing.solution : "auto"}>
                <option value="auto">Según su rubro</option>
                {SOLUTION_IDS.map((s) => (
                  <option key={s} value={s}>{SOLUTIONS[s].label}</option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </FormDialog>
    </div>
  );
}
