import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Eyebrow } from "@/components/molecules/page-header";
import { PricingConfigurator } from "@/components/organisms/pricing/pricing-configurator";
import { PublicLayout } from "@/components/templates/public-layout";
import { SHOW_PRICING } from "@/lib/onboarding/flags";

export const metadata: Metadata = {
  title: "Precios · NEXUS THRIVE",
  description: "Arma NEXUS a la medida de tu negocio: elige nivel, rubro, clientes y módulos.",
};

export default function PricingPage() {
  // Piloto: sin cobro automático todavía, los precios no se publican.
  if (!SHOW_PRICING) redirect("/");

  return (
    <PublicLayout footerNote={<span>Precios en USD; se ajustan en la configuración.</span>}>
      <section className="grid max-w-[44rem] gap-3 py-7">
        <Eyebrow className="mb-0 tracking-[0.12em]">Precios en USD</Eyebrow>
        <h1 className="nx-rise font-display text-[clamp(30px,4.6vw,48px)] font-bold leading-[1.06] tracking-[-0.02em]">
          Arma NEXUS a la medida de tu negocio.
        </h1>
        <p className="nx-rise max-w-[52ch] text-base text-muted-foreground" style={{ ["--i" as string]: 1 }}>
          Elige un nivel, marca los módulos que usas y escribe cuántos clientes atiendes. El precio se ajusta a tu
          rubro mientras lo armas.
        </p>
      </section>
      <PricingConfigurator />
    </PublicLayout>
  );
}
