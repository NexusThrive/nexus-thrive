/** Tipos de documento (puro: lo usan formularios en el navegador). */
export const DOCUMENT_TYPES = ["CC", "NIT", "CE", "PASAPORTE", "TI", "RC", "NIT_EXTRANJERO"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
