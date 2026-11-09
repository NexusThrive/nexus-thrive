/** Tipos de filtro y orden de Contactos (la URL guarda `status` y `sort`). El panel de control vive en `customer-toolbar.tsx`. */
export type CustomerStatus = "active" | "archived";
export type CustomerSort = "recent" | "name_asc" | "name_desc";
