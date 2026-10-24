"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { inputClasses } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { Alert } from "@/components/molecules/alert";
import { EmptyState } from "@/components/molecules/empty-state";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { setFunctionAction } from "@/app/[tenant]/(app)/functions/actions";
import { CAPABILITY_CATEGORIES, type CapabilityCategory } from "@/lib/capabilities/registry";
import { searchable, type FunctionGroups, type FunctionItem } from "@/lib/functions/functions";
import { MODULE_ICONS } from "@/lib/onboarding/module-meta";
import { cn } from "@/lib/utils";

type Status = "all" | "on" | "off";

/**
 * Catálogo de funciones de NEXUS: una sola plataforma. Buscar, filtrar por categoría y estado, y encender o apagar cada función.
 * Apagar solo la quita del menú (los datos se conservan); una función encendida a la que le falta configuración lo dice y lleva a terminarla.
 */
export default function FunctionsView({ slug, groups, canManage, profile }: { slug: string; groups: FunctionGroups; canManage: boolean; profile: string | null }) {
  const all = useMemo(() => [...groups.inUse, ...groups.suggested, ...groups.more, ...groups.planned], [groups]);
  const [active, setActive] = useState<Record<string, boolean>>(() => Object.fromEntries(all.map((i) => [i.id, i.active])));
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CapabilityCategory | "all">("all");
  const [status, setStatus] = useState<Status>("all");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const on = (id: string) => active[id] ?? false;
  const label = (id: string) => all.find((i) => i.id === id)?.label ?? id;

  const toggle = (item: FunctionItem, next: boolean) =>
    start(async () => {
      setActive((a) => ({ ...a, [item.id]: next }));
      const r = await setFunctionAction(slug, item.id, next);
      if (r.ok) {
        toast(r.message, "success");
        router.refresh();
      } else {
        setActive((a) => ({ ...a, [item.id]: !next }));
        toast({ title: "No se pudo cambiar", description: r.message, variant: "error" });
      }
    });

  const needle = searchable({ label: q, pitch: "", category: "" as CapabilityCategory }).trim();
  const visible = all.filter((i) => (category === "all" || i.category === category) && (status === "all" || (status === "on") === on(i.id)) && (!needle || searchable(i).includes(needle)));
  const activeCount = all.filter((i) => on(i.id)).length;
  const filtering = q !== "" || category !== "all" || status !== "all";

  const Row = ({ item }: { item: FunctionItem }) => {
    const Icon = MODULE_ICONS[item.id];
    const enabled = on(item.id);
    const missing = item.needs && !on(item.needs) ? label(item.needs) : null;
    const needsSetup = enabled && item.setup && !item.setup.configured;
    return (
      <li className="flex items-start gap-3 px-4 py-3">
        <Icon aria-hidden="true" className={cn("mt-0.5 size-[18px] shrink-0", enabled ? "text-accent-text" : "text-muted-foreground")} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-medium">
            {item.label}
            {item.planned ? <Badge variant="outline">Próximamente</Badge> : needsSetup ? <Badge variant="warning">Falta configurar</Badge> : enabled ? <Badge variant="success">Activa</Badge> : null}
            {item.specialty ? <Badge variant="outline">Especialidad</Badge> : null}
            {item.beta && !item.planned ? <Badge variant="gold">Beta</Badge> : null}
            {item.reason && !enabled && !item.planned ? <Badge variant="outline">Sugerida</Badge> : null}
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{item.pitch}</p>
          {needsSetup ? (
            <p className="mt-1 text-[12.5px]">
              {item.setup!.hint}{" "}
              <Link href={`/${slug}${item.setup!.href}`} className="font-medium underline underline-offset-2">Configurar</Link>
            </p>
          ) : null}
          {item.reason && !enabled && !item.planned ? <p className="mt-1 text-[12.5px] text-foreground">{item.reason}</p> : null}
          {missing && !item.planned ? <p className="mt-1 text-[12.5px] text-muted-foreground">Funciona con «{missing}»{enabled ? ": enciéndela para usarla completa." : ": se enciende primero."}</p> : null}
        </div>
        {item.planned ? null : <Switch checked={enabled} disabled={!canManage || pending} onCheckedChange={(v) => toggle(item, v)} aria-label={`${enabled ? "Apagar" : "Encender"} ${item.label}`} />}
      </li>
    );
  };

  return (
    <div className="grid gap-4">
      {!canManage ? <Alert tone="info">Solo el dueño del negocio enciende o apaga funciones.</Alert> : null}
      <div className="grid gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar una función" placeholder="Buscar una función…" className={cn(inputClasses, "pl-9")} />
          </div>
          <SegmentedControl ariaLabel="Estado" size="sm" value={status} onChange={setStatus} options={[{ value: "all", label: "Todas" }, { value: "on", label: "Activas", count: activeCount }, { value: "off", label: "Apagadas" }]} />
        </div>
        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentedControl ariaLabel="Categoría" size="sm" value={category} onChange={setCategory} options={[{ value: "all", label: "Todas las categorías" }, ...CAPABILITY_CATEGORIES.map((c) => ({ value: c, label: c }))]} />
        </div>
        <p role="status" className="text-xs text-muted-foreground">
          {activeCount} activas de {all.length - groups.planned.length} disponibles{profile ? ` · rubro de partida: ${profile}` : ""}. El rubro solo orienta las sugerencias: todo está disponible.
        </p>
      </div>
      {visible.length === 0 ? (
        <EmptyState title="Ninguna función coincide" description={filtering ? "Prueba con otra palabra o quita los filtros." : "No hay funciones para mostrar."} />
      ) : (
        CAPABILITY_CATEGORIES.map((c) => {
          const rows = visible.filter((i) => i.category === c);
          return rows.length ? (
            <section key={c} aria-labelledby={`fn-${c.replace(/\s+/g, "-")}`} className="grid gap-2">
              <h2 id={`fn-${c.replace(/\s+/g, "-")}`} className="font-display text-[15px] font-semibold">{c} <span className="text-[13px] font-normal text-muted-foreground">· {rows.length}</span></h2>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                {rows.map((item) => <Row key={item.id} item={item} />)}
              </ul>
            </section>
          ) : null;
        })
      )}
    </div>
  );
}
