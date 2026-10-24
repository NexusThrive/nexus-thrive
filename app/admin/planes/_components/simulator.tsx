"use client";

import { useMemo, useState } from "react";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { Odometer } from "@/components/atoms/odometer";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import type { VerticalValue, ModuleValue } from "@/lib/admin/catalogs";
import type { Billing, PlanKey } from "@/lib/plans/catalog";
import { activePlans, offeredModules, quote, type PricingConfig, formatUsdCents } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";
import { Select } from "@/components/atoms/select";

/** Simulador: el precio exacto que verá un negocio con la configuración guardada. */
export default function Simulator({ config }: { config: PricingConfig }) {
  const verticals = [...config.verticals].sort((a, b) => a.order - b.order);
  const [vertical, setVertical] = useState<VerticalValue>(verticals[0]?.vertical ?? "gym");
  const [plan, setPlan] = useState<PlanKey>("ELITE");
  const [billing, setBilling] = useState<Billing>("MONTHLY");
  const [tierId, setTierId] = useState(config.tiers[0]?.id ?? "");
  const [selected, setSelected] = useState<ModuleValue[]>([]);
  const offered = offeredModules(config, vertical);
  const q = useMemo(() => quote(config, { plan, vertical, billing, selected, tierId }), [config, plan, vertical, billing, selected, tierId]);

  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="grid content-start gap-4 rounded-lg border border-border bg-surface p-[18px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-[13px] font-medium">
            Rubro
            <Select value={vertical} onChange={(e) => { setVertical(e.target.value as VerticalValue); setSelected([]); }}>
              {verticals.map((v) => (
                <option key={v.vertical} value={v.vertical}>
                  {v.label}
                  {v.signupEnabled ? "" : " (oculto)"}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium">
            Clientes
            <Select value={tierId} onChange={(e) => setTierId(e.target.value)}>
              {[...config.tiers].sort((a, b) => a.order - b.order).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} · {formatUsdCents(t.priceUsdCents)}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <SegmentedControl ariaLabel="Plan" value={plan} onChange={setPlan} options={activePlans(config).map((p) => ({ value: p.key, label: p.name }))} />
          <SegmentedControl ariaLabel="Ciclo" value={billing} onChange={setBilling} options={[{ value: "MONTHLY", label: "Mensual" }, { value: "ANNUAL", label: "Anual" }]} />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium">Módulos que se ofrecen en este rubro</p>
          <ChipRow className="flex-wrap">
            {offered.map((m) => (
              <Chip key={m.module} selected={q.modules.includes(m.module)} onClick={() => setSelected((s) => (s.includes(m.module) ? s.filter((x) => x !== m.module) : [...s, m.module]))}>
                {m.label}
                {m.included ? " · incluido" : ""}
              </Chip>
            ))}
          </ChipRow>
        </div>
      </section>
      <section className="grid content-start gap-3 rounded-lg bg-ink p-[18px] text-[#F7F6F3]">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#A1A1A8]">Lo que pagaría</p>
        <p className="flex items-baseline gap-1.5">
          <Odometer value={(q.monthlyCents / 100).toFixed(q.monthlyCents % 100 ? 2 : 0)} prefix="$" className="font-display text-[40px] font-bold leading-none" />
          <span className="text-[13px] text-[#A1A1A8]">USD/mes{billing === "ANNUAL" ? ` · ${formatUsdCents(q.yearlyCents)} al año` : ""}</span>
        </p>
        <ul className="grid gap-1.5 border-t border-[#2A2A2E] pt-3 text-[13px]">
          {q.lines.map((l) => (
            <li key={l.label} className={cn("flex justify-between gap-3", l.kind === "tier" && "text-[#D4AF37]")}>
              <span>{l.label}</span>
              <span className="font-mono tabular-nums">{formatUsdCents(l.cents)}</span>
            </li>
          ))}
          {billing === "ANNUAL" ? (
            <li className="flex justify-between gap-3 text-[#4FB58A]">
              <span>Descuento anual</span>
              <span className="font-mono tabular-nums">−{formatUsdCents(q.subtotalCents - q.monthlyCents)}</span>
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
