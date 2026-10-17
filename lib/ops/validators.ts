/** Validaciones del Operations Center (puras, compartidas por cliente y servidor). */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;
export type Validation<T, K extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<K> };

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateInvite(raw: { email?: unknown; name?: unknown; title?: unknown; roleId?: unknown }): Validation<
  { email: string; name: string | null; title: string | null; roleId: string },
  "email" | "name" | "title" | "roleId"
> {
  const errors: FieldErrors<"email" | "name" | "title" | "roleId"> = {};
  const email = clean(raw.email).toLowerCase();
  const name = clean(raw.name);
  const title = clean(raw.title);
  const roleId = clean(raw.roleId);
  if (!EMAIL.test(email)) errors.email = "Escribe un correo válido, por ejemplo nombre@dominio.com.";
  if (name.length > 80) errors.name = "Máximo 80 caracteres.";
  if (title.length > 60) errors.title = "Máximo 60 caracteres.";
  if (!roleId) errors.roleId = "Elige un rol.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { email, name: name || null, title: title || null, roleId } };
}

/** "Soporte nocturno" → "soporte-nocturno" (clave estable del rol). */
export function roleKeyFrom(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function validateRole(raw: { name?: unknown; description?: unknown; permissions?: unknown }): Validation<
  { name: string; description: string | null; permissions: string[] },
  "name" | "description" | "permissions"
> {
  const errors: FieldErrors<"name" | "description" | "permissions"> = {};
  const name = clean(raw.name);
  const description = clean(raw.description);
  const permissions = Array.isArray(raw.permissions) ? raw.permissions.filter((p): p is string => typeof p === "string") : [];
  if (name.length < 2 || name.length > 40) errors.name = "El nombre del rol debe tener entre 2 y 40 caracteres.";
  else if (!roleKeyFrom(name)) errors.name = "Usa letras o números en el nombre.";
  if (description.length > 200) errors.description = "Máximo 200 caracteres.";
  if (permissions.length === 0) errors.permissions = "Marca al menos un permiso.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, description: description || null, permissions } };
}

export const CONTACT_PURPOSES = ["Dueño", "Administrativo", "Técnico", "Comercial", "Facturación", "Otro"] as const;
export const CONTACT_CHANNELS = ["WhatsApp", "Llamada", "Correo"] as const;

export function validateContact(raw: Record<string, unknown>): Validation<
  {
    name: string;
    purpose: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    preferredChannel: string | null;
    hours: string | null;
    notes: string | null;
  },
  "name" | "purpose" | "phone" | "email" | "contact"
> {
  const errors: FieldErrors<"name" | "purpose" | "phone" | "email" | "contact"> = {};
  const name = clean(raw.name);
  const purpose = clean(raw.purpose);
  const phone = clean(raw.phone).replace(/[^\d+ ]/g, "");
  const whatsapp = clean(raw.whatsapp).replace(/[^\d+ ]/g, "");
  const email = clean(raw.email).toLowerCase();
  const channel = clean(raw.preferredChannel);
  if (name.length < 2 || name.length > 80) errors.name = "Escribe el nombre (2 a 80 caracteres).";
  if (!(CONTACT_PURPOSES as readonly string[]).includes(purpose)) errors.purpose = "Elige para qué sirve este contacto.";
  if (email && !EMAIL.test(email)) errors.email = "Correo no válido.";
  if (phone && phone.replace(/\D/g, "").length < 7) errors.phone = "Teléfono incompleto.";
  if (!phone && !whatsapp && !email) errors.contact = "Agrega al menos un teléfono, WhatsApp o correo.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      purpose,
      phone: phone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      preferredChannel: (CONTACT_CHANNELS as readonly string[]).includes(channel) ? channel : null,
      hours: clean(raw.hours).slice(0, 80) || null,
      notes: clean(raw.notes).slice(0, 300) || null,
    },
  };
}
