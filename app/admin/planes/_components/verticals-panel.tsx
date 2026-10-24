"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { inputClasses } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { Field } from "@/components/molecules/field";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { getVerticalIcon } from "@/lib/admin/vertical-icons";
import type { ModuleValue } from "@/lib/admin/catalogs";
import type { ModuleConfig, VerticalConfig } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";
import { saveVerticalAction } from "../actions";
import { useSave } from "./use-save";

function VerticalEditor({ v, modules, canPrice, canStructure, onClose }: { v: VerticalConfig; modules: ModuleConfig[]; canPrice: boolean; canStructure: boolean; onClose: () => void }) {
  const [d, setD] = useState(v);
  const { save, pending } = useSave();
  const toggle = (list: "modules" | "recommended", m: ModuleValue) =>
    setD((prev) => {
      const has = prev[list].includes(m);
      const next = has ? prev[list].filter((x) => x !== m) : [...prev[list], m];
      // Lo recomendado debe estar permitido.
      return list === "modules" && has ? { ...prev, modules: next, recommended: prev.recommended.filter((x) => x !== m) } : { ...prev, [list]: next };
    });
  const selectable = [...modules].sort((a, b) => a.order - b.order).filter((m) => m.module !== "dashboard");

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => !o && onClose()}
      wide
      title={`Rubro · ${v.label}`}
      description="Qué módulos sugiere este rubro de entrada (cualquier negocio puede usar los demás) y si aparece en el registro."
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={() => save(() => saveVerticalAction(d), `Rubro ${d.label} guardado`, onClose)} className={buttonVariants()}>
            {pending ? "Guardando…" : "Guardar rubro"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre">{(c) => <input {...c} disabled={!canStructure} value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} className={inputClasses} />}</Field>
          <Field label="Factor de precio" hint="100 % = precio normal; 135 % = 35 % más caro.">
            {(c) => (
              <div className="relative">
                <input {...c} type="number" min={10} max={500} disabled={!canPrice} value={d.priceFactorPct} onChange={(e) => setD({ ...d, priceFactorPct: Number(e.target.value) })} className={cn(inputClasses, "pr-8 font-mono")} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            )}
          </Field>
        </div>
        <label htmlFor="v-signup" className="flex items-center justify-between gap-3 rounded-md bg-surface-muted p-3">
          <span>
            <b className="block text-[13.5px] font-medium">Aparece en el registro</b>
            <small className="text-xs text-muted-foreground">Si se apaga, nadie nuevo puede elegir este rubro.</small>
          </span>
          <Switch id="v-signup" checked={d.signupEnabled} disabled={!canStructure} onCheckedChange={(on) => setD({ ...d, signupEnabled: on })} />
        </label>
        <div>
          <p className="mb-1 text-[13px] font-medium">Módulos permitidos</p>
          <p className="mb-2 text-xs text-muted-foreground">Lo que no esté aquí no se ofrece ni se puede activar en este rubro. El Inicio siempre está.</p>
          <ChipRow className="flex-wrap">
            {selectable.map((m) => (
              <Chip key={m.module} disabled={!canStructure} selected={d.modules.includes(m.module)} onClick={() => toggle("modules", m.module)}>
                {m.label}
                {m.status === "PLANNED" ? " · planeado" : m.status === "BETA" ? " · beta" : ""}
              </Chip>
            ))}
          </ChipRow>
        </div>
        <div>
          <p className="mb-1 text-[13px] font-medium">Recomendados</p>
          <p className="mb-2 text-xs text-muted-foreground">Vienen marcados en el plan Elite.</p>
          <ChipRow className="flex-wrap">
            {selectable
              .filter((m) => d.modules.includes(m.module) && !m.included)
              .map((m) => (
                <Chip key={m.module} disabled={!canStructure} selected={d.recommended.includes(m.module)} onClick={() => toggle("recommended", m.module)}>
                  {m.label}
                </Chip>
              ))}
          </ChipRow>
        </div>
      </div>
    </ResponsiveSheet>
  );
}

/** Rubros: cuáles se venden, con qué módulos y a qué factor de precio. */
export default function VerticalsPanel({ verticals, modules, canPrice, canStructure }: { verticals: VerticalConfig[]; modules: ModuleConfig[]; canPrice: boolean; canStructure: boolean }) {
  const [editing, setEditing] = useState<VerticalConfig | null>(null);
  const label = (m: ModuleValue) => modules.find((x) => x.module === m)?.label ?? m;
  return (
    <>
      <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {[...verticals].sort((a, b) => a.order - b.order).map((v) => {
          const { icon: Icon } = getVerticalIcon(v.vertical);
          return (
            <li key={v.vertical} className={cn("flex min-w-0 flex-col gap-2.5 rounded-lg border bg-surface p-4", v.signupEnabled ? "border-border" : "border-dashed border-border-strong opacity-75")}>
              <div className="flex items-center gap-2.5">
                <Icon aria-hidden="true" className="size-4 text-accent-text" />
                <b className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold">{v.label}</b>
                <Badge tone={v.signupEnabled ? "success" : "muted"}>{v.signupEnabled ? "En el registro" : "Oculto"}</Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">Factor {v.priceFactorPct} % · {v.modules.length - 1} módulos</p>
              <p className="line-clamp-2 text-[12.5px] text-muted-foreground">{v.modules.filter((m) => m !== "dashboard").map(label).join(" · ")}</p>
              <button type="button" onClick={() => setEditing(v)} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-auto justify-self-start" })}>
                <Pencil aria-hidden="true" className="size-3.5" /> Configurar
              </button>
            </li>
          );
        })}
      </ul>
      {editing ? <VerticalEditor key={editing.vertical} v={editing} modules={modules} canPrice={canPrice} canStructure={canStructure} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
