"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClasses } from "@/components/atoms/input";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { SettingsRow, SettingsSection } from "@/components/molecules/settings-section";
import { PhoneInput } from "@/components/molecules/phone-input";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { updateTenantProfileAction, type ProfileFormState } from "@/app/[tenant]/(app)/settings/actions";
import type { VerticalValue } from "@/lib/admin/catalogs";
import type { BusinessModel } from "@/lib/tenant/business-context";
import BusinessContextCard from "./business-context-card";
import type { ProfileInitialValues, SystemInfoItem } from "./settings-shell";

const IDLE: ProfileFormState = { status: "idle" };
type Group = "identity" | "contact" | "tax";

/**
 * Pestaña «Perfil del negocio»: los datos se leen como información, no como
 * un formulario abierto. «Modificar» abre un diálogo con solo el grupo que se
 * edita; al guardar se valida en el servidor, se conserva lo escrito si falla
 * y la vista se actualiza con lo que el servidor confirmó. Un cambio de
 * dirección web advierte que cambia el enlace del panel.
 */
export default function ProfileTab({
  tenantSlug,
  canManage,
  initialValues,
  systemInfo,
  context,
}: {
  tenantSlug: string;
  canManage: boolean;
  initialValues: ProfileInitialValues;
  systemInfo: SystemInfoItem[];
  context: { vertical: VerticalValue; businessModels: BusinessModel[]; activity: string };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<ProfileInitialValues>(initialValues);
  const [editing, setEditing] = useState<Group | null>(null);
  const [slugDraft, setSlugDraft] = useState(values.slug);
  const [phoneDraft, setPhoneDraft] = useState(values.phone);

  const open = (g: Group) => {
    setSlugDraft(values.slug);
    setPhoneDraft(values.phone);
    setEditing(g);
  };

  /** Envía todo el perfil con el grupo editado encima: la acción valida el conjunto. */
  const save = async (data: FormData, fields: (keyof ProfileInitialValues)[]) => {
    const next = { ...values };
    for (const f of fields) next[f] = String(data.get(f) ?? "").trim();
    const form = new FormData();
    form.set("tenantSlug", tenantSlug);
    for (const [k, v] of Object.entries(next)) form.set(k, v);
    const result = await updateTenantProfileAction(IDLE, form);
    if (result.status !== "ok") return { ok: false as const, message: result.message, fieldErrors: result.errors as Record<string, string | undefined> | undefined };
    setValues(next);
    return { ok: true as const, message: result.message ?? "Perfil actualizado correctamente.", slug: next.slug };
  };
  const after = (message?: string) => {
    if (message) toast(message, "success");
    if (values.slug && values.slug !== tenantSlug) router.replace(`/${values.slug}/settings`);
    else router.refresh();
  };

  return (
    <div className="space-y-4">
      {!canManage ? <Alert tone="info">Solo el dueño del negocio puede modificar esta información.</Alert> : null}

      <SettingsSection id="profile-identity" title="Identidad" description="Cómo se llama tu negocio y cuál es la dirección de tu panel." canManage={canManage} onEdit={() => open("identity")}>
        <SettingsRow label="Nombre comercial" value={values.name} />
        <SettingsRow label="Dirección del panel" value={<span className="font-mono text-[13px]">/{values.slug}</span>} />
      </SettingsSection>

      <SettingsSection id="profile-contact" title="Contacto y ubicación" description="Dónde y cómo te encuentran tus clientes." canManage={canManage} onEdit={() => open("contact")}>
        <SettingsRow label="Ciudad" value={values.city} />
        <SettingsRow label="Dirección" value={values.address} />
        <SettingsRow label="Teléfono / WhatsApp" value={values.phone} />
      </SettingsSection>

      <SettingsSection id="profile-tax" title="Datos fiscales" description="Para tus documentos y facturas." canManage={canManage} onEdit={() => open("tax")}>
        <SettingsRow label="NIT / RUT" value={values.taxId} />
      </SettingsSection>

      <BusinessContextCard slug={tenantSlug} canManage={canManage} initial={context} />

      <section aria-labelledby="profile-system" className="rounded-lg border border-border bg-card px-5 py-4">
        <h2 id="profile-system" className="font-display text-[15px] font-semibold text-foreground">Información del sistema</h2>
        <dl className="mt-2 divide-y divide-border">
          {systemInfo.map((item) => (
            <SettingsRow key={item.label} label={item.label} value={item.value} />
          ))}
        </dl>
      </section>

      <FormDialog
        open={editing === "identity"}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Modificar identidad"
        description="El nombre aparece en tus documentos y en el panel."
        submitLabel="Guardar cambios"
        pendingLabel="Guardando…"
        onSubmit={(d) => save(d, ["name", "slug"])}
        onSuccess={({ message }) => after(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Nombre comercial" required error={fieldErrors.name}>
              {(c) => <input {...c} name="name" defaultValue={values.name} autoComplete="organization" className={inputClasses} placeholder="Mi negocio" />}
            </Field>
            <Field label="Dirección del panel" required error={fieldErrors.slug} hint="Solo minúsculas, números y guiones.">
              {(c) => <input {...c} name="slug" defaultValue={values.slug} onChange={(e) => setSlugDraft(e.target.value.toLowerCase())} autoComplete="off" className={inputClasses} placeholder="mi-negocio" />}
            </Field>
            {slugDraft.trim().toLowerCase() !== values.slug ? <Alert tone="warning">Cambiar la dirección cambia el enlace de tu panel: los marcadores y enlaces guardados con la dirección anterior dejarán de funcionar.</Alert> : null}
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={editing === "contact"}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Modificar contacto y ubicación"
        submitLabel="Guardar cambios"
        pendingLabel="Guardando…"
        onSubmit={(d) => {
          d.set("phone", phoneDraft);
          return save(d, ["city", "address", "phone"]);
        }}
        onSuccess={({ message }) => after(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Ciudad" optional error={fieldErrors.city}>{(c) => <input {...c} name="city" defaultValue={values.city} autoComplete="address-level2" className={inputClasses} placeholder="Bogotá" />}</Field>
            <Field label="Dirección" optional error={fieldErrors.address}>{(c) => <input {...c} name="address" defaultValue={values.address} autoComplete="street-address" className={inputClasses} placeholder="Calle y número" />}</Field>
            <Field label="Teléfono / WhatsApp" optional error={fieldErrors.phone}>{(c) => <PhoneInput id={c.id} value={phoneDraft} onChange={setPhoneDraft} />}</Field>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={editing === "tax"}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Modificar datos fiscales"
        submitLabel="Guardar cambios"
        pendingLabel="Guardando…"
        onSubmit={(d) => save(d, ["taxId"])}
        onSuccess={({ message }) => after(message)}
      >
        {({ fieldErrors }) => (
          <Field label="NIT / RUT" optional error={fieldErrors.taxId}>{(c) => <input {...c} name="taxId" defaultValue={values.taxId} autoComplete="off" className={inputClasses} placeholder="900123456-7" />}</Field>
        )}
      </FormDialog>
    </div>
  );
}
