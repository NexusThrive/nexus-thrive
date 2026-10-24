"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { UsdInput } from "@/components/molecules/usd-input";
import { CAPABILITIES, CAPABILITY_CATEGORIES } from "@/lib/capabilities/registry";
import { MODULE_ICONS } from "@/lib/onboarding/module-meta";
import type { ModuleConfig, ModuleStatus } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";
import { saveModuleAction } from "../actions";
import { useSave } from "./use-save";

const categoryOf = (module: string) => CAPABILITIES.find((c) => c.id === module)?.category;

const STATUS_HINT: Record<ModuleStatus, string> = {
  READY: "Se vende y se activa.",
  BETA: "Se vende marcado como beta.",
  PLANNED: "No se ofrece ni se cobra.",
};

function ModuleRow({ mod, canPrice, canStructure }: { mod: ModuleConfig; canPrice: boolean; canStructure: boolean }) {
  const [m, setM] = useState(mod);
  const { save, pending } = useSave();
  const dirty = JSON.stringify(m) !== JSON.stringify(mod);
  const Icon = MODULE_ICONS[m.module];
  const core = m.module === "dashboard";
  return (
    <li className="grid gap-3 px-[18px] py-4 lg:grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1.3fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <Icon aria-hidden="true" className="mt-2 size-4 shrink-0 text-accent-text" />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <input aria-label="Nombre del módulo" disabled={!canStructure} value={m.label} onChange={(e) => setM({ ...m, label: e.target.value })} className={cn(inputClasses, "h-8 font-medium")} />
          <input aria-label="Descripción" disabled={!canStructure} value={m.description} onChange={(e) => setM({ ...m, description: e.target.value })} className={cn(inputClasses, "h-8 text-[12.5px] text-muted-foreground")} />
        </div>
      </div>
      <UsdInput aria-label={`Precio de ${m.label}`} value={m.priceUsdCents} disabled={!canPrice || core || m.included} onChange={(v) => setM({ ...m, priceUsdCents: v })} />
      <div className="grid gap-1.5">
        <SegmentedControl
          ariaLabel={`Estado de ${m.label}`}
          size="sm"
          value={m.status}
          onChange={(v) => canStructure && !core && setM({ ...m, status: v })}
          options={[
            { value: "READY", label: "Listo" },
            { value: "BETA", label: "Beta" },
            { value: "PLANNED", label: "Planeado" },
          ]}
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={m.included} disabled={!canStructure || core} onCheckedChange={(v) => setM({ ...m, included: v })} aria-label={`${m.label} incluido gratis`} />
          {core ? "Siempre activo" : m.included ? "Incluido gratis en todos los planes" : STATUS_HINT[m.status]}
        </label>
      </div>
      <button type="button" disabled={!dirty || pending} onClick={() => save(() => saveModuleAction(m), `${m.label} guardado`)} className={buttonVariants({ size: "sm", variant: dirty ? "primary" : "outline" })}>
        <Check aria-hidden="true" className="size-4" /> Guardar
      </button>
    </li>
  );
}

/** Precio y estado de cada módulo. "Planeado" lo saca del registro y de los cobros. */
export default function ModulesPanel({ modules, canPrice, canStructure }: { modules: ModuleConfig[]; canPrice: boolean; canStructure: boolean }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="hidden grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1.3fr)_auto] gap-3 border-b border-border bg-surface-muted px-[18px] py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
        <span>Módulo</span>
        <span>Precio / mes</span>
        <span>Estado</span>
        <span />
      </header>
      {CAPABILITY_CATEGORIES.map((category) => {
        const rows = [...modules].filter((m) => categoryOf(m.module) === category).sort((a, b) => a.order - b.order);
        return rows.length ? (
          <div key={category}>
            <h3 className="border-b border-border bg-surface-muted/60 px-[18px] py-1.5 text-[12px] font-semibold">{category} <span className="font-normal text-muted-foreground">· {rows.length}</span></h3>
            <ul className="divide-y divide-border">
              {rows.map((m) => (
                <ModuleRow key={`${m.module}-${m.priceUsdCents}-${m.status}-${m.included}`} mod={m} canPrice={canPrice} canStructure={canStructure} />
              ))}
            </ul>
          </div>
        ) : null;
      })}
    </section>
  );
}
