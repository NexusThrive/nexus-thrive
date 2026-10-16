import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SplashIntro } from "./splash-intro";

const meta = {
  title: "Organismos/SplashIntro",
  component: SplashIntro,
  args: { onDone: fn() },
  argTypes: { progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } } },
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 480 },
      description: {
        component:
          "Intro de la app a pantalla completa: la N se traza, se rellena y aparece THRIVE; se retira sola (máx. 9 s). `progress` permite atarla a una carga real.",
      },
    },
  },
} satisfies Meta<typeof SplashIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
