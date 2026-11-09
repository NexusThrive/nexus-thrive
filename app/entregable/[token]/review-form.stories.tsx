import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ReviewForm from "./review-form";

const meta = {
  title: "Páginas/Públicas/Revisión de entregable",
  component: ReviewForm,
  parameters: { layout: "centered", docs: { description: { component: "Lo que ve el cliente con el enlace: su nombre, un comentario y dos salidas (aprobar o pedir cambios). Pedir cambios exige decir cuáles. La acción es de muestra en Storybook." } } },
  args: { token: "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde" },
  decorators: [(Story) => <div className="w-[360px] max-w-full"><Story /></div>],
} satisfies Meta<typeof ReviewForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
