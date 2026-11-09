"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { FullPanelLink } from "@/components/molecules/full-panel-link";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { useVerticalTerms } from "../../vertical-terms-context";
import { saveCustomerAction } from "@/app/[tenant]/(app)/contactos/profile-actions";

/**
 * Alta rápida de un cliente: solo lo que hace falta para empezar (nombre, WhatsApp y correo). Lo demás se completa en su ficha.
 * Es un modal distinto de la ficha completa a propósito: cada tipo de alta tiene su propio formulario, no uno que sirva para todo.
 */
export default function CustomerQuickCreate({ tenantSlug, onClose, fullHref }: { tenantSlug: string; onClose: () => void; fullHref?: string }) {
  const terms = useVerticalTerms();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState({ name: "", phone: "", email: "" });
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const save = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("slug", tenantSlug);
      fd.set("name", values.name);
      fd.set("phone", values.phone);
      fd.set("email", values.email);
      const r = await saveCustomerAction(fd);
      if (r.ok) {
        toast(r.message, "success");
        onClose();
        router.push(`/${tenantSlug}/contactos/${r.id}`);
      } else {
        setErrors(r.errors ?? {});
        toast({ title: "No se guardó", description: r.message, variant: "error" });
      }
    });

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Nuevo ${terms.customer.toLowerCase()}`}
      description={
        <>
          Lo esencial ahora; el resto lo completas en su ficha.
          {fullHref ? <> <FullPanelLink href={fullHref} /></> : null}
        </>
      }
      size="sm"
      busy={pending}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={pending} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={save} className={buttonVariants()}>
            {pending ? "Creando…" : "Crear y abrir ficha"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Nombre completo" required error={errors.name}>
          {(c) => <input {...c} value={values.name} onChange={set("name")} autoComplete="name" className={inputClasses} />}
        </Field>
        <Field label="WhatsApp / teléfono" error={errors.phone}>
          {(c) => <input {...c} value={values.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" className={inputClasses} />}
        </Field>
        <Field label="Correo" error={errors.email}>
          {(c) => <input {...c} value={values.email} onChange={set("email")} type="email" autoComplete="email" className={inputClasses} />}
        </Field>
      </div>
    </ResponsiveSheet>
  );
}
