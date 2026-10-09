"use client";

import { useEffect, useActionState, useRef } from "react";
import { X } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerFormState,
} from "../actions";
import { useVerticalTerms } from "../../vertical-terms-context";

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

  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Cierra cuando el servidor confirma la escritura.
  useEffect(() => {
    if (state.status === "ok") {
      onClose();
    }
  }, [state, onClose]);

  // Escape + scroll bloqueado mientras el modal está abierto.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, isPending]);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-ink/45 backdrop-blur-xs"
        onClick={() => !isPending && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-form-title"
        className="relative mt-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-popover sm:mt-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="customer-form-title"
              className="text-lg font-semibold text-foreground"
            >
              {mode === "create"
                ? `Nuevo ${terms.customer.toLowerCase()}`
                : `Editar ${terms.customer.toLowerCase()}`}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {mode === "create"
                ? `Registra los datos de contacto del ${terms.customer.toLowerCase()}.`
                : `Actualiza los datos del ${terms.customer.toLowerCase()}.`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={isPending}
            onClick={onClose}
            className="-m-1 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4" noValidate>
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
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>
    </div>
  );
}
