import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import { buttonVariants } from "@/components/atoms/button-variants";
import { getVerticalTerms } from "@/lib/core/sectors/terms";
import { VerticalTermsProvider } from "../../vertical-terms-context";
import CustomerQuickCreate from "./customer-quick-create";

/** Como en la pantalla: un botón abre el alta; la historia no la deja abierta. */
function QuickCreateDemo({ fullHref }: { fullHref?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-3">
      <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ size: "sm" })}>
        Nuevo cliente
      </button>
      {open ? <CustomerQuickCreate tenantSlug="demo" onClose={() => setOpen(false)} fullHref={fullHref} /> : null}
    </div>
  );
}

const meta = {
  title: "Páginas/Ventas/Nuevo cliente (alta rápida)",
  component: QuickCreateDemo,
  decorators: [withShell, (Story) => <VerticalTermsProvider terms={getVerticalTerms("retail")}><Story /></VerticalTermsProvider>],
  parameters: {
    layout: "padded",
    docs: { description: { component: "Alta rápida de un cliente: nombre, WhatsApp y correo. Es un modal distinto de la ficha completa (cada tipo de alta tiene su propio formulario). Tras crear, abre la ficha para completar el resto. Las acciones son de muestra en Storybook." } },
  },
  args: { fullHref: "/demo/crm" },
} satisfies Meta<typeof QuickCreateDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
