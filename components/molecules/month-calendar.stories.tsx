import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MonthCalendar } from "./month-calendar";

function Demo(args: React.ComponentProps<typeof MonthCalendar>) {
  const [day, setDay] = useState(args.value);
  return <MonthCalendar {...args} value={day} onChange={setDay} />;
}

const meta = {
  title: "Moléculas/MonthCalendar",
  component: MonthCalendar,
  args: { value: "2026-10-23", today: "2026-10-23", marked: new Set(["2026-10-05", "2026-10-14", "2026-10-23", "2026-10-28"]), onChange: () => {} },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
} satisfies Meta<typeof MonthCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: (args) => <Demo {...args} /> };
