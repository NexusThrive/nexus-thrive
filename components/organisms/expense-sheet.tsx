"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { NMark } from "@/components/atoms/n-mark";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { burstFrom, shake } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ExpenseSaveInput = { amount: number; category: string; description: string };
export type ExpenseSaveResult = { ok: true } | { ok: false; message: string; field?: "amount" | "description" | "category" };

/**
 * Registrar gasto de caja menor (como el artefacto): valor grande con miles
 * en vivo, categoría en chips y nota. Si falta un dato, el campo se sacude
 * y explica cómo corregirlo; al guardar, la N se rellena en el botón.
 */
export function ExpenseSheet({
  open,
  onOpenChange,
  categories,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: readonly string[];
  onSave: (input: ExpenseSaveInput) => Promise<ExpenseSaveResult>;
}) {
  const [raw, setRaw] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [errors, setErrors] = useState<{ amount?: string; description?: string; form?: string }>({});
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const amount = Number(raw.replace(/\D/g, "")) || 0;

  const reset = () => {
    setRaw("");
    setCategory(categories[0] ?? "");
    setDescription("");
    setState("idle");
    setErrors({});
  };

  const close = (next: boolean) => {
    if (state === "busy") return;
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 300);
  };

  const save = async () => {
    const next: typeof errors = {};
    if (!amount) next.amount = "Escribe un valor mayor que cero.";
    if (description.trim().length < 2) next.description = "Describe brevemente el gasto (mínimo 2 letras).";
    setErrors(next);
    if (next.amount || next.description) {
      const bad = next.amount ? amountRef.current : descriptionRef.current;
      bad?.focus();
      shake(bad);
      return;
    }
    setState("busy");
    const result = await onSave({ amount, category, description: description.trim() });
    if (!result.ok) {
      setState("idle");
      setErrors(result.field === "amount" || result.field === "description" ? { [result.field]: result.message } : { form: result.message });
      return;
    }
    setState("done");
    burstFrom(saveRef.current, 14);
    window.setTimeout(() => close(false), 900);
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={close}
      title="Registrar gasto"
      description="Se descuenta de la caja menor."
      footer={
        <>
          <button type="button" onClick={() => close(false)} disabled={state !== "idle"} className={cn(buttonVariants({ variant: "outline" }), "flex-1 sm:flex-none")}>
            Cancelar
          </button>
          <button
            ref={saveRef}
            type="button"
            onClick={save}
            disabled={state !== "idle"}
            className={cn(buttonVariants(), "min-w-44 flex-1 sm:flex-none")}
          >
            {state === "idle" ? <Check aria-hidden="true" className="size-4" /> : <NMark size={16} state={state === "done" ? "done" : "loop"} className="text-current" />}
            {state === "busy" ? "Guardando…" : state === "done" ? "Registrado" : "Registrar gasto"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <Field label="Valor" required error={errors.amount}>
          {(control) => (
            <div className="relative">
              <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                {...control}
                ref={amountRef}
                autoFocus
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={raw}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, "").slice(0, 9);
                  setRaw(digits ? Number(digits).toLocaleString("es-CO") : "");
                }}
                className={cn(inputClasses, "pl-7 font-display text-lg font-semibold tabular-nums")}
              />
            </div>
          )}
        </Field>
        <div>
          <p className="mb-2 text-[13px] font-medium">Categoría</p>
          <ChipRow role="group" aria-label="Categoría" className="flex-wrap">
            {categories.map((c) => (
              <Chip key={c} selected={c === category} onClick={() => setCategory(c)}>
                {c}
              </Chip>
            ))}
          </ChipRow>
        </div>
        <Field label="Nota" required error={errors.description}>
          {(control) => (
            <textarea
              {...control}
              ref={descriptionRef}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              placeholder="Ej. Compra de cuchillas y toallas"
              className={textareaClasses}
            />
          )}
        </Field>
        {errors.form ? <Alert tone="danger">{errors.form}</Alert> : null}
      </div>
    </ResponsiveSheet>
  );
}
