import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BrandSpinner, NMark } from "./n-mark";

const meta = {
  title: "Átomos/NMark",
  component: NMark,
  args: { size: 40, state: "loop", progress: 0.4 },
  argTypes: {
    state: { control: "inline-radio", options: ["loop", "prog", "done"] },
    progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    size: { control: { type: "range", min: 12, max: 120, step: 2 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Base de todas las cargas: la N traza su contorno (`loop`), avanza con el progreso real (`prog`) o se rellena al terminar (`done`). El grosor del trazo se ajusta al tamaño. `NLoader` (`atoms/n-loader`) es el alias histórico con `phase` en lugar de `state`.",
      },
    },
  },
} satisfies Meta<typeof NMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loop: Story = {};
export const Progress: Story = { args: { state: "prog", progress: 0.65 } };
export const Done: Story = { args: { state: "done" } };

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-5">
      {[16, 24, 40, 64].map((size) => (
        <NMark key={size} size={size} />
      ))}
    </div>
  ),
};

/** `NMark` con `role="status"` y etiqueta accesible. */
export const Spinner: Story = { render: () => <BrandSpinner label="Cargando obras" /> };
