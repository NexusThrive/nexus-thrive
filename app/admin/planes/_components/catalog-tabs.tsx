"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import type { PricingConfig } from "@/lib/plans/pricing";
import ModulesPanel from "./modules-panel";
import PlansPanel from "./plans-panel";
import Simulator from "./simulator";
import TiersPanel from "./tiers-panel";
import VerticalsPanel from "./verticals-panel";

type Tab = "planes" | "modulos" | "rubros" | "clientes" | "simulador";

export default function CatalogTabs({ config, canPrice, canStructure }: { config: PricingConfig; canPrice: boolean; canStructure: boolean }) {
  const [tab, setTab] = useState<Tab>("planes");
  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto [scrollbar-width:none]">
        <SegmentedControl
          ariaLabel="Secciones del catálogo"
          value={tab}
          onChange={setTab}
          options={[
            { value: "planes", label: "Planes", count: config.plans.length },
            { value: "modulos", label: "Módulos", count: config.modules.length },
            { value: "rubros", label: "Rubros", count: config.verticals.filter((v) => v.signupEnabled).length },
            { value: "clientes", label: "Clientes", count: config.tiers.length },
            { value: "simulador", label: "Simulador" },
          ]}
        />
      </div>
      <div key={tab} className="nx-rise">
        {tab === "planes" ? <PlansPanel plans={[...config.plans].sort((a, b) => a.order - b.order)} canPrice={canPrice} canStructure={canStructure} /> : null}
        {tab === "modulos" ? <ModulesPanel modules={config.modules} canPrice={canPrice} canStructure={canStructure} /> : null}
        {tab === "rubros" ? <VerticalsPanel verticals={config.verticals} modules={config.modules} canPrice={canPrice} canStructure={canStructure} /> : null}
        {tab === "clientes" ? <TiersPanel tiers={config.tiers} canPrice={canPrice} /> : null}
        {tab === "simulador" ? <Simulator config={config} /> : null}
      </div>
    </div>
  );
}
