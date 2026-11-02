import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de navegador del sistema de diseño (packages/brand/docs/05-calidad/quality-checklist.md).
 *
 * Corren contra el Storybook estático: los componentes compartidos se prueban
 * aislados, sin sesión de Clerk ni base de datos. `pnpm test:e2e` construye
 * Storybook y lo sirve en 6007.
 */
const PORT = 6007;
/** Pruebas responsive (principio 08): solo corren en el proyecto `responsive`. */
const RESPONSIVE = /responsive\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "escritorio", testIgnore: RESPONSIVE, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "movil", testIgnore: RESPONSIVE, use: { ...devices["Pixel 7"] } },
    // Rejilla de viewports de referencia (e2e/viewports.ts): cada prueba fija su propio viewport y su modo táctil.
    { name: "responsive", testMatch: RESPONSIVE, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `pnpm exec vite preview --outDir storybook-static --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/iframe.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
