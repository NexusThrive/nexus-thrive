import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
    typecheck: {
      tsconfig: "./tsconfig.json",
    },
  },
});
