import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { EXPENSE_CATEGORIES } from "@/lib/finance";
import { ExpenseSheet } from "./expense-sheet";

function Demo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Registrar gasto</Button>
      <ExpenseSheet
        open={open}
        onOpenChange={setOpen}
        categories={EXPENSE_CATEGORIES}
        onSave={async () => {
          await new Promise((r) => setTimeout(r, 800));
          return { ok: true };
        }}
      />
    </>
  );
}

const meta = { title: "Organismos/Finanzas/ExpenseSheet", component: Demo } satisfies Meta<typeof Demo>;
export default meta;

export const Gasto: StoryObj<typeof meta> = {};
