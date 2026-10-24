"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { createWarehouseAction } from "@/app/[tenant]/(app)/stock/actions";
import type { WarehouseOption } from "./stock-view";

/** Bodegas del negocio: la principal existe sola; se crean las demás (sedes, depósitos, vitrinas). */
export default function WarehousesView({ slug, warehouses }: { slug: string; warehouses: WarehouseOption[] }) {
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  return (
    <div className="grid gap-3">
      <div className="flex">
        <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "ml-auto" })}>
          <Plus aria-hidden="true" className="size-4" /> Nueva bodega
        </button>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {warehouses.map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="grid min-w-0">
              <b className="truncate text-[13.5px] font-medium">{w.name}</b>
              {w.code ? <small className="font-mono text-xs text-muted-foreground">{w.code}</small> : null}
            </span>
            {w.isDefault ? <Badge variant="outline">Principal</Badge> : null}
          </li>
        ))}
      </ul>
      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nueva bodega"
        description="Una sede, un depósito o una vitrina donde guardas mercancía."
        submitLabel="Crear bodega"
        pendingLabel="Creando…"
        onSubmit={async (data) => {
          const name = String(data.get("name") ?? "").trim();
          if (!name) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { name: "Ponle un nombre a la bodega." } };
          const r = await createWarehouseAction(slug, { name, code: String(data.get("code") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Nombre" required error={fieldErrors.name}>
              {(c) => <input {...c} name="name" autoComplete="off" className={inputClasses} placeholder="Sede Norte" />}
            </Field>
            <Field label="Código" optional>
              {(c) => <input {...c} name="code" autoComplete="off" maxLength={20} className={inputClasses} placeholder="NOR" />}
            </Field>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
