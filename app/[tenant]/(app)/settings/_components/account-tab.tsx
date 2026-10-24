"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { PhoneInput } from "@/components/molecules/phone-input";
import { SettingsRow, SettingsSection } from "@/components/molecules/settings-section";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { updateMyProfileAction } from "@/app/[tenant]/(app)/settings/team-actions";

export type MyAccount = { name: string; email: string; roleLabel: string; title: string; phone: string };

/**
 * «Mi cuenta»: tus datos personales en ese negocio. Se leen como información; «Modificar» abre un diálogo con
 * Guardar y Cancelar, y la acción valida en el servidor. Es tuyo: no depende del permiso de administrar el negocio.
 */
export default function AccountTab({ slug, me }: { slug: string; me: MyAccount }) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState(me);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(me.phone);
  return (
    <div className="space-y-4">
      <SettingsSection id="account-me" title="Tus datos" description="Así te saluda el Inicio y así te ve tu equipo." canManage onEdit={() => { setPhone(values.phone); setEditing(true); }}>
        <SettingsRow label="Nombre" value={values.name} />
        <SettingsRow label="Cargo" value={values.title} />
        <SettingsRow label="Teléfono" value={values.phone} />
        <SettingsRow label="Correo" value={values.email} />
        <SettingsRow label="Rol en este negocio" value={values.roleLabel} />
      </SettingsSection>
      <FormDialog
        open={editing}
        onOpenChange={setEditing}
        title="Modificar tus datos"
        description="El correo y el rol los administra el dueño del negocio."
        submitLabel="Guardar cambios"
        pendingLabel="Guardando…"
        onSubmit={async (d) => {
          const next = { name: String(d.get("name") ?? "").trim(), title: String(d.get("title") ?? "").trim(), phone: phone.trim() };
          const r = await updateMyProfileAction(slug, next);
          if (!r.ok) return { ok: false as const, message: r.message, fieldErrors: { name: r.message } };
          setValues((v) => ({ ...v, ...next }));
          return { ok: true as const, message: r.message };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Nombre" required error={fieldErrors.name}>{(c) => <input {...c} name="name" defaultValue={values.name} autoComplete="name" className={inputClasses} />}</Field>
            <Field label="Cargo" optional>{(c) => <input {...c} name="title" defaultValue={values.title} className={inputClasses} placeholder="Administradora" />}</Field>
            <Field label="Teléfono" optional>{(c) => <PhoneInput id={c.id} value={phone} onChange={setPhone} />}</Field>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
