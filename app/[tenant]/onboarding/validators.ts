import {
  isPaymentMethod,
  isVertical,
  PAYMENT_METHODS,
  type PaymentMethodValue,
  type VerticalValue,
} from "@/lib/admin-catalogs";

/**
 * Validación del wizard de onboarding. Se ejecuta en el cliente (feedback
 * rápido) y OBLIGATORIAMENTE en el servidor: nunca se confía en el navegador.
 *
 * Un archivo shared (sin "use server") para que los componentes de paso
 * puedan pre-validar y las Server Actions re-validar con las mismas reglas.
 */

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export type CustomerRow = { name: string; phone: string; email: string };

export type OnboardingFieldErrors = Partial<
  Record<string, string> & {
    customers?: string;
    paymentMethods?: string;
    vertical?: string;
  }
>;

export type StepValidation<T> =
  | { ok: true; values: T }
  | { ok: false; errors: OnboardingFieldErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Teléfono: dígitos, espacios, +, - y paréntesis (5–20). */
const PHONE_PATTERN = /^\+?[0-9\s\-().]{5,20}$/;
/** Handle de Instagram sin @: letras, números, punto, guión bajo. */
const INSTAGRAM_PATTERN = /^[A-Za-z0-9._]{1,30}$/;

/** Normaliza una URL opcional: agrega https:// si falta el esquema. */
function normalizeOptionalUrl(raw: string): {
  ok: true;
  value: string;
} | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: "" };
  }
  if (trimmed.length > 200) {
    return { ok: false, error: "Máximo 200 caracteres." };
  }

  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Solo se permiten URLs http/https." };
    }
    return { ok: true, value: parsed.toString() };
  } catch {
    return { ok: false, error: "Ingresa una URL válida." };
  }
}

function cleanPhone(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const phone = raw.trim();
  if (!phone) {
    return { ok: false, error: "Ingresa el número." };
  }
  if (!PHONE_PATTERN.test(phone)) {
    return {
      ok: false,
      error: "Teléfono no válido (solo dígitos, espacios, +, - y paréntesis).",
    };
  }
  return { ok: true, value: phone };
}

/** Paso 1 — Identidad del negocio y ubicación. */
export function validateStep1(formData: FormData): StepValidation<{
  name: string;
  city: string;
  whatsappNumber: string;
}> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    whatsappNumber: String(formData.get("whatsappNumber") ?? "").trim(),
  };
  const errors: OnboardingFieldErrors = {};

  if (values.name.length < 2) {
    errors.name = "Ingresa al menos 2 caracteres.";
  } else if (values.name.length > 80) {
    errors.name = "Máximo 80 caracteres.";
  }

  if (values.city.length < 2) {
    errors.city = "Ingresa la ciudad o región.";
  } else if (values.city.length > 60) {
    errors.city = "Máximo 60 caracteres.";
  }

  const phone = cleanPhone(values.whatsappNumber);
  if (!phone.ok) {
    errors.whatsappNumber = phone.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, values };
}

/** Paso 2 — Vertical (siempre validada contra el catálogo de la plataforma). */
export function validateStep2(formData: FormData): StepValidation<{
  vertical: VerticalValue;
}> {
  const raw = String(formData.get("vertical") ?? "");
  if (!isVertical(raw)) {
    return { ok: false, errors: { vertical: "Selecciona una vertical válida." } };
  }
  return { ok: true, values: { vertical: raw } };
}

