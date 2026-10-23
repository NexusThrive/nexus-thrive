import type { Decorator } from "@storybook/nextjs-vite";
import { ToastProvider } from "@/components/molecules/toast";
import { ShellProvider } from "@/components/providers/shell-context";

/** Shell de un negocio de construcción de ejemplo (navegación y acciones). */
export const withShell: Decorator = (Story) => (
  <ShellProvider
    tenantSlug="constructora"
    tenantName="Constructora Andina"
    vertical="construction"
    activeModules={["dashboard", "crm", "construction", "finance"]}
  >
    <ToastProvider>
      <Story />
    </ToastProvider>
  </ShellProvider>
);
