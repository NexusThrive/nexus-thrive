"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/atoms/switch";
import { useToast } from "@/components/molecules/toast";
import { MODULE_LABELS, type ModuleValue } from "@/lib/admin-catalogs";
import { MODULE_DESCRIPTIONS, MODULE_ICONS } from "@/lib/onboarding/module-meta";
import { toggleTenantModuleAction } from "../../../actions";

/**
 * Módulos del negocio con su interruptor (accounts.modules). La fase de
 * Planes y módulos suma: contratado / habilitado / operativo y la
 * compatibilidad con el rubro.
 */
export default function ModuleToggles({
  tenantId,
  modules,
  canEdit,
}: {
  tenantId: string;
  modules: { moduleName: ModuleValue; active: boolean }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  return (
    <ul className="divide-y divide-border">
      {modules.map((m) => {
        const Icon = MODULE_ICONS[m.moduleName];
        const id = `mod-${m.moduleName}`;
        return (
          <li key={m.moduleName} className="flex items-center gap-3 px-[18px] py-3">
            <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <label htmlFor={id} className="min-w-0 flex-1">
              <b className="block text-[13.5px] font-medium">{MODULE_LABELS[m.moduleName]}</b>
              <small className="block truncate text-xs text-muted-foreground">{MODULE_DESCRIPTIONS[m.moduleName]}</small>
            </label>
            <Switch
              id={id}
              checked={m.active}
              disabled={!canEdit || pending}
              onCheckedChange={(on) =>
                start(async () => {
                  const fd = new FormData();
                  fd.set("tenantId", tenantId);
                  fd.set("moduleName", m.moduleName);
                  fd.set("active", on ? "true" : "false");
                  const r = await toggleTenantModuleAction({ status: "idle" }, fd);
                  if (r.status === "ok") {
                    toast(`${MODULE_LABELS[m.moduleName]} ${on ? "activado" : "desactivado"}`, "success");
                    router.refresh();
                  } else toast({ title: "No se pudo cambiar el módulo", description: r.message, variant: "error" });
                })
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
