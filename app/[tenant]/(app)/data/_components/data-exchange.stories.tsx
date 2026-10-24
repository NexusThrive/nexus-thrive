import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import DataExchange from "./data-exchange";

const meta = {
  title: "Páginas/Sistema/Importar y exportar",
  component: DataExchange,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Función base del sistema: sube clientes y catálogo desde Excel/CSV, revisa el archivo (nuevos, actualizados, sin cambios y errores por fila) antes de guardar, y descarga plantillas o copias. Reimportar es idempotente. Las acciones son de muestra en Storybook: un archivo con «limpio» en el nombre no trae errores; con «malo», falla por columnas." } } },
  args: { slug: "demo" },
} satisfies Meta<typeof DataExchange>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
