"use client";

import { useEffect, useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import Modal from "@/components/construction/modal";
import { createProjectAction, type CreateProjectFormState } from "../actions";

const IDLE_STATE: CreateProjectFormState = { status: "idle" };

const FIELD_CLASS = (hasError: boolean) =>
  [
    "mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
    hasError
      ? "border-destructive/30 focus:border-destructive focus:outline-destructive/30"
      : "border-border hover:border-foreground/20 focus:border-gold-500 focus:outline-gold-600/30",
  ].join(" ");

/**
 * Botón + modal de creación de proyecto. El estado lo maneja el Server
 * Action vía `useActionState`; al confirmar navega al detalle recién creado
 * (el código correlativo lo asigna el servidor).
 */
export default function NewProjectModal({
  tenantSlug,
  customers,
}: {
  tenantSlug: string;
  customers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createProjectAction,
    IDLE_STATE,
  );
  const router = useRouter();

  // Al crear con éxito, abre el contenedor del proyecto.
  useEffect(() => {
    if (state.status === "ok" && state.projectId) {
      router.push(`/${tenantSlug}/projects/${state.projectId}`);
    }
  }, [state, router, tenantSlug]);

  const errors = state.errors ?? {};

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Nuevo proyecto
      </button>

      <Modal
        open={open}
        onClose={() => {
          if (!isPending) {
            setOpen(false);
          }
        }}
        title="Nuevo proyecto de obra"
      >
        {customers.length === 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Necesitas al menos un cliente en el CRM para crear un proyecto.
            </p>
            <Link
              href={`/${tenantSlug}/crm`}
              className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground/80 transition hover:bg-muted"
            >
              Ir al CRM
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4" noValidate>
            <input type="hidden" name="tenantSlug" value={tenantSlug} />

            <div>
              <label
                htmlFor="project-customer"
                className="text-sm font-medium text-foreground/80"
              >
                Cliente <span className="text-destructive">*</span>
              </label>
              <select
                id="project-customer"
                name="customerId"
                defaultValue={state.values?.customerId ?? ""}
                aria-invalid={Boolean(errors.customerId)}
                className={FIELD_CLASS(Boolean(errors.customerId))}
              >
                <option value="">Selecciona el cliente…</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customerId ? (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors.customerId}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="project-name"
                className="text-sm font-medium text-foreground/80"
              >
                Nombre del proyecto <span className="text-destructive">*</span>
              </label>
              <input
                id="project-name"
                name="name"
                defaultValue={state.values?.name ?? ""}
                placeholder="Ej. Torre Norte — Etapa 2"
                aria-invalid={Boolean(errors.name)}
                className={FIELD_CLASS(Boolean(errors.name))}
              />
              {errors.name ? (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="project-description"
                className="text-sm font-medium text-foreground/80"
              >
                Descripción
              </label>
              <textarea
                id="project-description"
                name="description"
                rows={3}
                defaultValue={state.values?.description ?? ""}
                placeholder="Alcance general de la obra (opcional)."
                aria-invalid={Boolean(errors.description)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-foreground/20 focus:border-gold-500 focus:outline-2 focus:outline-gold-600/30"
              />
              {errors.description ? (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors.description}
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
                onClick={() => setOpen(false)}
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
                {isPending ? "Creando…" : "Crear proyecto"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}