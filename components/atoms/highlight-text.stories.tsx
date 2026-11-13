import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HighlightText } from "./highlight-text";

const meta = {
  title: "Átomos/Presentación/HighlightText",
  id: "átomos-highlighttext",
  component: HighlightText,
  args: { text: "Camila Torres · Corte y barba", terms: ["camila"] },
  argTypes: { terms: { control: "object" } },
  parameters: {
    docs: { description: { component: "Resalta en el texto la coincidencia de la búsqueda, sin importar tildes ni mayúsculas. Usa `<mark>` para que un lector de pantalla sepa que es una coincidencia. Sin términos devuelve el texto tal cual." } },
  },
} satisfies Meta<typeof HighlightText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** «jose» encuentra «José»: se compara sin tildes. */
export const IgnoraTildes: Story = { args: { text: "José Ángel Gómez", terms: ["jose", "angel"] } };

/** Varias palabras: cada una se resalta por separado. */
export const VariasPalabras: Story = { args: { text: "Corte clásico con barba y masaje", terms: ["corte", "barba"] } };

/** Sin búsqueda activa no se marca nada. */
export const SinTerminos: Story = { args: { terms: [] } };
