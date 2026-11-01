import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // lib/ es solo implementación: todas las pruebas viven en tests/
    // (unit/, integration/, architecture/, fixtures/), espejo de lib/<área>/<módulo>.
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
    typecheck: {
      tsconfig: "./tsconfig.json",
    },
  },
});
