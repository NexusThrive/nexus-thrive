import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EyeTracker } from "./eye-tracker";

/**
 * EyeTracker (de Bencho, MIT): una bola con dos ojos que siguen el cursor. Los ojos están sobre la esfera, no delante: al mirar
 * a un lado la bola gira y el ojo que va al borde se estrecha. Es la cara de AURI AI. Se escribe directo al DOM en cada cuadro
 * (mover el puntero no re-renderiza), se detiene fuera de pantalla y respeta el movimiento reducido.
 */
const meta = {
  title: "Átomos/EyeTracker",
  component: EyeTracker,
  parameters: { layout: "centered" },
  args: { size: 120, shape: "Ball", eyes: "Slant" },
  argTypes: {
    shape: { control: "select", options: ["Ball", "Cube", "Pill", "Circle", "Hexagon", "Hex flat"] },
    eyes: { control: "select", options: ["Slant", "Dots", "Squares"] },
    follow: { control: { type: "range", min: 0, max: 100 } },
    bounce: { control: { type: "range", min: 0, max: 100 } },
  },
} satisfies Meta<typeof EyeTracker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bola: Story = {};
export const Cubo: Story = { args: { shape: "Cube" } };
/** Como marca: ignora el puntero, mira al frente y de vez en cuando echa un vistazo. */
export const Reposo: Story = { args: { idle: true } };
/** Como cara de un botón: sin burbuja, el marco se ajusta a la bola. */
export const ComoBoton: Story = { args: { size: 56, fit: true, poke: false, decorative: true, eyeScale: 1.2 } };
/** Con alegría los ojos se entrecierran y suben, la cara mira hacia arriba y la bola da un saltito. */
export const Alegre: Story = { args: { joy: true, front: true } };
/** Dice un texto en su burbuja, escrito letra a letra; se queda hasta que `say` vuelve a ser null. */
export const Saluda: Story = { args: { joy: true, front: true, poke: false, say: "Hola Santiago!", sayAt: "br" }, decorators: [(Story) => <div className="p-16"><Story /></div>] };
