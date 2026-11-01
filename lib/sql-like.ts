/**
 * Escapa los comodines de `LIKE`/`ILIKE` (`\`, `%` y `_`) para que una búsqueda
 * escrita por una persona se interprete de forma literal.
 *
 * Utilidad de Foundation: no depende de ningún dominio. La usan los
 * repositorios de Core, de Business y de las industrias.
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}
