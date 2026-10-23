"use client";

import { useState } from "react";
import Link from "next/link";
import { selectClasses } from "@/components/atoms/input";
import { buttonVariants } from "@/components/atoms/button-variants";
import { PlanPicker, type PlanSelection } from "@/components/organisms/onboarding/plan-picker";
import type { VerticalValue } from "@/lib/admin/catalogs";
import { signupVerticals, type PricingConfig } from "@/lib/plans/pricing";

/**
 * Precios públicos: el mismo selector y el mismo cálculo que el onboarding,
 * sobre el catálogo que se edita en el Operations Center (`/admin/planes`).
 * Lo que alguien ve aquí es lo que pagaría al registrarse.
 */
export function PublicPricing({ config }: { config: PricingConfig }) {
  const verticals = signupVerticals(config);
  const [vertical, setVertical] = useState<VerticalValue>(verticals[0]?.vertical ?? "gym");
  const [selection, setSelection] = useState<PlanSelection>({ plan: "ELITE", billing: "MONTHLY", selected: [], tierId: null });

  return (
    <div className="grid gap-5">
      <label className="grid max-w-sm gap-1.5 text-[13px] font-medium">
        Tu rubro
        <select
          value={vertical}
          onChange={(e) => {
            setVertical(e.target.value as VerticalValue);
            setSelection((s) => ({ ...s, selected: [] }));
          }}
          className={selectClasses}
        >
          {verticals.map((v) => (
            <option key={v.vertical} value={v.vertical}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <PlanPicker config={config} vertical={vertical} value={selection} onChange={setSelection} />
      <div>
        <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
          Crear mi negocio
        </Link>
      </div>
    </div>
  );
}
