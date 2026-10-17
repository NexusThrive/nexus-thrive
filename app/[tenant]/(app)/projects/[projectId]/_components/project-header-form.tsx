"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import type { ProjectHeaderData } from "@/lib/tenant-db";
import { PROJECT_TYPE_OPTIONS } from "@/lib/projects";
import {
  updateProjectHeaderAction,
  type ProjectHeaderFormState,
} from "../../actions";
import type { ProjectHeaderFormValues } from "../../validators";
import { buttonVariants } from "@/components/atoms/button-variants";
import { fieldClasses, labelClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

const IDLE_STATE: ProjectHeaderFormState = { status: "idle" };

const FIELD_CLASS = (hasError: boolean) =>
  [
    "h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
    hasError
      ? "border-destructive/30 focus:border-destructive focus:outline-destructive/30"
      : "border-border hover:border-foreground/20 focus:border-gold-500 focus:outline-gold-600/30",
  ].join(" ");

function Field({
  id,
  label,
  name,
  value,
  error,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={labelClasses}
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={FIELD_CLASS(Boolean(error))}
      />
      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/**
 * Ficha del proyecto (tab 1): datos fiscales/contractuales del cliente,
 * ubicación de obra y responsables. Snapshot editable; el maestro del
 * cliente sigue siendo el CRM.
 */
export default function ProjectHeaderForm({
  tenantSlug,
  projectId,
  header,
}: {
  tenantSlug: string;
  projectId: string;
  header: ProjectHeaderData | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateProjectHeaderAction,
    IDLE_STATE,
  );
  const errors = state.errors ?? {};

  const val = (key: keyof ProjectHeaderFormValues): string =>
    state.values?.[key] ?? header?.[key] ?? "";

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-lg border border-border bg-card p-5"
      noValidate
    >
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="projectId" value={projectId} />

      <Section
        title="A · Cliente (contractual y tributario)"
        description="Datos fiscales del cliente para contratos y facturación. Se prellenan desde el CRM y quedan como snapshot de esta obra."
      >
        <Field
          id="header-clientTaxName"
          label="Razón social / nombre fiscal"
          name="clientTaxName"
          value={val("clientTaxName")}
          error={errors.clientTaxName}
          placeholder="Ej. Constructora Andina S.A.S."
        />
        <Field
          id="header-legalRepName"
          label="Representante legal"
          name="legalRepName"
          value={val("legalRepName")}
          error={errors.legalRepName}
        />
        <Field
          id="header-clientTaxId"
          label="NIT / RUT"
          name="clientTaxId"
          value={val("clientTaxId")}
          error={errors.clientTaxId}
        />
        <Field
          id="header-clientTaxDv"
          label="Dígito de verificación (DV)"
          name="clientTaxDv"
          value={val("clientTaxDv")}
          error={errors.clientTaxDv}
        />
        <Field
          id="header-clientAddress"
          label="Dirección del cliente"
          name="clientAddress"
          value={val("clientAddress")}
          error={errors.clientAddress}
        />
        <Field
          id="header-clientCity"
          label="Ciudad del cliente"
          name="clientCity"
          value={val("clientCity")}
          error={errors.clientCity}
        />
        <Field
          id="header-clientBillingEmail"
          label="Correo de facturación"
          name="clientBillingEmail"
          type="email"
          value={val("clientBillingEmail")}
          error={errors.clientBillingEmail}
          placeholder="facturacion@cliente.com"
        />
      </Section>

      <Section
        title="B · Obra"
        description="Ubicación y tipo de intervención. Las notas de acceso ayudan al equipo en campo."
      >
        <div>
          <label
            htmlFor="header-projectType"
            className={labelClasses}
          >
            Tipo de obra
          </label>
          <select
            id="header-projectType"
            name="projectType"
            defaultValue={val("projectType")}
            aria-invalid={Boolean(errors.projectType)}
            className={FIELD_CLASS(Boolean(errors.projectType))}
          >
            <option value="">Selecciona…</option>
            {PROJECT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.projectType ? (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.projectType}
            </p>
          ) : null}
        </div>
        <Field
          id="header-siteCity"
          label="Ciudad de la obra"
          name="siteCity"
          value={val("siteCity")}
          error={errors.siteCity}
        />
        <Field
          id="header-siteAddress"
          label="Dirección de la obra"
          name="siteAddress"
          value={val("siteAddress")}
          error={errors.siteAddress}
        />
        <Field
          id="header-siteDepartment"
          label="Departamento"
          name="siteDepartment"
          value={val("siteDepartment")}
          error={errors.siteDepartment}
        />
        <div className="sm:col-span-2">
          <label
            htmlFor="header-siteAccessNotes"
            className={labelClasses}
          >
            Notas de acceso
          </label>
          <textarea
            id="header-siteAccessNotes"
            name="siteAccessNotes"
            rows={3}
            defaultValue={val("siteAccessNotes")}
            aria-invalid={Boolean(errors.siteAccessNotes)}
            placeholder="Horarios, permisos, restricciones del sitio…"
            className={cn(fieldClasses, "py-2")}
          />
          {errors.siteAccessNotes ? (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.siteAccessNotes}
            </p>
          ) : null}
        </div>
      </Section>

      <Section
        title="C · Responsables"
        description="Contacto técnico, dirección de obra e interventoría."
      >
        <Field
          id="header-technicalContact"
          label="Contacto técnico"
          name="technicalContact"
          value={val("technicalContact")}
          error={errors.technicalContact}
        />
        <Field
          id="header-technicalPhone"
          label="Teléfono técnico"
          name="technicalPhone"
          type="tel"
          value={val("technicalPhone")}
          error={errors.technicalPhone}
        />
        <Field
          id="header-projectLeaderName"
          label="Director de obra"
          name="projectLeaderName"
          value={val("projectLeaderName")}
          error={errors.projectLeaderName}
        />
        <Field
          id="header-projectLeaderProfessionalId"
          label="Matrícula profesional"
          name="projectLeaderProfessionalId"
          value={val("projectLeaderProfessionalId")}
          error={errors.projectLeaderProfessionalId}
        />
        <Field
          id="header-supervisorName"
          label="Interventor / supervisor"
          name="supervisorName"
          value={val("supervisorName")}
          error={errors.supervisorName}
        />
      </Section>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === "ok" && state.message ? (
        <p
          role="status"
          className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="submit"
          disabled={isPending}
          className={buttonVariants()}
        >
          {isPending ? (
            <NLoader size={16} className="text-current" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {isPending ? "Guardando…" : "Guardar ficha"}
        </button>
      </div>
    </form>
  );
}