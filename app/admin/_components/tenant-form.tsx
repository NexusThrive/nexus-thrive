"use client";

import { useEffect, useActionState, useState } from "react";
import { Building2, Check, Loader2, User, X } from "lucide-react";
import {
  createTenantAction,
  checkSlugAvailabilityAction,
  type AdminFormState,
} from "../actions";
import {
  MODULE_LABELS,
  MODULES,
  VERTICAL_ICONS,
  VERTICAL_LABELS,
  VERTICALS,
  type VerticalValue,
} from "@/lib/admin-catalogs";
import {
  TEAM_SIZE_LABELS,
  type OnboardingTenantType,
  type TeamSizeValue,
} from "@/lib/onboarding/types";
import { getOnboardingModulePreset } from "@/lib/onboarding/presets";

const IDLE_STATE: AdminFormState = { status: "idle" };
const SLUG_DEBOUNCE_MS = 350;

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

/**
 * Modal de alta de negocios en la plataforma. El slug se chequea en vivo
 * (debounce) contra el servidor, pero la validación definitiva — formato,
 * catálogo, unicidad y transacción con los módulos — siempre ocurre en el
 * Server Action. Crea el tenant con sus módulos iniciales en una sola
 * transacción y cierra tras el feedback de éxito.
 */
export default function TenantForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(
    createTenantAction,
    IDLE_STATE,
  );

  const [name, setName] = useState(state.values?.name ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  const [vertical, setVertical] = useState<VerticalValue | "">(
    state.values?.vertical ?? "",
  );
  const [modules, setModules] = useState<ReadonlySet<string>>(
    new Set(state.values?.modules ?? []),
  );
  // Perfil adaptativo del onboarding: Empresa (default) / Persona individual.
  const [tenantType, setTenantType] = useState<OnboardingTenantType>(
    state.values?.tenantType === "INDIVIDUAL" ? "INDIVIDUAL" : "COMPANY",
  );
  const [legalName, setLegalName] = useState(state.values?.legalName ?? "");
  const [taxId, setTaxId] = useState(state.values?.taxId ?? "");
  const [teamSize, setTeamSize] = useState<TeamSizeValue | "">(
    state.values?.teamSize ?? "",
  );
  const [address, setAddress] = useState(state.values?.address ?? "");
  // Si el CEO aún no tocó los módulos a mano, elegir vertical/perfil
  // preselecciona la receta adaptativa (tenantType + vertical), igual que
  // el wizard de onboarding del integrante.
  const [modulesTouched, setModulesTouched] = useState(false);
  // Última respuesta del servidor; se deriva `slugStatus` para no llamar
  // setState de forma síncrona dentro de un effect.
  const [slugCheck, setSlugCheck] = useState<{
    slug: string;
    status: "available" | "taken" | "invalid";
  } | null>(null);

  // Check de disponibilidad en vivo con debounce.
  useEffect(() => {
    const trimmed = slug.trim();
    if (!trimmed) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void checkSlugAvailabilityAction(trimmed).then((result) => {
        if (!cancelled && result.status !== "unauthorized") {
          setSlugCheck({ slug: trimmed, status: result.status });
        }
      });
    }, SLUG_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug]);

  // Cierra tras el éxito.
  useEffect(() => {
    if (state.status !== "ok") {
      return;
    }
    const timer = setTimeout(() => onClose(), 1500);
    return () => clearTimeout(timer);
  }, [state, onClose]);

  // Bloquea el scroll de fondo mientras el modal está abierto.
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

  const trimmedSlug = slug.trim();
  const slugStatus: SlugStatus = !trimmedSlug
    ? "idle"
    : slugCheck && slugCheck.slug === trimmedSlug
      ? slugCheck.status
      : "checking";

  const toggleModule = (moduleName: string) => {
    setModulesTouched(true);
    setModules((current) => {
      const next = new Set(current);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  };

  // Receta adaptativa (misma regla que el wizard: INDIVIDUAL quita los
  // módulos pesados de equipo). Solo actúa mientras el CEO no tocó módulos.
  const applyPreset = (
    nextTenantType: OnboardingTenantType,
    nextVertical: VerticalValue | "",
  ) => {
    if (modulesTouched || !nextVertical) {
      return;
    }
    setModules(
      new Set(
        getOnboardingModulePreset({
          tenantType: nextTenantType,
          vertical: nextVertical,
        }),
      ),
    );
  };

  const changeTenantType = (next: OnboardingTenantType) => {
    setTenantType(next);
    applyPreset(next, vertical);
  };

  const slugHint =
    slugStatus === "checking"
      ? "Verificando…"
      : slugStatus === "available"
        ? "Slug disponible."
        : slugStatus === "taken"
          ? "Ese slug ya está en uso."
          : slugStatus === "invalid"
            ? "Formato de slug no válido."
            : null;

  const slugHintTone =
    slugStatus === "available"
      ? "text-emerald-600"
      : slugStatus === "taken" || slugStatus === "invalid"
        ? "text-rose-600"
        : "text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={() => !isPending && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-form-title"
        className="relative mt-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:mt-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="tenant-form-title"
              className="text-lg font-semibold text-slate-900"
            >
              Nuevo negocio
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Crea el tenant con su vertical y módulos iniciales.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={isPending}
            onClick={onClose}
            className="-m-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4" noValidate>
          {/* Perfil del onboarding (Empresa / Persona individual) */}
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              Perfil del negocio
            </legend>
            <p className="mt-0.5 text-xs text-slate-500">
              Define cómo se presenta el negocio en NEXUS; el integrante
              confirma el resto en su onboarding.
            </p>
            <input type="hidden" name="tenantType" value={tenantType} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => changeTenantType("COMPANY")}
                aria-pressed={tenantType === "COMPANY"}
                className={[
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                  tenantType === "COMPANY"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <Building2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                Empresa
              </button>
              <button
                type="button"
                onClick={() => changeTenantType("INDIVIDUAL")}
                aria-pressed={tenantType === "INDIVIDUAL"}
                className={[
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                  tenantType === "INDIVIDUAL"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <User aria-hidden="true" className="h-4 w-4 shrink-0" />
                Persona individual
              </button>
            </div>
            {errors.tenantType ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.tenantType}
              </p>
            ) : null}
          </fieldset>

          {/* Nombre del negocio */}
          <div>
            <label
              htmlFor="tenant-name"
              className="text-sm font-medium text-slate-700"
            >
              Nombre
            </label>
            <input
              id="tenant-name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                tenantType === "COMPANY"
                  ? "Ej: Gimnasio Carlos"
                  : "Ej: Ana Diseñadora"
              }
              aria-invalid={Boolean(errors.name)}
              className={[
                "mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 transition focus:outline-2",
                errors.name
                  ? "border-rose-300 focus:border-rose-400 focus:outline-rose-500/30"
                  : "border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:outline-indigo-500/30",
              ].join(" ")}
            />
            {errors.name ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.name}
              </p>
            ) : null}
          </div>

          {/* Razón social (solo Empresa, opcional) */}
          {tenantType === "COMPANY" ? (
            <div>
              <label
                htmlFor="tenant-legal-name"
                className="text-sm font-medium text-slate-700"
              >
                Razón social{" "}
                <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                id="tenant-legal-name"
                name="legalName"
                type="text"
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                placeholder="Ej: Gimnasio Carlos S.A.S."
                aria-invalid={Boolean(errors.legalName)}
                className={[
                  "mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 transition focus:outline-2",
                  errors.legalName
                    ? "border-rose-300 focus:border-rose-400 focus:outline-rose-500/30"
                    : "border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:outline-indigo-500/30",
                ].join(" ")}
              />
              {errors.legalName ? (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.legalName}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* NIT / RUT (opcional; quien lo omita lo completa en el onboarding) */}
          <div>
            <label
              htmlFor="tenant-tax-id"
              className="text-sm font-medium text-slate-700"
            >
              {tenantType === "COMPANY" ? "NIT / RUT" : "Documento (CC / NIT)"}{" "}
              <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              id="tenant-tax-id"
              name="taxId"
              type="text"
              value={taxId}
              onChange={(event) => setTaxId(event.target.value)}
              placeholder={
                tenantType === "COMPANY" ? "Ej: 901123456" : "Ej: 1036654321"
              }
              aria-invalid={Boolean(errors.taxId)}
              className={[
                "mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 transition focus:outline-2",
                errors.taxId
                  ? "border-rose-300 focus:border-rose-400 focus:outline-rose-500/30"
                  : "border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:outline-indigo-500/30",
              ].join(" ")}
            />
            {errors.taxId ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.taxId}
              </p>
            ) : null}
          </div>

          {/* Tamaño del equipo (solo Empresa, opcional) */}
          {tenantType === "COMPANY" ? (
            <div>
              <label
                htmlFor="tenant-team-size"
                className="text-sm font-medium text-slate-700"
              >
                Equipo{" "}
                <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <select
                id="tenant-team-size"
                name="teamSize"
                value={teamSize}
                onChange={(event) =>
                  setTeamSize(event.target.value as TeamSizeValue | "")
                }
                aria-invalid={Boolean(errors.teamSize)}
                className={[
                  "mt-1 h-10 w-full appearance-none rounded-lg border bg-white px-3 text-sm text-slate-900 transition focus:outline-2",
                  errors.teamSize
                    ? "border-rose-300 focus:border-rose-400 focus:outline-rose-500/30"
                    : "border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:outline-indigo-500/30",
                ].join(" ")}
              >
                <option value="" disabled>
                  Sin dato (se confirma en el onboarding)…
                </option>
                {Object.entries(TEAM_SIZE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.teamSize ? (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.teamSize}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Dirección / REMOTE (solo Empresa, opcional) */}
          {tenantType === "COMPANY" ? (
            <div>
              <label
                htmlFor="tenant-address"
                className="text-sm font-medium text-slate-700"
              >
                Dirección{" "}
                <span className="font-normal text-slate-400">
                  (opcional · «REMOTE» si no tiene sede)
                </span>
              </label>
              <input
                id="tenant-address"
                name="address"
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Ej: Cra 15 # 82-52, Bogotá"
                aria-invalid={Boolean(errors.address)}
                className={[
                  "mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 transition focus:outline-2",
                  errors.address
                    ? "border-rose-300 focus:border-rose-400 focus:outline-rose-500/30"
                    : "border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:outline-indigo-500/30",
                ].join(" ")}
              />
              {errors.address ? (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.address}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Slug (subdominio) con check en vivo */}
          <div>
            <label
              htmlFor="tenant-slug"
              className="text-sm font-medium text-slate-700"
            >
              Slug (subdominio)
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white transition focus-within:border-indigo-400 focus-within:outline-2 focus-within:outline-indigo-500/30 hover:border-slate-300">
              <input
                id="tenant-slug"
                name="slug"
                type="text"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="gimnasio-carlos"
                aria-invalid={Boolean(errors.slug)}
                className="h-10 w-full rounded-l-lg bg-transparent px-3 text-sm text-slate-900 focus:outline-none"
              />
                <span className="flex h-10 shrink-0 items-center border-l border-slate-200 px-3 text-xs text-slate-500">
                {slugStatus === "checking" ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin"
                  />
                ) : slugStatus === "available" ? (
                  <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-500" />
                ) : slugStatus === "taken" || slugStatus === "invalid" ? (
                  <X aria-hidden="true" className="h-3.5 w-3.5 text-rose-500" />
                ) : null}
              </span>
            </div>
            {errors.slug ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.slug}
              </p>
            ) : slugHint ? (
              <p className={`mt-1 text-xs ${slugHintTone}`}>{slugHint}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Minúsculas, números y guiones · 3–48 caracteres.
              </p>
            )}
          </div>

          {/* Vertical */}
          <div>
            <label
              htmlFor="tenant-vertical"
              className="text-sm font-medium text-slate-700"
            >
              Vertical
            </label>
            <select
              id="tenant-vertical"
              name="vertical"
              value={vertical}
              onChange={(event) => {
                const next = event.target.value as VerticalValue | "";
                setVertical(next);
                applyPreset(tenantType, next);
              }}
              aria-invalid={Boolean(errors.vertical)}
              className={[
                "mt-1 h-10 w-full appearance-none rounded-lg border bg-white px-3 text-sm text-slate-900 transition focus:outline-2",
                errors.vertical
                  ? "border-rose-300 focus:border-rose-400 focus:outline-rose-500/30"
                  : "border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:outline-indigo-500/30",
              ].join(" ")}
            >
              <option value="" disabled>
                Selecciona una vertical…
              </option>
              {VERTICALS.map((value) => (
                <option key={value} value={value}>
                  {VERTICAL_ICONS[value]} {VERTICAL_LABELS[value]}
                </option>
              ))}
            </select>
            {errors.vertical ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.vertical}
              </p>
            ) : null}
          </div>

          {/* Módulos iniciales */}
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              Módulos iniciales
            </legend>
            <p className="mt-0.5 text-xs text-slate-500">
              Podrás activar o desactivar cada módulo después desde la tabla.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODULES.map((moduleName) => (
                <label
                  key={moduleName}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    name="modules"
                    value={moduleName}
                    checked={modules.has(moduleName)}
                    onChange={() => toggleModule(moduleName)}
                    className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                  />
                  {MODULE_LABELS[moduleName]}
                </label>
              ))}
            </div>
            {errors.modules ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.modules}
              </p>
            ) : null}
          </fieldset>

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {state.message}
            </p>
          ) : null}

          {state.status === "ok" ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            >
              <Building2 aria-hidden="true" className="h-4 w-4 shrink-0" />
              {state.message ?? "Negocio creado correctamente."}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 aria-hidden="true" className="h-4 w-4" />
              )}
              {isPending ? "Creando…" : "Crear negocio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
