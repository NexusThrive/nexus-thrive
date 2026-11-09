import { createHash } from "node:crypto";

/**
 * Extractos bancarios (HU-conciliacion-01), reglas puras: leer un CSV y proponer con qué pago o liquidación cruza cada
 * depósito. Se empieza con UN formato simple (fecha, descripción, referencia, valor); cada banco se adapta después. Una
 * propuesta nunca concilia sola: la confirma una persona.
 */
export type StatementLine = { day: string; description: string; reference: string | null; amount: number };

/** Día «AAAA-MM-DD» desde AAAA-MM-DD, DD/MM/AAAA o DD-MM-AAAA; `null` si no es una fecha válida. */
export function parseStatementDay(raw: string): string | null {
  const t = raw.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Valor del extracto: acepta «$1.250.000,50», «1250000.50», «-45.000» y «(45.000)» (negativo). `null` si no es un número. */
export function parseStatementAmount(raw: string): number | null {
  let t = raw.trim().replace(/[$\s]/g, "");
  if (!t) return null;
  const negative = t.startsWith("-") || (t.startsWith("(") && t.endsWith(")"));
  t = t.replace(/[()-]/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, "");
  else t = t.replace(",", ".");
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** Lee un extracto CSV: «fecha; descripción; referencia; valor» (separa por coma, punto y coma o tabulador; el encabezado es opcional). */
export function parseStatement(text: string): { lines: StatementLine[]; bad: number[] } {
  const lines: StatementLine[] = [];
  const bad: number[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const sep = raw.includes(";") ? ";" : raw.includes("\t") ? "\t" : ",";
    const cells = raw.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const day = parseStatementDay(cells[0] ?? "");
    const amount = parseStatementAmount(cells[cells.length - 1] ?? "");
    if (!day || amount === null || amount === 0 || cells.length < 3) {
      if (!(i === 0 && !day)) bad.push(i + 1); // la primera línea puede ser el encabezado
      return;
    }
    lines.push({ day, description: (cells[1] ?? "").slice(0, 200), reference: cells.length >= 4 && cells[2] ? cells[2].slice(0, 80) : null, amount });
  });
  return { lines, bad };
}

/** Huella de un movimiento: importar dos veces el mismo extracto no lo duplica. */
export const statementFingerprint = (l: StatementLine) => createHash("sha256").update(`${l.day}|${l.amount.toFixed(2)}|${l.description.toLowerCase()}|${l.reference ?? ""}`).digest("hex").slice(0, 32);

export type MatchCandidate = { type: "SETTLEMENT" | "PAYMENT"; id: string; day: string; amount: number };
export type Proposal = { lineKey: string; type: "SETTLEMENT" | "PAYMENT"; id: string; confidence: "EXACT" | "APPROX" };

const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

/**
 * Propone con qué cruza cada depósito. EXACT: mismo valor (al centavo) a 3 días o menos. APPROX: diferencia de hasta el 1 % (mínimo
 * $ 1.000) a 5 días o menos. Cada candidato se usa una sola vez; una liquidación tiene prioridad sobre un pago y, a igual valor,
 * gana el día más cercano. Los retiros no se cruzan.
 */
export function proposeMatches(lines: readonly (StatementLine & { key: string })[], candidates: readonly MatchCandidate[]): Proposal[] {
  const used = new Set<string>();
  const out: Proposal[] = [];
  const score = (l: StatementLine, c: MatchCandidate) => {
    const days = Math.abs(dayNumber(l.day) - dayNumber(c.day));
    const diff = Math.abs(l.amount - c.amount);
    if (diff < 0.005 && days <= 3) return { confidence: "EXACT" as const, rank: days };
    if (diff <= Math.max(1000, c.amount * 0.01) && days <= 5) return { confidence: "APPROX" as const, rank: 10 + diff + days };
    return null;
  };
  for (const level of ["EXACT", "APPROX"] as const) {
    for (const l of lines) {
      if (l.amount <= 0 || out.some((p) => p.lineKey === l.key)) continue;
      let best: { c: MatchCandidate; rank: number } | null = null;
      for (const c of candidates) {
        if (used.has(`${c.type}:${c.id}`)) continue;
        const s = score(l, c);
        if (!s || s.confidence !== level) continue;
        const rank = s.rank - (c.type === "SETTLEMENT" ? 0.5 : 0);
        if (!best || rank < best.rank) best = { c, rank };
      }
      if (best) {
        used.add(`${best.c.type}:${best.c.id}`);
        out.push({ lineKey: l.key, type: best.c.type, id: best.c.id, confidence: level });
      }
    }
  }
  return out;
}
