"use client";

import { useEffect, useActionState } from "react";

import { NLoader } from "@/components/atoms/n-loader";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerFormState,
} from "../actions";
import { useVerticalTerms } from "../../vertical-terms-context";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";

type CustomerToEdit = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

const IDLE_STATE: CustomerFormState = { status: "idle" };

/**
 * Modal de creación/edición. El estado lo maneja el Server Action vía
 * `useActionState`; al confirmar cierra y la tabla se refresca por
 * `revalidatePath`.
 */
export default function CustomerForm({
  tenantSlug,
  mode,
  customer,
  onClose,
}: {
  tenantSlug: string;
  mode: "create" | "edit";
  customer?: CustomerToEdit;
  onClose: () => void;
}) {
  const action = mode === "create" ? createCustomerAction : updateCustomerAction;
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE);
  const terms = useVerticalTerms();

  // Cierra cuando el servidor confirma la escritura.
  useEffect(() => {
    if (state.status === "ok") {
      onClose();
    }
  }, [state, onClose]);

  const errors = state.errors ?? {};
  // Los valores del servidor son el respaldo si React remonta el formulario.
  const nameValue = state.values?.name ?? customer?.name ?? "";
  const emailValue = state.values?.email ?? customer?.email ?? "";
  const phoneValue = state.values?.phone ?? customer?.phone ?? "";

  const fieldClass = (hasError: boolean) =>
    [
      "mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
      hasError
        ? "border-destructive/30 focus:border-destructive focus:outline-destructive/30"
        : "border-border hover:border-foreground/20 focus:border-gold-500 focus:outline-gold-600/30",
    ].join(" ");

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => { if (!open && !isPending) onClose(); }}
      title={<>{mode === "create" ? `Nuevo ${terms.customer.toLowerCase()}` : `Editar ${terms.customer.toLowerCase()}`}</>}
      description={<>{mode === "create" ? `Registra los datos de contacto del ${terms.customer.toLowerCase()}.` : `Actualiza los datos del ${terms.customer.toLowerCase()}.`}</>}
    >
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {mode === "edit" ? (
            <input type="hidden" name="customerId" value={customer?.id ?? ""} />
          ) : null}

          <div>
            <label
              htmlFor="customer-name"
              className="text-sm font-medium text-foreground/80"
            >
              Nombre <span className="text-destructive">*</span>
            </label>
            <input
              id="customer-name"
              name="name"
              defaultValue={nameValue}
              autoComplete="name"
              autoFocus
              aria-invalid={Boolean(errors.name)}
              placeholder="Ej. María Pérez"
              className={fieldClass(Boolean(errors.name))}
            />
            {errors.name ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="customer-email"
              className="text-sm font-medium text-foreground/80"
            >
              Correo
            </label>
            <input
              id="customer-email"
              name="email"
              type="email"
              defaultValue={emailValue}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              placeholder="maria@correo.com"
              className={fieldClass(Boolean(errors.email))}
            />
            {errors.email ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="customer-phone"
              className="text-sm font-medium text-foreground/80"
            >
              Teléfono
            </label>
            <input
              id="customer-phone"
              name="phone"
              type="tel"
              defaultValue={phoneValue}
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
              placeholder="+57 300 123 4567"
              className={fieldClass(Boolean(errors.phone))}
            />
            {errors.phone ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.phone}
              </p>
            ) : null}
          </div>

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={buttonVariants()}
            >
              {isPending ? (
                <NLoader size={16} className="text-current" />
              ) : null}
              {isPending
                ? "Guardando…"
                : mode === "create"
                  ? `Crear ${terms.customer.toLowerCase()}`
                  : "Guardar cambios"}
            </button>
          </div>
        </form>
      
    </ResponsiveSheet>
  );
}
