"use client";

import { useEffect, useActionState } from "react";
import { Loader2, Power, X } from "lucide-react";
import {
  toggleTenantModuleAction,
  type AdminFormState,
} from "../actions";
import {
  MODULES,
  MODULE_LABELS,
  type ModuleValue,
} from "@/lib/admin-catalogs";

const IDLE_STATE: AdminFormState = { status: "idle" };

export type TenantModuleTarget = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  /** Módulos con `active: true` (los del catálogo no listados = inactivos). */
  activeModules: ModuleValue[];
};

/**
 * Modal de gestión de módulos de un negocio. Muestra los 5 del catálogo
 * con su estado y alterna cada uno vía Server Action (upsert sobre
 * `TenantModule`). Tras cada acción, el revalidado de `/admin` refresca
 * los props y el modal ve el nuevo estado sin cerrarse.
 */
export default function TenantModal({
  tenant,
  onClose,
}: {
  tenant: TenantModuleTarget;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    toggleTenantModuleAction,
    IDLE_STATE,
  );

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

  const activeSet = new Set<ModuleValue>(tenant.activeModules);

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
        aria-labelledby="tenant-modules-title"
        className="relative mt-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:mt-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="tenant-modules-title"
              className="text-lg font-semibold text-slate-900"
            >
              Módulos del negocio
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {tenant.name} · <span className="font-mono">{tenant.slug}</span>
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

        <ul className="mt-4 space-y-2">
          {MODULES.map((moduleName) => {
            const isActive = activeSet.has(moduleName);
            return (
              <li
                key={moduleName}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800">
                    {MODULE_LABELS[moduleName]}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {isActive ? "Activo en este negocio" : "Desactivado"}
                  </span>
                </span>
                <form action={formAction} className="shrink-0">
                  <input
                    type="hidden"
                    name="tenantId"
                    value={tenant.id}
                  />
                  <input
                    type="hidden"
                    name="moduleName"
                    value={moduleName}
                  />
                  <input
                    type="hidden"
                    name="active"
                    value={isActive ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className={[
                      "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                      isActive
                        ? "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                    ].join(" ")}
                  >
                    {isPending ? (
                      <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Power aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    {isActive ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        {state.status === "error" ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {state.message ?? "No se pudo actualizar el módulo."}
          </p>
        ) : null}

        {state.status === "ok" ? (
          <p
            role="status"
            className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            {state.message ?? "Módulo actualizado."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
