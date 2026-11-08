/**
 * Medios de pago que ofrece el negocio (reglas puras). Cada medio es de un tipo base que decide cómo se registra el dinero:
 * CASH entra a la caja del turno; TRANSFER es transferencia o billetera (Nequi, Daviplata, QR del banco). El nombre y las
 * instrucciones son del negocio. Un negocio sin configurar ofrece Efectivo y Transferencia.
 */
export type MethodKind = "CASH" | "TRANSFER" | "CREDIT";

export const METHOD_KINDS: { value: MethodKind; label: string; hint: string }[] = [
  { value: "CASH", label: "Efectivo", hint: "Entra a la caja del turno y se cuadra al cerrarlo." },
  { value: "TRANSFER", label: "Transferencia o billetera", hint: "Nequi, Daviplata, QR o cuenta del banco: el dinero no pasa por la caja." },
  { value: "CREDIT", label: "Crédito (fiado)", hint: "El cliente paga después: la venta exige elegir el cliente y lo que debe queda en su cartera como cuenta de cobro a 30 días." },
];

export type PaymentMethodOption = { id: string; kind: MethodKind; name: string; instructions: string | null; active: boolean; position: number };

export const DEFAULT_METHODS: readonly PaymentMethodOption[] = [
  { id: "default-cash", kind: "CASH", name: "Efectivo", instructions: null, active: true, position: 0 },
  { id: "default-transfer", kind: "TRANSFER", name: "Transferencia", instructions: null, active: true, position: 1 },
];

export const MAX_METHODS = 12;

export function isMethodKind(value: string): value is MethodKind {
  return value === "CASH" || value === "TRANSFER" || value === "CREDIT";
}

export type MethodDraft = { kind: string; name: string; instructions?: string | null };

/** Valida el medio que escribe el dueño; devuelve el medio limpio o el error legible. */
export function validateMethod(draft: MethodDraft, others: readonly { id: string; name: string }[], selfId?: string): { ok: true; value: { kind: MethodKind; name: string; instructions: string | null } } | { ok: false; message: string } {
  const name = draft.name.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name) return { ok: false, message: "Ponle un nombre al medio de pago." };
  if (!isMethodKind(draft.kind)) return { ok: false, message: "Elige si es efectivo o transferencia." };
  if (others.some((o) => o.id !== selfId && o.name.toLowerCase() === name.toLowerCase())) return { ok: false, message: `Ya tienes un medio llamado «${name}».` };
  return { ok: true, value: { kind: draft.kind, name, instructions: draft.instructions?.trim().slice(0, 300) || null } };
}

/** Los medios que se ofrecen al cobrar: activos y en su orden. */
export function offeredMethods(methods: readonly PaymentMethodOption[]): PaymentMethodOption[] {
  return methods.filter((m) => m.active).sort((a, b) => a.position - b.position);
}
