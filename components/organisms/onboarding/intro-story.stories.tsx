import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IntroDots, IntroStory } from "./intro-story";

const meta = {
  title: "Organismos/Onboarding/IntroStory",
  component: IntroStory,
  decorators: [(Story, ctx) => <div className="grid max-w-[640px] gap-6 p-6"><Story /><IntroDots slide={ctx.args.slide} /></div>],
  args: { slide: 0 },
  argTypes: { slide: { control: { type: "range", min: 0, max: 2, step: 1 } } },
} satisfies Meta<typeof IntroStory>;
export default meta;

export const Problemas: StoryObj<typeof meta> = {};
export const Formula: StoryObj<typeof meta> = { args: { slide: 1 } };
export const Comencemos: StoryObj<typeof meta> = { args: { slide: 2 } };
