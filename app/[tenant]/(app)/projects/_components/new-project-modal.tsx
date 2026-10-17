"use client";

import { useEffect, useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import Modal from "@/components/organisms/modal";
import { createProjectAction, type CreateProjectFormState } from "../actions";
import { buttonVariants } from "@/components/atoms/button-variants";
import { fieldClasses, labelClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

const IDLE_STATE: CreateProjectFormState = { status: "idle" };

const FIELD_CLASS = (hasError: boolean) =>
  [
    "h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
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
        className={buttonVariants()}
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
              className={buttonVariants({ variant: "outline" })}
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
                className={labelClasses}
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
                className={labelClasses}
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
                className={labelClasses}
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
                className={cn(fieldClasses, "py-2")}
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
                className="rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
              >
                {state.message}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setOpen(false)}
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
                {isPending ? "Creando…" : "Crear proyecto"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}