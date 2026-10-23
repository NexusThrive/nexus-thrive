"use client";

import { useEffect, useRef, useActionState } from "react";
import { Switch } from "@/components/atoms/switch";
import { NLoader } from "@/components/atoms/n-loader";
import { useToast } from "@/components/molecules/toast";
import { MODULE_LABELS } from "@/lib/admin/catalogs";
import { cn } from "@/lib/cn";
import { toggleModuleAction, type ModulesFormState } from "../actions";
import type { ModuleState } from "./settings-shell";

const IDLE_STATE: ModulesFormState = { status: "idle" };

/**
 * Pestaña "Módulos activos": cada switch persiste en `TenantModule` vía
 * `toggleModuleAction` (upsert idempotente). Tras el éxito, la acción revalida
 * el layout del tenant, así que la sidebar refleja el cambio.
 */
export default function ModulesTab({
  tenantSlug,
  canManage,
  modules,
}: {
  tenantSlug: string;
  canManage: boolean;
  modules: ModuleState[];
}) {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(
    toggleModuleAction,
    IDLE_STATE,
  );

  const lastHandled = useRef<ModulesFormState | null>(null);
  useEffect(() => {
    if (state === lastHandled.current) {
      return;
    }
    lastHandled.current = state;

    if (state.status === "ok") {
      toast(state.message ?? "Módulos actualizados.", "success");
    } else if (state.status === "error") {
      toast(
        state.message ?? state.errors?.moduleName ?? "Error al actualizar el módulo.",
        "error",
      );
    }
  }, [state, toast]);

  const handleToggle = (moduleName: ModuleState["moduleName"], next: boolean) => {
    if (!canManage || isPending) {
      return;
    }
    const formData = new FormData();
    formData.append("tenantSlug", tenantSlug);
    formData.append("moduleName", moduleName);
    formData.append("active", String(next));
    formAction(formData);
  };

  const activeCount = modules.filter((item) => item.active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-foreground">Módulos activos</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activeCount} de {modules.length} módulos habilitados. Se reflejan en
            la navegación del negocio.
          </p>
        </div>
        {isPending && <NLoader size={16} className="text-muted-foreground" />}
      </div>

      {!canManage && (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
          Solo el administrador del negocio puede activar o desactivar módulos.
        </p>
      )}

      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {modules.map((item) => (
          <li
            key={item.moduleName}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {MODULE_LABELS[item.moduleName]}
              </p>
              <p className="text-xs text-muted-foreground">{item.moduleName}</p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-xs font-medium",
                  item.active ? "text-success" : "text-muted-foreground",
                )}
              >
                {item.active ? "Activo" : "Inactivo"}
              </span>
              <Switch
                checked={item.active}
                disabled={!canManage || isPending}
                onCheckedChange={(checked) => handleToggle(item.moduleName, checked)}
                aria-label={`${item.active ? "Desactivar" : "Activar"} ${
                  MODULE_LABELS[item.moduleName]
                }`}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}