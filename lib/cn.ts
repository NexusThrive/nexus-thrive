/**
 * Alias histórico de `@/lib/utils#cn`.
 *
 * El panel tenant lo importa como `@/lib/cn`; los componentes shadcn lo
 * importan como `@/lib/utils`. Ambos resuelven a la misma implementación
 * (clsx + tailwind-merge) para no duplicar lógica.
 */
export { cn } from "./utils";
