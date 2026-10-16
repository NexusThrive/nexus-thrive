import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Billing, IndustryKey, TierKey } from "@/lib/pricing/catalog";
import styles from "@/components/organisms/pricing/pricing.module.css";
import { BillingToggle } from "./billing-toggle";
import { ClientCounter } from "./client-counter";
import { IndustryPicker } from "./industry-picker";
import { ModuleOption } from "./module-option";
import { TierSelector } from "./tier-selector";

/** Las piezas leen el color del nivel (--acc) del contenedor del configurador. */
function Frame({ tier, children }: { tier: TierKey; children: React.ReactNode }) {
  return (
    <div className={styles.cfg} data-tier={tier} style={{ display: "block", padding: 24, maxWidth: 640 }}>
      {children}
    </div>
  );
}

const meta = {
  title: "Moléculas/Pricing",
  parameters: {
    docs: { description: { component: "Piezas del configurador de precios. El color del nivel (gris, azul Nexus, oro) llega por la variable `--acc` del contenedor." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tiers: Story = {
  render: function Render() {
    const [tier, setTier] = useState<TierKey>("elite");
    return (
      <Frame tier={tier}>
        <TierSelector value={tier} preSignature={false} onChange={setTier} prices={{ essential: "Gratis", elite: "desde $29/mes", signature: "desde $79/mes" }} />
      </Frame>
    );
  },
};

export const PreSignature: Story = {
  render: () => (
    <Frame tier="elite">
      <TierSelector value="elite" preSignature onChange={() => {}} prices={{ essential: "Gratis", elite: "desde $29/mes", signature: "desde $79/mes" }} />
    </Frame>
  ),
};

export const Industries: Story = {
  render: function Render() {
    const [value, setValue] = useState<IndustryKey>("construction");
    return <IndustryPicker value={value} onChange={setValue} />;
  },
};

export const Clients: Story = {
  render: function Render() {
    const [clients, setClients] = useState(120);
    return (
      <Frame tier="elite">
        <ClientCounter tier="elite" effective={clients > 150 ? "pre" : "elite"} clients={clients} moduleCount={3} onChange={setClients} />
      </Frame>
    );
  },
};

export const Modules: Story = {
  render: function Render() {
    const [on, setOn] = useState(true);
    return (
      <Frame tier="elite">
        <div className="grid gap-1.5">
          <ModuleOption icon="user" name="Clientes" description="Fichas, historial y etiquetas" price="Incluido" state="base" />
          <ModuleOption icon="message" name="WhatsApp Business" description="Bandeja, plantillas y respuestas rápidas" price="+$9" state={on ? "on" : "off"} onToggle={setOn} />
          <ModuleOption icon="file" name="Facturación electrónica" description="Facturas válidas ante la DIAN" price="+$8" state="locked" />
        </div>
      </Frame>
    );
  },
};

export const BillingCycle: Story = {
  render: function Render() {
    const [value, setValue] = useState<Billing>("monthly");
    return (
      <div style={{ ["--pln" as string]: "var(--border)", ["--pfg" as string]: "var(--foreground)", ["--pmu" as string]: "var(--foreground-muted)", maxWidth: 320 }}>
        <BillingToggle value={value} onChange={setValue} />
      </div>
    );
  },
};
