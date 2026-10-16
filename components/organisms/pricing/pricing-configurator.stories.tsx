import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PricingConfigurator } from "./pricing-configurator";

const meta = {
  title: "Organismos/PricingConfigurator",
  component: PricingConfigurator,
  parameters: {
    layout: "padded",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component:
          "Nivel, rubro, clientes y módulos; el precio rueda en odómetro y la diferencia flota sobre él. Al subir de nivel cruza un destello y caen cortes oro; Signature vuelve Ink el resumen. Toda la aritmética está en lib/pricing (probada).",
      },
    },
  },
} satisfies Meta<typeof PricingConfigurator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};
export const Mobile: Story = { globals: { viewport: { value: "mobile1" } } };
