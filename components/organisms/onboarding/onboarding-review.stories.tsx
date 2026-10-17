import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { defaultPricingConfig, quote } from "@/lib/plans/pricing";
import { OnboardingReview } from "./onboarding-review";

const meta = {
  title: "Organismos/Onboarding/OnboardingReview",
  component: OnboardingReview,
  decorators: [(Story) => <div className="max-w-[640px] p-6"><Story /></div>],
  args: {
    onEdit: () => {},
    teamSizeLabel: "6 a 20 personas",
    data: {
      tenantType: "COMPANY",
      name: "Constructora Castellar",
      taxId: "901234567-9",
      slug: "constructora-castellar",
      vertical: "construction",
      address: "Cra 7 # 72-41",
      city: "Cartagena",
      plan: "ELITE",
      billing: "ANNUAL",
      planName: "Elite",
      tierLabel: "Hasta 500 clientes",
      quote: quote(defaultPricingConfig(), { plan: "ELITE", vertical: "construction", billing: "ANNUAL", selected: ["quotes", "whatsapp"], tierId: "tier-500" }),
    },
  },
} satisfies Meta<typeof OnboardingReview>;
export default meta;

export const Empresa: StoryObj<typeof meta> = {};
