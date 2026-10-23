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
