import { headers } from "next/headers";
import { allowAttempt, recordAttempt } from "@/lib/foundation/rate-limit";
import { registerPublicCustomer, registrationTenant, type PublicCustomerInput } from "@/lib/business/customers/registration-db";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type RegistrationFieldErrors = Partial<Record<keyof PublicCustomerInput | "consent", string>>;

export type RegistrationActionResult =
  | { ok: true; alreadyRegistered: boolean; name: string }
  | { ok: false; message: string; errors?: RegistrationFieldErrors };

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Alta desde el enlace público del gimnasio. No crea membresías ni cobros:
 * solo guarda al cliente para que el personal lo contacte. Se limita por IP y
 * nunca confía en el negocio que manda el navegador.
 */
/** Lógica del alta pública; la expone `POST /api/registro/<negocio>` (sin recargar el árbol de la página). */
export async function registerCustomerAction(slug: string, input: PublicCustomerInput & { consent: boolean }): Promise<RegistrationActionResult> {
  const tenant = await registrationTenant(slug);
  if (!tenant) return { ok: false, message: "El registro no está disponible en este momento." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "desconocida";
  const key = `registro:${slug}:${ip}`;
  if (!allowAttempt(key, 8)) {
    return { ok: false, message: "Hiciste varios intentos seguidos. Espera unos minutos o comunícate con el gimnasio." };
  }
  recordAttempt(key, 8);

  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  const documentId = input.documentId.trim();
  const birthDate = input.birthDate.trim();
  const city = input.city.trim();
  const errors: RegistrationFieldErrors = {};

  if (name.length < 2 || name.length > 120) errors.name = "Escribe tu nombre completo.";
  if (digits(phone).length < 7 || digits(phone).length > 15) errors.phone = "Escribe un teléfono válido.";
  if (email && !EMAIL.test(email)) errors.email = "Ese correo no parece válido.";
  if (!documentId) errors.documentId = "Escribe tu documento.";
  else if (documentId.length > 40) errors.documentId = "El documento es demasiado largo.";
  if (birthDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (!DATE.test(birthDate) || birthDate > today || birthDate < "1900-01-01") errors.birthDate = "Fecha de nacimiento no válida.";
  }
  if (city.length > 80) errors.city = "La ciudad es demasiado larga.";
  if (!input.consent) errors.consent = "Acepta el uso de tus datos para continuar.";

  if (Object.keys(errors).length) return { ok: false, message: "Revisa los campos marcados.", errors };

  const result = await registerPublicCustomer(tenant.id, { name, phone, email, documentId, birthDate, city });
  if (!result.ok) return result;
  return { ok: true, alreadyRegistered: result.alreadyRegistered, name };
}
