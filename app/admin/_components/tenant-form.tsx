"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, labelClasses } from "@/components/atoms/input";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { NLoader } from "@/components/atoms/n-loader";
import { normalizeSlug } from "@/lib/core/tenancy/onboarding/slug";
import { createTenantAction, checkSlugAvailabilityAction, type AdminFormState } from "@/app/admin/actions";

const INITIAL: AdminFormState = { status: "idle" };
export default function TenantForm({ onClose, initialOwnerEmail = "" }: { onClose: () => void; initialOwnerEmail?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createTenantAction, INITIAL);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editedSlug, setEditedSlug] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState(initialOwnerEmail);
  const [key] = useState(() => crypto.randomUUID());
  const [checked, setChecked] = useState<{ slug: string; status: string } | null>(null);
  const status = checked?.slug === slug ? checked.status : slug ? "checking" : "idle";
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void checkSlugAvailabilityAction(slug).then((result) => {
        if (!cancelled) setChecked({ slug, status: result.status });
      }).catch(() => { if (!cancelled) setChecked({ slug, status: "failed" }); });
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [slug]);
  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state.status, router]);
  const success = state.status === "ok";
  const disabled = pending || success;
  const errors = state.errors ?? {};
  const slugHint = { idle: "De 3 a 48 caracteres: letras, números y guiones.", checking: "Verificando disponibilidad…", available: "Slug disponible.", taken: "Ese slug ya está en uso.", invalid: "El formato del slug no es válido.", unauthorized: "Tu sesión no tiene permiso para crear negocios.", failed: "No pudimos verificarlo. Al guardar se comprobará de nuevo." }[status] ?? "";
  return (
    <ResponsiveSheet open onOpenChange={(open) => { if (!open && !pending) onClose(); }} title="Nuevo negocio" description="Se creará en preparación. El propietario recibirá acceso después de la activación.">
      <form action={action} className="space-y-5" aria-busy={pending}>
        <input type="hidden" name="provisioningKey" value={key} suppressHydrationWarning />
        <p className="rounded-md border border-border bg-muted p-3 text-sm">Estado inicial: <strong>En preparación</strong>. Perfil Nexus Commerce configurado internamente. No se enviará una invitación todavía.</p>
        <div>
          <label htmlFor="managed-name" className={labelClasses}>Nombre comercial</label>
          <Input id="managed-name" name="name" required minLength={2} maxLength={80} value={name} disabled={disabled} autoComplete="organization" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "managed-name-error" : undefined} onChange={(e) => { setName(e.target.value); if (!editedSlug) setSlug(normalizeSlug(e.target.value).slice(0, 48).replace(/-$/, "")); }} />
          {errors.name && <p id="managed-name-error" role="alert" className="text-sm text-destructive">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="managed-slug" className={labelClasses}>Slug del negocio</label>
          <Input id="managed-slug" name="slug" required minLength={3} maxLength={48} value={slug} disabled={disabled} autoComplete="off" aria-invalid={Boolean(errors.slug) || status === "taken" || status === "invalid"} aria-describedby="managed-slug-hint" onChange={(e) => { setEditedSlug(true); setSlug(e.target.value.trim().toLowerCase()); }} />
          <p id="managed-slug-hint" role="status" aria-live="polite" className="mt-1 text-sm text-muted-foreground">{errors.slug ?? slugHint}</p>
        </div>
        <div>
          <label htmlFor="managed-email" className={labelClasses}>Correo del propietario</label>
          <Input id="managed-email" name="ownerEmail" type="email" required maxLength={254} value={ownerEmail} disabled={disabled} autoComplete="email" aria-invalid={Boolean(errors.ownerEmail)} aria-describedby="managed-email-hint" onChange={(e) => setOwnerEmail(e.target.value)} />
          <p id="managed-email-hint" className="mt-1 text-sm text-muted-foreground">{errors.ownerEmail ?? "Solo este correo verificado podrá aceptar la invitación OWNER."}</p>
        </div>
        {state.message && <p role={success ? "status" : "alert"} className={success ? "text-success" : "text-destructive"}>{state.message}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={pending} onClick={onClose} className={buttonVariants({ variant: "outline" })}>{success ? "Cerrar" : "Cancelar"}</button>
          {!success && <button type="submit" disabled={pending || status === "taken" || status === "invalid" || status === "unauthorized"} className={buttonVariants()}>{pending && <NLoader size={16} />} {pending ? "Creando…" : "Crear en preparación"}</button>}
        </div>
      </form>
    </ResponsiveSheet>
  );
}
