"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { NLoader } from "@/components/atoms/n-loader";
import { useToast } from "@/components/molecules/toast";
import { cn } from "@/lib/cn";
import {
  updateTenantProfileAction,
  type ProfileFormState,
} from "../actions";
import type { ProfileInitialValues, SystemInfoItem } from "./settings-shell";

const IDLE_STATE: ProfileFormState = { status: "idle" };

function fieldClass(hasError: boolean) {
  return cn(
    "h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2 disabled:cursor-not-allowed disabled:opacity-60",
    hasError
      ? "border-destructive focus:border-destructive focus:outline-destructive/30"
      : "border-border hover:border-ring/50 focus:border-ring focus:outline-ring/30",
  );
}

/**
 * Pestaña "Perfil del negocio": formulario conectado a
 * `updateTenantProfileAction`. Persiste name/slug/city/address/taxId/teléfono,
 * notifica por toast y refresca la ruta (incluido el cambio de slug).
 */
export default function ProfileTab({
  tenantSlug,
  canManage,
  initialValues,
  systemInfo,
}: {
  tenantSlug: string;
  canManage: boolean;
  initialValues: ProfileInitialValues;
  systemInfo: SystemInfoItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(
    updateTenantProfileAction,
    IDLE_STATE,
  );
  const [values, setValues] = useState<ProfileInitialValues>(initialValues);

  const lastHandled = useRef<ProfileFormState | null>(null);
  useEffect(() => {
    if (state === lastHandled.current) {
      return;
    }
    lastHandled.current = state;

    if (state.status === "ok") {
      toast(state.message ?? "Perfil actualizado correctamente.", "success");
      // Si el slug cambió, la ruta actual deja de resolver: saltamos a la nueva.
      if (values.slug && values.slug !== tenantSlug) {
        router.replace(`/${values.slug}/settings`);
      }
    } else if (state.status === "error" && state.message) {
      toast(state.message, "error");
    }
  }, [state, toast, router, values.slug, tenantSlug]);

  const errors = state.errors ?? {};

  const setField = (key: keyof ProfileInitialValues, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <form action={formAction} className="rounded-lg border border-border bg-card p-6">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />

        <div className="mb-4">
          <h2 className="font-semibold text-foreground">Datos del negocio</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Estos datos identifican tu negocio dentro de la plataforma.
          </p>
        </div>

        {!canManage && (
          <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
            Solo el administrador del negocio puede editar esta información.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="text-sm font-medium text-foreground/80">
              Nombre comercial <span className="text-destructive">*</span>
            </label>
            <input
              id="profile-name"
              name="name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              disabled={!canManage || isPending}
              aria-invalid={Boolean(errors.name)}
              placeholder="Ej. Mi Negocio"
              className={cn("mt-1", fieldClass(Boolean(errors.name)))}
            />
            {errors.name && (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="profile-slug" className="text-sm font-medium text-foreground/80">
              Slug (URL) <span className="text-destructive">*</span>
            </label>
            <input
              id="profile-slug"
              name="slug"
              value={values.slug}
              onChange={(event) => setField("slug", event.target.value.toLowerCase())}
              disabled={!canManage || isPending}
              aria-invalid={Boolean(errors.slug)}
              placeholder="mi-negocio"
              className={cn("mt-1", fieldClass(Boolean(errors.slug)))}
            />
            {errors.slug ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.slug}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Cambiarlo modifica la dirección de tu panel.
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="profile-city" className="text-sm font-medium text-foreground/80">
              Ciudad
            </label>
            <input
              id="profile-city"
              name="city"
              value={values.city}
              onChange={(event) => setField("city", event.target.value)}
              disabled={!canManage || isPending}
              placeholder="Ciudad"
              className={cn("mt-1", fieldClass(Boolean(errors.city)))}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="profile-address" className="text-sm font-medium text-foreground/80">
              Dirección
            </label>
            <input
              id="profile-address"
              name="address"
              value={values.address}
              onChange={(event) => setField("address", event.target.value)}
              disabled={!canManage || isPending}
              placeholder="Calle y número"
              className={cn("mt-1", fieldClass(Boolean(errors.address)))}
            />
          </div>

          <div>
            <label htmlFor="profile-taxId" className="text-sm font-medium text-foreground/80">
              NIT / RUT
            </label>
            <input
              id="profile-taxId"
              name="taxId"
              value={values.taxId}
              onChange={(event) => setField("taxId", event.target.value)}
              disabled={!canManage || isPending}
              placeholder="NIT o RUT"
              className={cn("mt-1", fieldClass(Boolean(errors.taxId)))}
            />
          </div>

          <div>
            <label htmlFor="profile-phone" className="text-sm font-medium text-foreground/80">
              Teléfono / WhatsApp
            </label>
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              value={values.phone}
              onChange={(event) => setField("phone", event.target.value)}
              disabled={!canManage || isPending}
              placeholder="+57 300 123 4567"
              className={cn("mt-1", fieldClass(Boolean(errors.phone)))}
            />
          </div>
        </div>

        {canManage && (
          <div className="mt-6">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && <NLoader size={16} className="text-current" />}
              {isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        )}
      </form>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-3 font-semibold text-foreground">Información del sistema</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {systemInfo.map((item) => (
            <div key={item.label}>
              <dt className="font-medium text-foreground/80">{item.label}</dt>
              <dd className="text-muted-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
