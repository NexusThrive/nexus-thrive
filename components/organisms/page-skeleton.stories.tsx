import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageSkeleton } from "./page-skeleton";

const meta = {
  title: "Organismos/PageSkeleton",
  component: PageSkeleton,
  args: { variant: "table" },
  argTypes: { variant: { control: "inline-radio", options: ["dashboard", "table", "detail", "form", "profile"] } },
  parameters: { docs: { description: { component: "Precarga con la forma de cada pantalla mientras el servidor responde (loading.tsx de cada módulo)." } } },
} satisfies Meta<typeof PageSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Table: Story = {};
export const Dashboard: Story = { args: { variant: "dashboard" } };
export const Detail: Story = { args: { variant: "detail" } };
export const Form: Story = { args: { variant: "form" } };
export const Profile: Story = { args: { variant: "profile" } };
/** Cajón de aplicaciones de la raíz: saludo y grilla de iconos sobre el fondo de cuadros. */
export const Apps: Story = { args: { variant: "apps", label: "Cargando aplicaciones" }, parameters: { layout: "fullscreen" } };
/** Lista a todo el ancho (Clientes): panel de control de tres zonas y filas de 38 px. */
export const List: Story = { args: { variant: "list", label: "Cargando clientes" }, parameters: { layout: "fullscreen" } };
/** Registro (ficha y alta de cliente): panel de control, tarjetas y columna lateral. */
export const Record: Story = { args: { variant: "record", label: "Cargando cliente" }, parameters: { layout: "fullscreen" } };
/** Tablero por etapas (CRM): columnas de 300 px con encabezado, barra de avance y tarjetas. */
export const Board: Story = { args: { variant: "board", label: "Cargando oportunidades" }, parameters: { layout: "fullscreen" } };
