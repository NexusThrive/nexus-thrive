"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { Field } from "@/components/molecules/field";
import { MoneyInput } from "@/components/molecules/money-input";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { formatCurrency } from "@/lib/foundation/format";
import { saveMembershipTypeAction } from "../actions";

export type MembershipTypeRow = {
  id: string;
  name: string;
  price: number;
  durationDays: number | null;
  active: boolean;
};

type Draft = { name: string; price: number | null; durationDays: number | null; active: boolean };

/**
 * Tipos de membresía del gimnasio: nombre, precio y duración. Son los planes
 * del catálogo (`Product` kind PLAN); el socio se inscribe desde su ficha, no
 * desde aquí. Solo administración los crea o edita.
 */
export default function MembershipTypes({
  tenantSlug,
  types,
  canEdit,
}: {
  tenantSlug: string;
  types: MembershipTypeRow[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<MembershipTypeRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <section aria-labelledby="membership-types-title" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="membership-types-title" className="text-base font-semibold text-foreground">
            Tipos de membresía
          </h2>
          <p className="text-sm text-muted-foreground">
            Define el nombre, el precio y la duración. Luego se asigna desde la ficha del cliente.
          </p>
        </div>
        {canEdit ? (
          <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ variant: "accent", className: "w-full sm:w-auto" })}>
            <Plus aria-hidden="true" className="size-4" />
            Nuevo tipo
          </button>
        ) : null}
      </div>

      {types.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          Aún no hay tipos de membresía. {canEdit ? "Crea el primero para empezar a inscribir socios." : "Pídele a administración que cree el primero."}
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => (
            <li key={type.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <span className="truncate">{type.name}</span>
                  {!type.active ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-semibold uppercase text-muted-foreground">Oculto</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatCurrency(type.price)} · {type.durationDays ? `${type.durationDays} días` : "Sin duración"}
                </p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => setEditing(type)}
                  aria-label={`Editar ${type.name}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}
                >
                  <Pencil aria-hidden="true" className="size-3.5" />
                  Editar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {creating || editing ? (
        <MembershipTypeSheet
          tenantSlug={tenantSlug}
          type={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      ) : null}
    </section>
  );
}

function MembershipTypeSheet({ tenantSlug, type, onClose }: { tenantSlug: string; type: MembershipTypeRow | null; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => ({
    name: type?.name ?? "",
    price: type?.price ?? null,
    durationDays: type?.durationDays ?? 30,
    active: type?.active ?? true,
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const save = () =>
    start(async () => {
      const result = await saveMembershipTypeAction(tenantSlug, type?.id ?? null, {
        name: draft.name,
        price: draft.price,
        durationDays: draft.durationDays,
        active: draft.active,
      });
      if (result.ok) {
        toast(result.message ?? "Guardado", "success");
        router.refresh();
        onClose();
      } else {
        setErrors(result.errors ?? {});
        toast({ title: "No se guardó", description: result.message, variant: "error" });
      }
    });

  return (
    <ResponsiveSheet
      drawer
      open
      onOpenChange={(open) => !open && onClose()}
      title={type ? `Editar · ${type.name}` : "Nuevo tipo de membresía"}
      description="Nombre, precio y duración del plan. La vigencia se calcula al inscribir al socio."
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={save} className={buttonVariants()}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre" required error={errors.name} className="sm:col-span-2">
          {(c) => <input {...c} autoFocus value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputClasses} placeholder="Ej. Mensual, Trimestral, Anual" />}
        </Field>
        <Field label="Precio" required error={errors.price}>
          {(c) => <MoneyInput id={c.id} value={draft.price} onValueChange={(value) => set("price", value)} />}
        </Field>
        <Field label="Duración (días)" required error={errors.durationDays} hint="30 = mensual, 90 = trimestral, 365 = anual.">
          {(c) => (
            <input
              {...c}
              inputMode="numeric"
              value={draft.durationDays ?? ""}
              onChange={(e) => set("durationDays", e.target.value.trim() === "" ? null : Number(e.target.value))}
              className={inputClasses}
            />
          )}
        </Field>
        <label htmlFor="membership-type-active" className="flex items-center justify-between gap-3 rounded-md bg-surface-muted p-3 sm:col-span-2">
          <span>
            <b className="block text-ui font-medium">Disponible</b>
            <small className="text-xs text-muted-foreground">Si lo apagas, no se puede asignar a socios nuevos.</small>
          </span>
          <Switch id="membership-type-active" checked={draft.active} onCheckedChange={(value) => set("active", value)} />
        </label>
        {type ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
            <Check aria-hidden="true" className="size-3.5 text-success" />
            Los socios que ya lo tienen conservan su vigencia.
          </p>
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
