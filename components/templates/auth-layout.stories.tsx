import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SignIn, SignUp } from "@clerk/nextjs";
import { AuthLayout } from "./auth-layout";

const meta = {
  title: "Plantillas/AuthLayout",
  component: AuthLayout,
  args: { children: <SignIn /> },
  argTypes: { children: { control: false } },
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/sign-in" } },
    docs: {
      story: { inline: false, iframeHeight: 720 },
      description: {
        component:
          "Acceso dividido: panel de marca animado a la izquierda (desde 1024 px) y el formulario de Clerk sin tarjeta a la derecha. El modo sale de la URL; en Storybook el formulario es un sustituto estático.",
      },
    },
  },
} satisfies Meta<typeof AuthLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignInDesktop: Story = {};
export const SignUpDesktop: Story = {
  args: { children: <SignUp /> },
  parameters: { nextjs: { navigation: { pathname: "/sign-up" } } },
};
export const Mobile: Story = { globals: { viewport: { value: "mobile1" } } };
