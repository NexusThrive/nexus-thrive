import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AccountButton } from "./account-button";

const meta = {
  title: "Moléculas/AccountButton",
  component: AccountButton,
  args: { showName: false, compact: false },
  parameters: {
    docs: { description: { component: "Menú de la cuenta (Clerk). Clerk solo monta en el navegador, así que hasta hidratar se pinta un hueco del mismo tamaño para evitar el salto de diseño. `showName` pone el nombre junto al avatar (la hoja «Más» del móvil); `compact` usa el avatar de 28 px de la barra de módulo. En Storybook, Clerk es un sustituto sin sesión (`.storybook/mocks/clerk.tsx`)." } },
  },
} satisfies Meta<typeof AccountButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Avatar de 28 px, el de la barra superior de un módulo. */
export const Compacto: Story = { args: { compact: true } };

/** Con el nombre al lado, como en la hoja «Más» del móvil. */
export const ConNombre: Story = { args: { showName: true } };
