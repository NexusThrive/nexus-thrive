/**
 * Alta completa de un cliente (vista «Nuevo cliente»), reglas puras: opciones de los campos y validación. Solo el nombre es
 * obligatorio; el correo y el teléfono se validan si se escriben.
 */
export const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "NIT", label: "NIT" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PASSPORT", label: "Pasaporte" },
] as const;

export const CUSTOMER_SOURCES = [
  { value: "", label: "Sin especificar" },
  { value: "Recomendación", label: "Recomendación" },
  { value: "Instagram", label: "Instagram" },
  { value: "Sitio web", label: "Sitio web" },
  { value: "WhatsApp", label: "WhatsApp" },
] as const;

export const TAX_RESPONSIBILITIES = [
  { value: "R-99-PN", label: "No responsable de IVA" },
  { value: "O-48", label: "Responsable de IVA" },
] as const;

export const COUNTRIES = [
  { value: "CO", label: "Colombia" },
  { value: "EC", label: "Ecuador" },
  { value: "PE", label: "Perú" },
  { value: "VE", label: "Venezuela" },
  { value: "PA", label: "Panamá" },
  { value: "MX", label: "México" },
  { value: "US", label: "Estados Unidos" },
  { value: "ES", label: "España" },
] as const;

export type NewCustomerInput = {
  kind: "PERSON" | "COMPANY";
  name: string;
  phone: string;
  email: string;
  documentType: string;
  documentNumber: string;
  address: string;
  city: string;
  region: string;
  country: string;
  tags: string;
  source: string;
  notes: string;
  invoiceEmail: string;
  taxResponsibility: string;
};

export const EMPTY_NEW_CUSTOMER: NewCustomerInput = {
  kind: "PERSON",
  name: "",
  phone: "",
  email: "",
  documentType: "CC",
  documentNumber: "",
  address: "",
  city: "",
  region: "",
  country: "CO",
  tags: "",
  source: "",
  notes: "",
  invoiceEmail: "",
  taxResponsibility: "",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Solo los dígitos del teléfono (sin el +57, que se muestra aparte). */
export const phoneDigits = (phone: string) => phone.replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");

/** Documento sin puntos, guiones ni espacios. */
export const cleanDocument = (doc: string) => doc.replace(/[.\-\s]/g, "").toUpperCase();

/** Errores por campo, o un objeto vacío si se puede guardar. */
export function validateNewCustomer(input: NewCustomerInput): Partial<Record<keyof NewCustomerInput, string>> {
  const errors: Partial<Record<keyof NewCustomerInput, string>> = {};
  if (input.name.trim().length < 2) errors.name = "Escribe el nombre del cliente";
  else if (input.name.trim().length > 120) errors.name = "El nombre es muy largo (máximo 120 caracteres).";
  const digits = phoneDigits(input.phone);
  if (input.phone.trim() && digits.length !== 10) errors.phone = "El teléfono debe tener 10 dígitos.";
  if (input.email.trim() && !EMAIL.test(input.email.trim())) errors.email = "Revisa el correo electrónico.";
  if (input.invoiceEmail.trim() && !EMAIL.test(input.invoiceEmail.trim())) errors.invoiceEmail = "Revisa el correo para facturas.";
  if (!DOCUMENT_TYPES.some((d) => d.value === input.documentType)) errors.documentType = "Elige un tipo de documento.";
  if (input.taxResponsibility && !TAX_RESPONSIBILITIES.some((t) => t.value === input.taxResponsibility)) errors.taxResponsibility = "Elige una responsabilidad fiscal.";
  if (!COUNTRIES.some((c) => c.value === input.country)) errors.country = "Elige un país.";
  return errors;
}
