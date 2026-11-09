"use client";

import { useState } from "react";
import { Input } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Field } from "@/components/molecules/field";
import { FormDialog } from "@/components/organisms/form-sheet";
import { RULE_OPS, type RuleOp, type SearchRule, type SearchSchema } from "@/lib/foundation/list-search";

/**
 * «Filtro personalizado…»: arma una regla con campo, operador y valor. Si el campo tiene valores conocidos (ciudades,
 * grupos, responsables…) se elige de una lista; si no, se escribe. Se pueden sumar varias reglas, una a la vez.
 */
export function RuleDialog({
  open,
  onOpenChange,
  fields,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: SearchSchema["ruleFields"];
  onAdd: (rule: SearchRule) => void;
}) {
  const [field, setField] = useState(fields[0]?.id ?? "");
  const [op, setOp] = useState<RuleOp>("is");
  const [value, setValue] = useState("");
  const def = fields.find((f) => f.id === field);
  const needsValue = RULE_OPS.find((o) => o.id === op)?.needsValue ?? true;
  const kind = def?.kind ?? "text";
  const ops = RULE_OPS.filter((o) => {
    if (kind === "text") return o.id !== "gte" && o.id !== "lte" && !(def?.values && o.id === "contains");
    return o.id !== "contains" && o.id !== "not";
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Filtro personalizado"
      description="Muestra solo los registros que cumplen la regla. Puedes sumar varias."
      submitLabel="Agregar filtro"
      onSubmit={() => {
        if (needsValue && !value.trim()) return { ok: false, message: "Escribe o elige el valor.", fieldErrors: { valor: "Falta el valor." } };
        onAdd({ field, op, value: needsValue ? value.trim() : "" });
        setValue("");
        return { ok: true };
      }}
    >
      {({ fieldErrors }) => (
        <>
          <Field label="Campo">
            {(c) => (
              <Select {...c} value={field} onChange={(e) => { setField(e.target.value); setValue(""); setOp("is"); }}>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Condición">
            {(c) => (
              <Select {...c} value={op} onChange={(e) => setOp(e.target.value as RuleOp)}>
                {ops.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </Select>
            )}
          </Field>
          {needsValue ? (
            <Field label="Valor" error={fieldErrors.valor}>
              {(c) =>
                def?.values && def.values.length > 0 ? (
                  <Select {...c} name="valor" value={value} placeholder="Elige un valor" onChange={(e) => setValue(e.target.value)}>
                    {def.values.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </Select>
                ) : (
                  <Input {...c} name="valor" type={kind === "number" ? "number" : kind === "date" ? "date" : "text"} inputMode={kind === "number" ? "decimal" : undefined} value={value} maxLength={120} onChange={(e) => setValue(e.target.value)} />
                )
              }
            </Field>
          ) : null}
        </>
      )}
    </FormDialog>
  );
}

/** Renombrar un favorito. */
export function RenameFavoriteDialog({
  favorite,
  onOpenChange,
  onRename,
}: {
  favorite: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [seen, setSeen] = useState<string | null>(null);
  if (favorite && seen !== favorite.id) {
    setSeen(favorite.id);
    setName(favorite.name);
  }
  return (
    <FormDialog
      open={favorite !== null}
      onOpenChange={onOpenChange}
      title="Renombrar favorito"
      submitLabel="Guardar"
      submitDisabled={!name.trim()}
      onSubmit={async () => {
        if (!favorite) return;
        const ok = await onRename(favorite.id, name);
        if (!ok) return { ok: false, message: "No se pudo cambiar el nombre." };
        setSeen(null);
        return { ok: true };
      }}
    >
      <Field label="Nombre">
        {(c) => <Input {...c} name="nombre" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}
      </Field>
    </FormDialog>
  );
}
