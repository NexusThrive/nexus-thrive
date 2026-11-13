import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SettingsRow, SettingsSection } from "./settings-section";

const meta = {
  title: "Moléculas/SettingsSection",
  component: SettingsSection,
  args: { id: "perfil", title: "Perfil del negocio", description: "Cómo te ven tus clientes en recibos y mensajes.", canManage: true, onEdit: () => undefined, children: null },
  argTypes: { children: { control: false }, onEdit: { control: false } },
  parameters: {
    docs: { description: { component: "Bloque de Configuración en modo lectura: título, descripción y filas etiqueta-valor. «Modificar» solo aparece si la persona puede gestionar y hay `onEdit`; un dato vacío dice «Sin completar» en lugar de dejar un hueco." } },
  },
  decorators: [(Story) => <div style={{ maxWidth: 720 }}><Story /></div>],
} satisfies Meta<typeof SettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = (
  <>
    <SettingsRow label="Nombre comercial" value="Barbería El Corte" />
    <SettingsRow label="NIT" value="900.123.456-7" />
    <SettingsRow label="Ciudad" value="Cartagena" />
    <SettingsRow label="Correo de contacto" value="hola@elcorte.co" />
  </>
);

/** Con permiso para gestionar: aparece «Modificar». */
export const Gestionable: Story = { render: (args) => <SettingsSection {...args}>{rows}</SettingsSection> };

/** Solo lectura: sin permiso o sin acción, el bloque es informativo. */
export const SoloLectura: Story = { args: { canManage: false }, render: (args) => <SettingsSection {...args}>{rows}</SettingsSection> };

/** Datos que faltan: cada fila vacía dice «Sin completar». */
export const ConDatosPendientes: Story = {
  render: (args) => (
    <SettingsSection {...args}>
      <SettingsRow label="Nombre comercial" value="Barbería El Corte" />
      <SettingsRow label="NIT" value="" />
      <SettingsRow label="Ciudad" value={null} />
    </SettingsSection>
  ),
};
