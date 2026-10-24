import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SkeletonRows } from "./skeleton-rows";

const meta = {
  title: "Moléculas/SkeletonRows",
  component: SkeletonRows,
  args: { rows: 4, label: "Cargando archivos" },
  decorators: [(Story) => <div className="max-w-md rounded-lg border border-border bg-surface p-5"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component:
          "Esqueleto de contenido que está por llegar dentro de un panel, ficha o lista. Conserva la forma de lo que viene (sin saltos al llegar los datos) y se anuncia una vez con `label`. Sustituye al texto suelto «Cargando…». Para la espera de una sección sin forma conocida, `LoadingState` (la N de marca); para la página entera, `PageSkeleton`.",
      },
    },
  },
} satisfies Meta<typeof SkeletonRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rows: Story = {};
export const Form: Story = { args: { variant: "form", rows: 3, label: "Cargando ficha" } };
