/**
 * Acceso a NEXUS: códigos promocionales (regalo) y códigos de acceso pagado.
 *
 * Lógica PURA y probada: normalización del código, generación, estado y el
 * texto que ve la persona. El acceso a datos vive en `benefits-db.ts`.
 */

/** Alfabeto sin caracteres ambiguos (0/O, 1/I/L) para leer en la tarjeta. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type BenefitStatus = "active" | "inactive" | "expired" | "exhausted";

/**
 * `PROMO` = regalo/promoción (la persona ve "N días gratis").
 * `PAID` = acceso pagado confirmado por NEXUS (la persona ve "cuenta
 * activada"); el canje es idéntico, solo cambia el texto.
 */
export type BenefitKind = "PROMO" | "PAID";

export function normalizeBenefitKind(raw: unknown): BenefitKind {
  return raw === "PAID" ? "PAID" : "PROMO";
}

/** Normaliza lo que llega por la URL: sin espacios, en mayúsculas, A-Z0-9-\. */
export function normalizeBenefitCode(raw: string): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toUpperCase()
    .slice(0, 32);
}

/** Genera un código legible único en apariencia (el @unique es la garantía). */
export function generateBenefitCode(length = 8): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

/** Estado de un código en un instante dado. */
export function benefitStatus(
  row: { active: boolean; expiresAt: string | null; usedCount: number; maxUses: number | null },
  nowMs: number,
): BenefitStatus {
  if (!row.active) return "inactive";
  if (row.expiresAt && Date.parse(row.expiresAt) <= nowMs) return "expired";
  if (row.maxUses != null && row.usedCount >= row.maxUses) return "exhausted";
  return "active";
}

/** Fin del beneficio: inicio + duración en días (30 = un mes). */
export function benefitEndMs(startMs: number, durationDays: number): number {
  return startMs + Math.max(1, Math.floor(durationDays)) * 86_400_000;
}

/** Mensaje legible del estado (para la página pública / panel). */
export function benefitStatusMessage(status: BenefitStatus): string {
  switch (status) {
    case "inactive":
      return "Este beneficio ya no está disponible.";
    case "expired":
      return "Este beneficio venció.";
    case "exhausted":
      return "Este beneficio ya alcanzó su límite de canjes.";
    default:
      return "";
  }
}

/**
 * Textos del acceso según el tipo de código. El canje es el mismo; lo que
 * cambia es lo que la persona lee: un regalo se anuncia como "gratis" y un
 * acceso pagado se anuncia como "cuenta activada" (nunca "gratis").
 */
export function benefitCopy(
  kind: BenefitKind,
  input: { planName: string; durationDays: number },
): { title: string; subtitle: string; badge: string; review: string; cta: string } {
  const days = Math.max(1, Math.floor(input.durationDays));
  if (kind === "PAID") {
    return {
      title: "Cuenta NEXUS activada",
      subtitle: `Acceso pagado · ${days} días · plan Thrive ${input.planName}`,
      badge: "Acceso pagado",
      review: `Activo durante ${days} días · pago confirmado`,
      cta: "Entrar con mi código",
    };
  }
  return {
    title: `${days} días gratis de Thrive ${input.planName}`,
    subtitle: `Beneficio de tu tarjeta NEXUS · ${days} días`,
    badge: "Regalo",
    review: `Gratis durante ${days} días · beneficio de tu tarjeta`,
    cta: "Entrar con mi código",
  };
}
