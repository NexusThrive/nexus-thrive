"use client";

import { useEffect, useState, useActionState } from "react";
import { ExternalLink, Loader2, Power, Settings2, Store } from "lucide-react";
import {
  toggleTenantStatusAction,
  type AdminFormState,
} from "../actions";
import {
  VERTICAL_LABELS,
  type VerticalValue,
} from "@/lib/admin-catalogs";
import type { TenantListRow } from "@/lib/admin-db";
import { cn } from "@/lib/cn";
import PaginationLinks from "@/app/components/tenant/pagination-links";
import TenantStatusBadge from "./tenant-status-badge";
import TenantModuleBadges from "./tenant-module-badges";
import TenantModal, { type TenantModuleTarget } from "./tenant-modal";

type Notice = { kind: "error" | "success"; text: string } | null;

const ICON_BUTTON =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50";

const VERTICAL_TONES: Record<VerticalValue, string> = {
  gym: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  barber: "bg-violet-50 text-violet-700 ring-violet-600/20",
  restaurant: "bg-amber-50 text-amber-700 ring-amber-600/20",
  services: "bg-slate-100 text-slate-600 ring-slate-500/20",
  tourism: "bg-teal-50 text-teal-700 ring-teal-600/20",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

/**
 * Activar/suspender un negocio desde la tabla. Su propio
 * `useActionState` — el resultado se eleva al banner de la tabla vía
 * `onNotice` y el revalidado de `/admin` refresca la fila.
 */
function StatusToggle({
  tenant,
  onNotice,
}: {
  tenant: TenantListRow;
  onNotice: (notice: Notice) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    toggleTenantStatusAction,
    { status: "idle" } as AdminFormState,
  );

  useEffect(() => {
    if (state.status === "ok") {
      onNotice({ kind: "success", text: state.message ?? "Estado actualizado." });
    } else if (state.status === "error") {
      onNotice({ kind: "error", text: state.message ?? "No se pudo completar la acción." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="tenantId" value={tenant.id} />
      <input
        type="hidden"
        name="active"
        value={tenant.active ? "false" : "true"}
      />
      <button
        type="submit"
        disabled={isPending}
        title={tenant.active ? "Suspender negocio" : "Activar negocio"}
        className={cn(
          ICON_BUTTON,
          tenant.active
            ? "border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            : "border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
        )}
      >
        {isPending ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Power aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        {tenant.active ? "Suspender" : "Activar"}
      </button>
    </form>
  );
}

/**
 * Listado de negocios de la plataforma: tabla desktop + tarjetas mobile,
 * con búsqueda/filtros ya reflejados en la URL por la page. Las acciones
 * (activar/suspender, gestionar módulos) son Server Actions con feedback
 * en un banner auto-ocultable.
 */
export default function TenantTable({
  rows,
  query,
  page,
  totalPages,
  total,
}: {
  rows: TenantListRow[];
  query: string;
  page: number;
  totalPages: number;
  total: number;
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [modulesTarget, setModulesTarget] = useState<TenantListRow | null>(
    null,
  );

  // Los avisos se auto-ocultan a los 5 s.
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const openTarget = rows.find((row) => row.id === modulesTarget?.id) ?? null;

  const toModalTarget = (row: TenantListRow): TenantModuleTarget => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    activeModules: row.modules,
  });

  return (
    <div className="space-y-4">
      {/* Aviso de éxito/error */}
      {notice ? (
        <div
          role="status"
          className={[
            "flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm",
            notice.kind === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setNotice(null)}
            className="rounded p-0.5 opacity-70 transition hover:opacity-100"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      ) : null}

      {/* ---------- Estado vacío ---------- */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Store aria-hidden="true" className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-slate-900">
            {query
              ? `Sin coincidencias para «${query}»`
              : "Aún no hay negocios en la plataforma"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            {query
              ? "Prueba con otro término o limpia la búsqueda."
              : "Crea el primer negocio con el botón «Nuevo negocio»."}
          </p>
        </div>
      ) : (
        <>
          {/* ---------- Tabla (desktop) ---------- */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Negocios de la plataforma Nexus Thrive
              </caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Negocio
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Vertical
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Módulos
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Registrado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700"
                        >
                          {initialsOf(row.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {row.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            <span className="font-mono">{row.slug}</span>
                            {row.customDomain
                              ? ` · ${row.customDomain}`
                              : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                          VERTICAL_TONES[row.vertical],
                        )}
                      >
                        {VERTICAL_LABELS[row.vertical]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TenantModuleBadges modules={row.modules} />
                    </td>
                    <td className="px-4 py-3">
                      <TenantStatusBadge active={row.active} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.createdAt}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir negocio"
                          aria-label={`Abrir ${row.name} en una pestaña nueva`}
                          className={ICON_BUTTON}
                        >
                          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                          Abrir
                        </a>
                        <StatusToggle tenant={row} onNotice={setNotice} />
                        <button
                          type="button"
                          title="Gestionar módulos"
                          aria-label={`Gestionar módulos de ${row.name}`}
                          onClick={() => setModulesTarget(row)}
                          className={ICON_BUTTON}
                        >
                          <Settings2 aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- Tarjetas (mobile) ---------- */}
          <ul className="space-y-3 sm:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700"
                  >
                    {initialsOf(row.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {row.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      <span className="font-mono">{row.slug}</span>
                      {row.customDomain ? ` · ${row.customDomain}` : null}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                          VERTICAL_TONES[row.vertical],
                        )}
                      >
                        {VERTICAL_LABELS[row.vertical]}
                      </span>
                      <TenantStatusBadge active={row.active} />
                    </div>
                    <div className="mt-2">
                      <TenantModuleBadges modules={row.modules} />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Registrado {row.createdAt}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1.5 border-t border-slate-100 pt-3">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${row.name} en una pestaña nueva`}
                    className={ICON_BUTTON}
                  >
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="ml-1">Abrir</span>
                  </a>
                  <StatusToggle tenant={row} onNotice={setNotice} />
                  <button
                    type="button"
                    aria-label={`Gestionar módulos de ${row.name}`}
                    onClick={() => setModulesTarget(row)}
                    className={ICON_BUTTON}
                  >
                    <Settings2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* ---------- Paginación ---------- */}
      <PaginationLinks
        paramKey="page"
        page={page}
        totalPages={totalPages}
        totalLabel={`${total} ${total === 1 ? "negocio" : "negocios"}`}
      />

      {/* ---------- Modal de módulos ---------- */}
      {openTarget ? (
        <TenantModal
          tenant={toModalTarget(openTarget)}
          onClose={() => setModulesTarget(null)}
        />
      ) : null}
    </div>
  );
}
