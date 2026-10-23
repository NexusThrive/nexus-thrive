import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Eyebrow } from "@/components/molecules/page-header";
import { PublicPricing } from "@/components/organisms/pricing/public-pricing";
import { PublicLayout } from "@/components/templates/public-layout";
import { SHOW_PRICING } from "@/lib/onboarding/flags";
import { loadPricingConfig } from "@/lib/plans/settings";

export const metadata: Metadata = {
  title: "Precios · NEXUS THRIVE",
  description: "Arma NEXUS a la medida de tu negocio: elige tu rubro, tu plan y los módulos que usas.",
};

export default async function PricingPage() {
  // Piloto: sin cobro automático todavía, los precios no se publican.
  if (!SHOW_PRICING) redirect("/");
  const config = await loadPricingConfig();

  return (
    <PublicLayout footerNote={<span>Precios en USD.</span>}>
      <section className="grid max-w-[44rem] gap-3 py-7">
        <Eyebrow className="mb-0 tracking-[0.12em]">Precios en USD</Eyebrow>
        <h1 className="nx-rise font-display text-[clamp(30px,4.6vw,48px)] font-bold leading-[1.06] tracking-[-0.02em]">
          Arma NEXUS a la medida de tu negocio.
        </h1>
        <p className="nx-rise max-w-[52ch] text-base text-muted-foreground" style={{ ["--i" as string]: 1 }}>
          Elige tu rubro, un plan y los módulos que usas. Es el mismo precio que verás al crear tu negocio.
        </p>
      </section>
      <PublicPricing config={config} />
    </PublicLayout>
  );
}
