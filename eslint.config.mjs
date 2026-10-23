import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // ARCH-04: app/ no importa la base ni abre transacciones; usa los
    // repositorios de lib/ (con tenantId, permisos, servicio de dinero y
    // bitácora). Sin excepciones desde 2026-10-23.
    files: ["app/**/*.{ts,tsx}"],
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
            {
              name: "@/lib/business/money-service",
              importNames: ["moneyTransaction"],
              message:
                "Las transacciones de dinero viven en lib/ (un repositorio que llama a moneyTransaction); app/ llama a esa función.",
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
