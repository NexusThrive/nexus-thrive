import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AuthBrandPanel } from "./auth-brand-panel";

const meta = {
  title: "Organismos/AuthBrandPanel",
  component: AuthBrandPanel,
  args: { mode: "sign-in" },
  argTypes: { mode: { control: "inline-radio", options: ["sign-in", "sign-up"] } },
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 720 },
      description: {
        component:
          "Cambia `mode` en los controles para ver la transición: el tramo oro recorre la N, el titular entra letra por letra y la vista previa cambia (ingresos que cuentan ↔ pasos que se marcan).",
      },
    },
  },
  decorators: [(Story) => <div className="grid min-h-screen grid-cols-[minmax(0,620px)]"><Story /></div>],
} satisfies Meta<typeof AuthBrandPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignIn: Story = {};
export const SignUp: Story = { args: { mode: "sign-up" } };
