import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { quotePlan } from "@/lib/plans/quote";
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
      quote: quotePlan({ plan: "ELITE", vertical: "construction", billing: "ANNUAL", selected: ["quotes", "whatsapp"] }),
    },
  },
} satisfies Meta<typeof OnboardingReview>;
export default meta;

export const Empresa: StoryObj<typeof meta> = {};
