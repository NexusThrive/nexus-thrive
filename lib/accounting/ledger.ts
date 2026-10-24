import { createHash } from "node:crypto";
import type { RuleAmount, RuleLine } from "./puc";

/**
 * Motor contable (reglas puras): arma las líneas de un asiento desde una regla y sus montos, comprueba
 * la partida doble y calcula el sello encadenado del libro mayor. Todo en centavos enteros para que
 * una suma nunca «casi cuadre».
 */
export type Amounts = Partial<Record<RuleAmount, number>>;
export type EntryLine = { account: string; debit: number; credit: number; label?: string; partyId?: string | null; costCenterId?: string | null };

export const cents = (n: number) => Math.round(n * 100);
export const fromCents = (c: number) => c / 100;

/** Líneas del asiento de una regla con los montos dados; las de monto cero no se escriben. */
export function linesFromRule(rule: readonly RuleLine[], amounts: Amounts, dims: { partyId?: string | null; costCenterId?: string | null } = {}): EntryLine[] {
  const out: EntryLine[] = [];
  for (const l of rule) {
    const c = cents(amounts[l.amount] ?? 0);
    if (c <= 0) continue;
    out.push({ account: l.account, debit: l.side === "D" ? fromCents(c) : 0, credit: l.side === "C" ? fromCents(c) : 0, label: l.label, partyId: dims.partyId ?? null, costCenterId: dims.costCenterId ?? null });
  }
  return out;
}

export function totals(lines: readonly EntryLine[]): { debit: number; credit: number } {
  return { debit: fromCents(lines.reduce((s, l) => s + cents(l.debit), 0)), credit: fromCents(lines.reduce((s, l) => s + cents(l.credit), 0)) };
}

/** Problema legible de un asiento (partida doble, líneas inválidas), o `null` si está bien. */
export function validateEntry(lines: readonly EntryLine[]): string | null {
  if (lines.length < 2) return "Un asiento necesita al menos dos líneas.";
  for (const l of lines) {
    if (!(l.debit >= 0 && l.credit >= 0) || (l.debit > 0 && l.credit > 0) || (l.debit === 0 && l.credit === 0)) return `La línea de la cuenta ${l.account} debe tener solo débito o solo crédito, mayor que cero.`;
  }
  const t = totals(lines);
  if (cents(t.debit) !== cents(t.credit)) return `El asiento no cuadra: débitos ${t.debit.toLocaleString("es-CO")} y créditos ${t.credit.toLocaleString("es-CO")}.`;
  return null;
}

/** El asiento que anula a otro: mismas líneas con el débito y el crédito intercambiados. */
export const reverseLines = (lines: readonly EntryLine[]): EntryLine[] => lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit, label: l.label ? `Reverso · ${l.label}` : "Reverso" }));

export type HashInput = { number: number; date: string; event: string; sourceType: string; sourceId: string | null; lines: readonly EntryLine[] };

/** Contenido canónico del asiento (siempre en el mismo orden) para el sello. */
export function canonical(e: HashInput): string {
  const lines = [...e.lines].map((l) => `${l.account}|${cents(l.debit)}|${cents(l.credit)}|${l.partyId ?? ""}|${l.costCenterId ?? ""}`).sort();
  return `${e.number}#${e.date}#${e.event}#${e.sourceType}#${e.sourceId ?? ""}#${lines.join(";")}`;
}

/** Sello encadenado: SHA-256 del sello del asiento anterior + el contenido de este. */
export const entryHash = (prevHash: string, e: HashInput): string => createHash("sha256").update(`${prevHash}\n${canonical(e)}`).digest("hex");
export const GENESIS = "0".repeat(64);