/** Paso 3 — Ecosistema digital (URLs opcionales validadas). */
export function validateStep3(formData: FormData): StepValidation<{
  websiteUrl: string;
  googleBusinessUrl: string;
  instagramHandle: string;
}> {
  const rawWebsite = String(formData.get("websiteUrl") ?? "");
  const rawGoogle = String(formData.get("googleBusinessUrl") ?? "");
  const rawInstagram = String(formData.get("instagramHandle") ?? "");

  const errors: OnboardingFieldErrors = {};

  const website = normalizeOptionalUrl(rawWebsite);
  if (!website.ok) {
    errors.websiteUrl = website.error;
  }

  const google = normalizeOptionalUrl(rawGoogle);
  if (!google.ok) {
    errors.googleBusinessUrl = google.error;
  }

  let instagram = rawInstagram.trim();
  if (instagram) {
    instagram = instagram.replace(/^@/, "").trim();
    if (!INSTAGRAM_PATTERN.test(instagram)) {
      errors.instagramHandle =
        "Handle no válido (letras, números, punto y guión bajo).";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    values: {
      websiteUrl: website.ok ? website.value : "",
      googleBusinessUrl: google.ok ? google.value : "",
      instagramHandle: instagram,
    },
  };
}

/** Paso 4 — Métodos de pago (se requiere al menos uno del catálogo). */
export function validateStep4(formData: FormData): StepValidation<{
  paymentMethods: PaymentMethodValue[];
}> {
  const rawMethods = formData.getAll("paymentMethods").map(String);
  const seen = new Set<string>();
  const methods: PaymentMethodValue[] = [];

  for (const raw of rawMethods) {
    if (!isPaymentMethod(raw)) {
      return {
        ok: false,
        errors: { paymentMethods: "Método de pago no válido." },
      };
    }
    if (!seen.has(raw)) {
      seen.add(raw);
      methods.push(raw);
    }
  }

  if (methods.length === 0) {
    return {
      ok: false,
      errors: { paymentMethods: "Selecciona al menos un método de pago." },
    };
  }

  return { ok: true, values: { paymentMethods: methods } };
}

/** Paso 5 — Clientes iniciales opcionales (máx. 3, dedupe en lote). */
export function validateCustomers(formData: FormData): StepValidation<{
  customers: CustomerRow[];
}> {
  const names = formData.getAll("customerName").map((v) => String(v).trim());
  const phones = formData.getAll("customerPhone").map((v) => String(v).trim());
  const emails = formData.getAll("customerEmail").map((v) => String(v).trim().toLowerCase());

  const rowsRaw = names.map((name, index) => ({
    name,
    phone: phones[index] ?? "",
    email: emails[index] ?? "",
    empty: !name && !phones[index] && !emails[index],
  }));

  const rows = rowsRaw.filter((row) => !row.empty);

  if (rows.length > 3) {
    return {
      ok: false,
      errors: { customers: "Máximo 3 clientes iniciales." },
    };
  }

  const errors: OnboardingFieldErrors = {};
  const seenPhone = new Set<string>();
  const seenEmail = new Set<string>();
  const customers: CustomerRow[] = [];

  for (const row of rows) {
    const phone = cleanPhone(row.phone);
    if (!phone.ok) {
      errors.customers = "Revisa el teléfono de los clientes.";
      break;
    }

    if (row.name.length < 2) {
      errors.customers = "Cada cliente necesita un nombre (mín. 2 caracteres).";
      break;
    } else if (row.name.length > 120) {
      errors.customers = "Nombre de cliente demasiado largo.";
      break;
    }

    if (row.email) {
      if (row.email.length > 200) {
        errors.customers = "Correo de cliente demasiado largo.";
        break;
      }
      if (!EMAIL_PATTERN.test(row.email)) {
        errors.customers = "Ingresa un correo válido en los clientes.";
        break;
      }
    }

    const phoneKey = phone.value.replace(/[\s\-().]/g, "");
    const emailKey = row.email || "";
    if (
      seenPhone.has(phoneKey) ||
      (emailKey && seenEmail.has(emailKey))
    ) {
      // Duplicado dentro del lote: se ignora silenciosamente.
      continue;
    }
    seenPhone.add(phoneKey);
    if (emailKey) {
      seenEmail.add(emailKey);
    }

    customers.push({ name: row.name, phone: phone.value, email: row.email });
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, values: { customers } };
}

/** Constante para el UI (máximo de clientes iniciales). */
export const MAX_INITIAL_CUSTOMERS = 3;
export const ONBOARDING_PAYMENT_METHODS = PAYMENT_METHODS;