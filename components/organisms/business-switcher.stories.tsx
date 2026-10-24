import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BusinessSwitcher } from "./business-switcher";

const meta = {
  title: "Organismos/BusinessSwitcher",
  component: BusinessSwitcher,
  args: {
    currentSlug: "gym-norte",
    currentName: "Gimnasio Norte",
    businesses: [{ slug: "gym-norte", name: "Gimnasio Norte" }],
  },
  decorators: [(Story) => <div className="flex h-72 justify-end"><Story /></div>],
  parameters: {
    layout: "padded",
    docs: {
      story: { inline: false, iframeHeight: 320 },
      description: {
        component:
          "Selector de negocio de la navbar (PC). Cuadro con inicial y nombre hecho con divs que despliega los negocios de la cuenta (el actual lleva ✓) y «Crear otro negocio». Una cuenta puede tener varias organizaciones; elegir otra la recuerda como la última usada y «Crear otro negocio» abre el asistente de alta. Bajo 768 px no se muestra: ahí el negocio va junto al logo.",
      },
    },
  },
} satisfies Meta<typeof BusinessSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneBusiness: Story = { args: { className: "md:flex" } };
export const SeveralBusinesses: Story = {
  args: {
    className: "md:flex",
    businesses: [
      { slug: "gym-norte", name: "Gimnasio Norte" },
      { slug: "spa-centro", name: "Spa Centro" },
      { slug: "constructora-andina-sas", name: "Constructora Andina SAS (nombre muy largo)" },
    ],
  },
};
