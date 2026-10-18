"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { bmi, profileFor } from "@/lib/business/customer-fields";
import { useMinute } from "@/lib/use-minute";
import CustomerSheet from "../../_components/customer-sheet";

type Data = { vertical: string; profile: Record<string, string | number>; documentId: string | null; birthDate: string | null; city: string | null; tags: string[] };

/** Datos propios del rubro (gym: medidas, IMC, objetivo, salud…) y botón para editar la ficha. */
export default function VerticalProfileCard({ tenantSlug, customerId, data }: { tenantSlug: string; customerId: string; data: Data }) {
  const [editing, setEditing] = useState(false);
  const def = profileFor(data.vertical);
  const b = bmi(Number(data.profile.weightKg) || undefined, Number(data.profile.heightCm) || undefined);
  const now = useMinute();
  const age = data.birthDate ? Math.floor((now - Date.parse(`${data.birthDate}T12:00:00Z`)) / (365.25 * 86_400_000)) : null;
  const base: [string, string][] = [
    [def.documentLabel, data.documentId ?? ""],
    ["Edad", age != null ? `${age} años` : ""],
    ["Ciudad", data.city ?? ""],
  ];
  const rows: [string, string][] = [
    ...base,
    ...def.fields.map((f): [string, string] => [f.label, data.profile[f.key] != null ? `${data.profile[f.key]}${f.type === "number" ? ` ${f.unit}` : ""}` : ""]),
   ].filter(([, v]) => v);

  return (
    <section className="rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border px-[18px] py-3">
        <h2 className="font-display text-[15px] font-semibold">{def.fields.length ? def.title : "Datos del cliente"}</h2>
        <button type="button" onClick={() => setEditing(true)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Pencil aria-hidden="true" className="size-3.5" /> Editar ficha
        </button>
      </header>
      <div className="grid gap-3 p-[18px]">
        {b ? (
          <div className="flex items-baseline gap-3 rounded-md bg-surface-muted px-3 py-2.5">
            <span className="font-display text-2xl font-bold tabular-nums">{b.value.toLocaleString("es-CO")}</span>
            <span className="text-[13px] text-muted-foreground">IMC · {b.label}</span>
          </div>
        ) : null}
        {rows.length ? (
          <dl className="grid gap-2 text-[13.5px] sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k} className="grid gap-0.5">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="whitespace-pre-wrap font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[13px] text-muted-foreground">Sin datos adicionales. Completa la ficha para conocer mejor a tu cliente.</p>
        )}
        {data.tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((t) => (
              <span key={t} className="rounded-sm bg-surface-muted px-2 py-0.5 text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {editing ? <CustomerSheet tenantSlug={tenantSlug} customerId={customerId} onClose={() => setEditing(false)} /> : null}
    </section>
  );
}
