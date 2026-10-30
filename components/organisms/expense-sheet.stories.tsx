import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { EXPENSE_CATEGORIES } from "@/lib/finance";
import { ExpenseSheet } from "./expense-sheet";

function Demo({ fullHref }: { fullHref?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Registrar gasto</Button>
      <ExpenseSheet
        open={open}
        onOpenChange={setOpen}
        fullHref={fullHref}
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

/** Mini-modal de «Crear»: registra el gasto sin salir de la pantalla y ofrece «Abrir en el panel completo». */
export const MiniModal: StoryObj<typeof meta> = { args: { fullHref: "/gym-norte/finance?nuevo=gasto" } };
