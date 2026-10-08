export type CustomerFormValues = {
  name: string;
  email: string;
  phone: string;
};

export type CustomerFieldErrors = Partial<
  Record<keyof CustomerFormValues, string>
>;

export type CustomerValidation =
  | { ok: true; values: CustomerFormValues }
  | { ok: false; errors: CustomerFieldErrors; values: CustomerFormValues };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9\s\-().]{5,20}$/;

/**
 * Validación de cliente en el servidor (sin dependencias externas).
 * Siempre devuelve los valores leídos para poder repintar el formulario.
 */
export function validateCustomer(formData: FormData): CustomerValidation {
  const values: CustomerFormValues = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim(),
  };

  const errors: CustomerFieldErrors = {};

  if (values.name.length < 2) {
    errors.name = "Ingresa al menos 2 caracteres.";
  } else if (values.name.length > 120) {
    errors.name = "Máximo 120 caracteres.";
  }

  if (values.email.length > 200) {
    errors.email = "Máximo 200 caracteres.";
  } else if (values.email && !EMAIL_PATTERN.test(values.email)) {
    errors.email = "Ingresa un correo válido.";
  }

  if (values.phone && !PHONE_PATTERN.test(values.phone)) {
    errors.phone = "Teléfono no válido (solo dígitos, espacios, +, - y paréntesis).";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  return { ok: true, values };
}
