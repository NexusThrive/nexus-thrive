import path from "node:path";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: [
    "../components/docs/**/*.mdx",
    "../components/**/*.stories.tsx",
  ],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  staticDirs: ["../public"],
  async viteFinal(viteConfig) {
    viteConfig.resolve ??= {};
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias as Record<string, string> | undefined),
      // Clerk exige sesión real; en Storybook basta un avatar de muestra.
      "@clerk/nextjs": path.resolve(import.meta.dirname, "mocks/clerk.tsx"),
      "@nexus/brand": path.resolve(import.meta.dirname, "../packages/brand/src"),
      "@": path.resolve(import.meta.dirname, ".."),
    };
    return viteConfig;
  },
};

export default config;
