import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { LEGACY_DB_ACCESS } from "./eslint/legacy-db-access.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Convención del repo: parámetros con "_" son obligatorios por firma
    // (p. ej. prevState/formData de useActionState) pero no se usan.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // ARCH-04: app/ no importa la base; usa los repositorios de lib/.
    files: ["app/**/*.{ts,tsx}"],
    // Rutas literales: `[tenant]` y `(app)` no son comodines del glob.
    ignores: LEGACY_DB_ACCESS.map((path) => path.replace(/[[\]()]/g, "\\$&")),
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/prisma/db",
              message:
                "Las pantallas y acciones no consultan la base directo: usa (o crea) un repositorio en lib/ que reciba el contexto del negocio (ARCH-04).",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefactos generados por Prisma (contract emit / migration plan).
    "generated/**",
    "migrations/**",
    "prisma/contract.d.ts",
    // Skills de agentes, fuera de la app.
    ".agents/**",
    ".claude/**",
    // Build estático de Storybook.
    "storybook-static/**",
  ]),
]);

export default eslintConfig;
