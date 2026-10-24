import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "Moléculas/Card",
  component: Card,
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Composición completa: cabecera con acción, contenido y pie. */
export const Complete: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <div>
          <CardTitle>Torre Calle 80</CardTitle>
          <CardDescription>OB-2026-014 · Bogotá</CardDescription>
        </div>
        <CardAction>
          <Button size="sm" variant="outline">Abrir</Button>
        </CardAction>
      </CardHeader>
      <CardContent className="mt-4 text-sm text-muted-foreground">
        Presupuesto contratado por $ 1.284.500.000 con línea base del 2 de octubre.
      </CardContent>
      <CardFooter className="mt-4">
        <Button size="sm">Ver presupuesto</Button>
        <Button size="sm" variant="ghost">Informe Cero</Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: (args) => (
    <Card {...args}>
      <CardTitle>Sin sombra, borde de 1 px</CardTitle>
      <CardDescription className="mt-1">La altura se ajusta al contenido.</CardDescription>
    </Card>
  ),
};

/** `interactive`: toda la tarjeta es accionable; se eleva 2 px con puntero fino y se hunde al presionar. */
export const Interactive: Story = {
  args: { interactive: true },
  render: (args) => (
    <Card {...args}>
      <CardTitle>Torre Calle 80</CardTitle>
      <CardDescription>Pasa el puntero por encima</CardDescription>
    </Card>
  ),
};
