/**
 * Clases de las tablas del Inicio del Operations Center: las mismas de la tabla de Clientes del negocio
 * (`app/[tenant]/(app)/contactos/_components/customer-table.tsx`): cabecera de 48 px en gris 12 px, filas de 54 px separadas por
 * líneas suaves, toda la fila resalta al pasar el puntero y la primera y última columna llevan el margen de la tarjeta.
 */
export const opsTable = {
  wrap: "hidden overflow-x-auto sm:block",
  table: "w-full table-auto text-left text-sm",
  head: "border-b border-border/50 text-xs font-medium text-muted-foreground",
  headRow: "h-12",
  th: "whitespace-nowrap px-3 font-medium first:ps-5 last:pe-5",
  body: "divide-y divide-border/50",
  row: "group h-[54px] cursor-pointer transition-colors hover:bg-surface-muted",
  td: "px-3 first:ps-5 last:pe-5",
  /** Lista del celular, como la de Clientes. */
  list: "grid gap-2 px-4 pb-4 sm:hidden",
  item: "rounded-lg border border-border bg-card p-4",
} as const;
