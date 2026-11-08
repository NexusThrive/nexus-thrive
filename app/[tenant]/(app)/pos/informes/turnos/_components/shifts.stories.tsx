import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ShiftsView from "./shifts-view";

const meta = {
  title: "Páginas/Dinero/Turnos de caja",
  component: ShiftsView,
  decorators: [(Story) => <div className="p-5"><Story /></div>],
  parameters: { layout: "fullscreen", docs: { description: { component: "Turnos de caja del mostrador: quién los abrió, cuánto se esperaba, cuánto se contó y cómo cuadraron." } } },
  args: {
    slug: "demo",
    rows: [
      { id: "t3", terminalName: "Mostrador 1", cashier: "Ana Gómez", openedAt: "2026-11-08T13:00:00.000Z", closedAt: null, opening: 50_000, expected: null, counted: null, difference: null, notes: null },
      { id: "t2", terminalName: "Mostrador 1", cashier: "Luis Pérez", openedAt: "2026-11-07T13:00:00.000Z", closedAt: "2026-11-07T23:00:00.000Z", opening: 50_000, expected: 310_000, counted: 308_500, difference: -1_500, notes: null },
      { id: "t1", terminalName: "Mostrador 1", cashier: "Ana Gómez", openedAt: "2026-11-06T13:00:00.000Z", closedAt: "2026-11-06T23:00:00.000Z", opening: 50_000, expected: 420_000, counted: 420_000, difference: 0, notes: null },
    ],
  },
} satisfies Meta<typeof ShiftsView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ConTurnos: Story = {};
export const SinTurnos: Story = { args: { rows: [] } };
