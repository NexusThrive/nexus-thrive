"use client";

import { useState } from "react";
import { Select } from "@/components/atoms/select";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { createCountAction } from "@/app/[tenant]/(app)/stock/actions";
import type { WarehouseOption } from "./stock-view";

/** Abre un conteo: toma una foto de lo que dice el sistema en la bodega elegida. */
export default function NewCountDialog({ slug, warehouses, onClose, onCreated }: { slug: string; warehouses: WarehouseOption[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [warehouseId, setWarehouseId] = useState(warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? "");
  const { toast } = useToast();
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Nuevo conteo"
      description="Se guarda lo que dice el sistema hoy; tú anotas lo que cuentas y al cerrar se ajustan las diferencias."
      submitLabel="Empezar a contar"
      pendingLabel="Abriendo…"
      onSubmit={async () => {
        const r = await createCountAction(slug, warehouseId);
        if (!r.ok) return { ok: false, message: r.message };
        toast(r.message, "success");
        onCreated(r.id ?? "");
        return { ok: true };
      }}
    >
      <Field label="Bodega que vas a contar">
        {(c) => (
          <Select {...c} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </FormDialog>
  );
}
