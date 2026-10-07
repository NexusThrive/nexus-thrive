/**
 * Une clases de Tailwind ignorando los valores falsy.
 * Utilidad local: evita agregar dependencias extra (clsx, etc.).
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
