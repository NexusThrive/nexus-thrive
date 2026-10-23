"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { Switch } from "@/components/atoms/switch";
import { useToast } from "@/components/molecules/toast";
import type { ModuleValue } from "@/lib/admin/catalogs";
import { MODULE_ICONS } from "@/lib/onboarding/module-meta";
import type { ModuleState } from "@/lib/plans/compat";
import { cn } from "@/lib/utils";
import { toggleTenantModuleAction } from "../../../actions";

type Row = { module: ModuleValue; label: string; contracted: boolean; enabled: boolean; state: ModuleState; compatible: boolean };

const STATE: Record<ModuleState, { label: string; tone: "success" | "warning" | "muted" }> = {
  operational: { label: "Operativo", tone: "success" },
  beta: { label: "Beta", tone: "warning" },
  planned: { label: "Planeado", tone: "muted" },
};

/**
 * Módulos del negocio: contratado (plan) · habilitado (interruptor) ·
 * operativo (catálogo). Lo incompatible con el rubro o planeado no se puede
 * encender (el servidor lo vuelve a comprobar) y el Inicio no se apaga.
 */
export default function ModuleToggles({ tenantId, modules, canEdit }: { tenantId: string; modules: Row[]; canEdit: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const visible = modules.filter((m) => m.compatible || m.enabled);
  const hidden = modules.length - visible.length;

  return (
    <>
      <ul className="divide-y divide-border">
        {visible.map((m) => {
          const Icon = MODULE_ICONS[m.module];
          const id = `mod-${m.module}`;
          const locked = m.module === "dashboard" || (!m.enabled && (!m.compatible || m.state === "planned"));
          return (
            <li key={m.module} className="flex items-center gap-3 px-[18px] py-3">
              <Icon aria-hidden="true" className={cn("size-4 shrink-0", m.enabled ? "text-accent-text" : "text-muted-foreground")} />
              <label htmlFor={id} className="min-w-0 flex-1">
                <b className="block text-[13.5px] font-medium">{m.label}</b>
                <span className="mt-1 flex flex-wrap gap-1">
                  <Badge tone={m.contracted ? "neutral" : "muted"}>{m.contracted ? "Contratado" : "No contratado"}</Badge>
                  <Badge tone={STATE[m.state].tone}>{STATE[m.state].label}</Badge>
                  {!m.compatible ? <Badge tone="danger">Ajeno al rubro</Badge> : null}
                  {m.enabled && !m.contracted && m.module !== "dashboard" ? <Badge tone="warning">Activo sin contrato</Badge> : null}
                </span>
              </label>
              <Switch
                id={id}
                aria-label={`${m.label} habilitado`}
                checked={m.enabled}
                disabled={!canEdit || pending || locked}
                onCheckedChange={(on) =>
                  start(async () => {
                    const fd = new FormData();
                    fd.set("tenantId", tenantId);
                    fd.set("moduleName", m.module);
                    fd.set("active", on ? "true" : "false");
                    const r = await toggleTenantModuleAction({ status: "idle" }, fd);
                    if (r.status === "ok") {
                      toast(`${m.label} ${on ? "activado" : "desactivado"}`, "success");
                      router.refresh();
                    } else toast({ title: "No se pudo cambiar el módulo", description: r.message, variant: "error" });
                  })
                }
              />
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? <p className="border-t border-border px-[18px] py-2.5 text-xs text-muted-foreground">{hidden} módulos no aplican a este rubro (se configuran en Planes y módulos).</p> : null}
    </>
  );
}
