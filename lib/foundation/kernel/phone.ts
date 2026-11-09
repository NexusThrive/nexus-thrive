/**
 * Teléfonos colombianos y reglas para decidir si dos contactos son la misma persona (HU-contacto-unico-01). Puro, sin base de datos.
 * El teléfono canónico es solo dígitos con el indicativo del país: un móvil colombiano es `57` + 10 dígitos (3xx xxx xxxx).
 */

/** Teléfono canónico para comparar: `573001112233` desde «300 111 2233», «+57 300-111-2233», «0573001112233» o «(57) 3001112233». Vacío si no hay dígitos. */
export function canonicalPhone(raw: string | null | undefined): string {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  digits = digits.replace(/^0{1,2}(?=57)/, ""); // 00 57… · 0 57…
  if (digits.startsWith("57") && digits.length === 12) return digits;
  if (digits.length === 10 && digits.startsWith("3")) return `57${digits}`; // móvil sin indicativo
  if (digits.length === 11 && digits.startsWith("0") && digits[1] === "3") return `57${digits.slice(1)}`;
  return digits; // fijo, extranjero o dato incompleto: se compara tal cual
}

/** ¿Es un teléfono usable para identificar a una persona? (un móvil colombiano completo o un número de 7 dígitos o más). */
export const isIdentifyingPhone = (canonical: string) => canonical.length >= 10;

const tokens = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

/**
 * ¿Los dos nombres pueden ser la misma persona? Comparten el primer nombre o uno contiene al otro («Camila» · «Camila Torres»).
 * «Camila Torres» y «Andrés Gómez» con el mismo teléfono es un CONFLICTO: no se fusionan solos, se proponen para revisar.
 */
export function namesCompatible(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return true; // sin nombre útil no hay conflicto que afirmar
  if (ta[0] === tb[0]) return true;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.includes(t));
}

export type ContactStage = "PROSPECT" | "CUSTOMER" | "RECURRING";
export const CONTACT_STAGES: readonly ContactStage[] = ["PROSPECT", "CUSTOMER", "RECURRING"];
export const STAGE_LABELS: Record<ContactStage, string> = { PROSPECT: "Prospecto", CUSTOMER: "Cliente", RECURRING: "Recurrente" };

/** Compras pagadas a partir de las cuales un cliente es «recurrente». */
export const RECURRING_AFTER = 3;

/** Etapa que le corresponde según sus compras pagadas: ninguna → prospecto; una o dos → cliente; tres o más → recurrente. */
export const stageForPaidCount = (paid: number): ContactStage => (paid >= RECURRING_AFTER ? "RECURRING" : paid >= 1 ? "CUSTOMER" : "PROSPECT");
