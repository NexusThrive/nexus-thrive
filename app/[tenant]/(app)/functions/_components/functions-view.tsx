"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { Switch } from "@/components/atoms/switch";
import { Alert } from "@/components/molecules/alert";
import { useToast } from "@/components/molecules/toast";
import { setFunctionAction } from "@/app/[tenant]/(app)/functions/actions";
import { MODULE_ICONS } from "@/lib/onboarding/module-meta";
import type { FunctionGroups, FunctionItem } from "@/lib/functions/functions";
import { CAPABILITY_CATEGORIES, type CapabilityCategory } from "@/lib/capabilities/registry";
import { cn } from "@/lib/utils";

const CATEGORY_HINT: Record<CapabilityCategory, string> = {
  "Clientes y operación": "Atender, reservar, vender producto y llevar el inventario.",
  Ingresos: "Cobrar, facturar y vender en mostrador o en línea.",
  Gastos: "Comprar a proveedores y recibir mercancía.",
  Dinero: "Finanzas, cartera, contabilidad e impuestos.",
  Visibilidad: "Tu sitio, tu tienda, tu ficha de Google, campañas y reseñas.",
  Canales: "Hablar con tus clientes.",
};

/** Funciones del sistema: en uso, sugeridas y el resto. Encender una la agrega al menú; apagarla la quita sin borrar datos. */
export default function FunctionsView({ slug, groups, canManage, profile }: { slug: string; groups: FunctionGroups; canManage: boolean; profile: string | null }) {
  const [active, setActive] = useState<Record<string, boolean>>(() => Object.fromEntries([...groups.inUse, ...groups.suggested, ...groups.more].map((i) => [i.id, i.active])));
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const all = [...groups.inUse, ...groups.suggested, ...groups.more];
  const on = (id: string) => active[id] ?? false;

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

  const Card = ({ item }: { item: FunctionItem }) => {
    const Icon = MODULE_ICONS[item.id];
    const missing = item.needs && !on(item.needs) ? all.find((i) => i.id === item.needs) : null;
    return (
      <li className={cn("grid gap-2 rounded-lg border p-3.5", on(item.id) ? "border-border-input-hover bg-surface" : "border-border bg-surface")}>
        <div className="flex items-start gap-3">
          <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", on(item.id) ? "text-accent-text" : "text-muted-foreground")} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-medium">
              {item.label}
              {item.specialty ? <Badge variant="outline">Especialidad</Badge> : null}
              {item.beta ? <Badge variant="gold">Beta</Badge> : null}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{item.pitch}</p>
            {item.reason ? <p className="mt-1.5 text-[12.5px] text-foreground">{item.reason}</p> : null}
          </div>
          <Switch checked={on(item.id)} disabled={!canManage || pending} onCheckedChange={(v) => toggle(item, v)} aria-label={`${on(item.id) ? "Apagar" : "Encender"} ${item.label}`} />
        </div>
        {missing && !on(item.id) ? <p className="text-[12.5px] text-muted-foreground">Funciona junto con «{missing.label}»: enciéndela también para usarla completa.</p> : null}
      </li>
    );
  };

  const section = (title: string, hint: string, items: FunctionItem[]) =>
    items.length ? (
      <section aria-labelledby={`fn-${title.replace(/\s+/g, "-")}`} className="grid gap-2.5">
        <div>
          <h2 id={`fn-${title.replace(/\s+/g, "-")}`} className="font-display text-[15px] font-semibold">{title}</h2>
          <p className="text-[13px] text-muted-foreground">{hint}</p>
        </div>
        <ul className="grid gap-2.5 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </ul>
      </section>
    ) : null;

  const suggested = all.filter((i) => !on(i.id) && !!i.reason && !i.planned);
  const shownAbove = new Set(suggested.map((i) => i.id));
  return (
    <div className="grid gap-6">
      {!canManage ? <Alert tone="info">Solo el dueño del negocio enciende o apaga funciones.</Alert> : null}
      {section("Te sugerimos", profile ? `Por lo que haces y por tu rubro (${profile}).` : "Por lo que haces.", suggested)}
      {CAPABILITY_CATEGORIES.map((category) =>
        section(category, CATEGORY_HINT[category], all.filter((i) => i.category === category && !shownAbove.has(i.id) && !(i.planned && !on(i.id)))),
      )}
    </div>
  );
}
