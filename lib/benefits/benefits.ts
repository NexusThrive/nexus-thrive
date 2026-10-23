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

// --- Contrato a medida (PENDIENTES §3) ----------------------------------------

/** Lo acordado con un cliente en su código. Todo opcional. */
export type ContractTerms = {
  /** Precio mensual en centavos de USD; null = sin precio (regalo o plan normal). */
  priceUsdCents: number | null;
  /** Módulos exactos; vacío = los del plan. */
  modules: string[];
  maxUsers: number | null;
  maxCustomers: number | null;
};

export const NO_CONTRACT: ContractTerms = { priceUsdCents: null, modules: [], maxUsers: null, maxCustomers: null };

/** Tope de precio mensual que se acepta en un código: 10.000 USD. */
export const MAX_PRICE_USD_CENTS = 1_000_000;

/**
 * Valida y normaliza los términos que escribe el equipo en el panel. Los
 * campos vacíos quedan en null (o lista vacía); un módulo que no existe o un
 * número fuera de rango es un error con el campo que lo causó.
 */
export function validateContractTerms(
  raw: { price?: string | null; modules?: readonly string[]; maxUsers?: string | null; maxCustomers?: string | null },
  isModule: (value: string) => boolean,
): { ok: true; value: ContractTerms } | { ok: false; field: keyof ContractTerms; message: string } {
  const priceText = (raw.price ?? "").trim().replace(/[$\s]/g, "").replace(",", ".");
  let priceUsdCents: number | null = null;
  if (priceText) {
    const usd = Number(priceText);
    if (!Number.isFinite(usd) || usd < 0) return { ok: false, field: "priceUsdCents", message: "Escribe el precio mensual en dólares (por ejemplo 39 o 39.90)." };
    priceUsdCents = Math.round(usd * 100);
    if (priceUsdCents > MAX_PRICE_USD_CENTS) return { ok: false, field: "priceUsdCents", message: "El precio mensual no puede pasar de 10.000 USD." };
  }

  const modules = [...new Set((raw.modules ?? []).map((m) => m.trim()).filter(Boolean))];
  const unknown = modules.find((m) => !isModule(m));
  if (unknown) return { ok: false, field: "modules", message: `El módulo «${unknown}» no existe.` };

  const limit = (text: string | null | undefined, field: "maxUsers" | "maxCustomers", label: string) => {
    const t = (text ?? "").trim();
    if (!t) return { ok: true as const, value: null };
    const n = Number(t);
    if (!Number.isInteger(n) || n < 1 || n > 1_000_000) return { ok: false as const, field, message: `${label}: un número entero desde 1.` };
    return { ok: true as const, value: n };
  };
  const users = limit(raw.maxUsers, "maxUsers", "Máximo de usuarios");
  if (!users.ok) return users;
  const customers = limit(raw.maxCustomers, "maxCustomers", "Máximo de clientes");
  if (!customers.ok) return customers;

  return { ok: true, value: { priceUsdCents, modules, maxUsers: users.value, maxCustomers: customers.value } };
}

/**
 * Qué deja el canje de un código en el negocio:
 * - módulos: los del código si los tiene (siempre con el Inicio); si no, los
 *   del plan;
 * - suscripción: con precio, ACTIVA con ese precio (es un contrato y aparece
 *   en Facturación); sin precio, PRUEBA gratis que vence sola;
 * - límites: los del código (null = los del plan).
 */
export function redemptionTerms(terms: ContractTerms, planModules: readonly string[]) {
  const modules = terms.modules.length > 0 ? [...new Set(["dashboard", ...terms.modules])] : [...planModules];
  const paid = terms.priceUsdCents != null && terms.priceUsdCents > 0;
  return {
    modules,
    subscriptionStatus: paid ? ("ACTIVE" as const) : ("TRIAL" as const),
    priceUsdCents: paid ? terms.priceUsdCents! : 0,
    maxUsers: terms.maxUsers,
    maxCustomers: terms.maxCustomers,
  };
}

/** ¿Se puede agregar uno más? `null` = sin límite propio. */
export function withinLimit(limit: number | null, used: number): boolean {
  return limit == null || used < limit;
}
