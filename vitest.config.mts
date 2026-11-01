import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // lib/ guarda las pruebas antiguas junto al código; tests/ es la carpeta
    // centralizada a la que se migran (docs/architecture/plan-migracion-tests.md).
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
    typecheck: {
      tsconfig: "./tsconfig.json",
    },
  },
});
