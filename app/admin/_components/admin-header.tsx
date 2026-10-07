"use client";

import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import TenantForm from "./tenant-form";

/**
 * Encabezado del panel global. Controla la apertura del modal de alta de
 * negocios; el chip indica el rol con el que se entró (la página ya
 * verificó `User.role = SUPERADMIN` en el servidor).
 */
export default function AdminHeader() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Panel CEO
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestión global de negocios, verticales y módulos de la plataforma.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
            SuperAdmin
          </span>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nuevo negocio
          </button>
        </div>
      </header>

      {formOpen ? (
        <TenantForm onClose={() => setFormOpen(false)} />
      ) : null}
    </>
  );
}
