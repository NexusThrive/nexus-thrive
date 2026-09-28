import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest del portal.
 *
 * Solo Node (sin DOM): lo que se prueba aquí son las consultas a la base y el
 * formato de dinero, no los componentes. Los componentes se cubren con Playwright
 * (issue #19), que sí necesita navegador.
 *
 * El alias `@/` replica el `paths` del tsconfig para que los imports de los
 * archivos bajo prueba no cambien al probarlos.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
