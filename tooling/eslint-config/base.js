/**
 * Config base de ESLint del ecosistema Nexus.
 *
 * Se extiende por RUTA RELATIVA desde cada paquete, p. ej.:
 *   "extends": ["../../tooling/eslint-config/base.js"]
 *
 * Por eso este archivo NO es un paquete del workspace: si lo fuera, cada
 * paquete tendría que declarar `@nexus/eslint-config` como devDependency y
 * el versionsado se vuelve un problema por el sake de un archivo de config.
 *
 * QUÉ ABRE ESTA CONFIG
 *   - eslint:recommended (los errores que de verdad muerden: variable sin
 *     usar, unreachable, prototipo sucio...)
 *   - plugin:@typescript-eslint/recommended (tipos, `any`-no-explícito)
 *
 * QUÉ DEJA DE LADO A PROPÓSITO
 *   - reglas de estilo/formatting (lo lleva Prettier, no ESLint)
 *   - reglas de React que no aplican a este código
 */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { node: true, browser: true, es2022: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  ignorePatterns: ["node_modules", "dist", ".next", ".turbo", "storybook-static"],
  rules: {
    // El codebase usa `Number(...)` y casts puntuales; prohibir `any` del
    // todo genera ruido sin valor hasta que haya tipos más finos.
    "@typescript-eslint/no-explicit-any": "warn",
    // Las server actions y los catch de Prisma devuelven null/redirect en vez
    // de lanzar: el caller decide. Los `any` implícitos se perdonan.
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
};
