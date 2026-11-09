import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { EMPTY_DRAFT, type OnboardingDraft } from "@/lib/core/tenancy/onboarding/types";
import AdaptiveBusinessForm from "./adaptive-business-form";

const verticals = [
  { value: "retail" as const, label: "Comercio" },
  { value: "gym" as const, label: "Gimnasio" },
  { value: "restaurant" as const, label: "Restaurante" },
];

function Demo({ initial, showErrors = false }: { initial?: Partial<OnboardingDraft>; showErrors?: boolean }) {
  const [draft, setDraft] = useState<OnboardingDraft>({ ...EMPTY_DRAFT, tenantType: "INDIVIDUAL", ...initial });
  return (
    <div className="max-w-2xl p-5">
      <AdaptiveBusinessForm verticals={verticals} draft={draft} onPatch={(p) => setDraft((d) => ({ ...d, ...p }))} errors={showErrors ? { vertical: "Selecciona tu rubro.", teamSize: "Indica el tamaño de tu equipo." } : {}} showErrors={showErrors} />
    </div>
  );
}

const meta = {
  title: "Páginas/Onboarding/Tu negocio",
  component: AdaptiveBusinessForm,
  parameters: { layout: "fullscreen", docs: { description: { component: "Paso «Tu negocio» del registro: nombre, enlace, rubro (lista con Comercio, Gimnasio y Restaurante), tamaño del equipo y, opcionales, razón social, NIT y dirección." } } },
  args: { verticals, draft: EMPTY_DRAFT, onPatch: () => {}, errors: {}, showErrors: false },
} satisfies Meta<typeof AdaptiveBusinessForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Vacio: Story = { render: () => <Demo /> };
export const ConErrores: Story = { render: () => <Demo showErrors /> };
export const ElegirRubro: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("combobox", { name: /Rubro principal/ }));
    await userEvent.click(await within(document.body).findByRole("option", { name: "Comercio" }));
    await expect(c.getByRole("combobox", { name: /Rubro principal/ })).toHaveTextContent("Comercio");
  },
};
