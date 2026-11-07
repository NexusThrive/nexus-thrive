import { toNumber } from "@/lib/foundation/format";
import { todayCO } from "@/lib/domains/finance/tax/tax";
import { db } from "@/prisma/db";
import { parseStatement, proposeMatches, statementFingerprint, type MatchCandidate } from "./statements";

/**
 * Conciliación bancaria (HU-conciliacion-01): importa el extracto, propone el cruce de cada depósito con un pago o una liquidación
 * y una persona autorizada lo confirma. Un pago o una liquidación se concilia con UN solo movimiento. Todo por `tenantId`.
 */
/** UNMATCHED pendiente · PROPOSED con propuesta · MATCHED conciliado por una persona · REVIEWED una persona la revisó y no cruza con nada (no se vuelve a proponer). */
export type StatementStatus = "UNMATCHED" | "PROPOSED" | "MATCHED" | "REVIEWED";
export type StatementRow = { id: string; day: string; description: string; reference: string | null; amount: number; status: StatementStatus; matchType: "SETTLEMENT" | "PAYMENT" | null; matchId: string | null; matchLabel: string | null; matchConfidence: "EXACT" | "APPROX" | null };

const dec = (n: number) => n.toFixed(2);

/** Candidatos libres: liquidaciones y pagos por transferencia aprobados que ningún movimiento ha conciliado. */
async function freeCandidates(tenantId: string): Promise<MatchCandidate[]> {
  const taken = await db.orm.public.BankStatementLine.where({ tenantId }).where((l) => l.status.eq("MATCHED")).select("matchType", "matchId").all();
  const used = new Set(taken.map((t) => `${t.matchType}:${t.matchId}`));
  const [settlements, payments] = await Promise.all([
    db.orm.public.ProviderSettlement.where({ tenantId }).orderBy((s) => s.createdAt.desc()).limit(500).all(),
    db.orm.public.Payment.where({ tenantId, status: "APPROVED", provider: "TRANSFER" }).orderBy((p) => p.createdAt.desc()).limit(500).all(),
  ]);
  return [
    ...settlements.map<MatchCandidate>((s) => ({ type: "SETTLEMENT", id: s.id, day: s.day, amount: toNumber(s.netReceived) })),
    ...payments.map<MatchCandidate>((p) => ({ type: "PAYMENT", id: p.id, day: todayCO(new Date(String(p.createdAt)).getTime()), amount: toNumber(p.amount) })),
  ].filter((c) => !used.has(`${c.type}:${c.id}`));
}

/** Calcula las propuestas para los movimientos pendientes o ya propuestos (las propuestas se rehacen; lo conciliado no se toca). */
export async function refreshProposals(tenantId: string): Promise<number> {
  const open = await db.orm.public.BankStatementLine.where({ tenantId }).where((l) => l.status.in(["UNMATCHED", "PROPOSED"])).limit(2000).all();
  const proposals = proposeMatches(open.map((l) => ({ key: l.id, day: l.day, description: l.description, reference: l.reference, amount: toNumber(l.amount) })), await freeCandidates(tenantId));
  const byLine = new Map(proposals.map((p) => [p.lineKey, p]));
  let proposed = 0;
  for (const l of open) {
    const p = byLine.get(l.id);
    if (p) {
      await db.orm.public.BankStatementLine.where({ tenantId, id: l.id }).update({ status: "PROPOSED", matchType: p.type, matchId: p.id, matchConfidence: p.confidence });
      proposed++;
    } else if (l.status === "PROPOSED") {
      await db.orm.public.BankStatementLine.where({ tenantId, id: l.id }).update({ status: "UNMATCHED", matchType: null, matchId: null, matchConfidence: null });
    }
  }
  return proposed;
}

/** Importa un extracto: agrega los movimientos nuevos (los repetidos se omiten) y propone cruces. */
export async function importStatement(tenantId: string, text: string): Promise<{ ok: true; added: number; duplicates: number; bad: number[]; proposed: number } | { ok: false; message: string }> {
  const parsed = parseStatement(text);
  if (!parsed.lines.length) return { ok: false, message: parsed.bad.length ? `No pude leer ninguna línea. Revisa las líneas ${parsed.bad.slice(0, 5).join(", ")}: cada una es «fecha; descripción; referencia; valor».` : "Pega el extracto: «fecha; descripción; referencia; valor» por línea." };
  if (parsed.lines.length > 2000) return { ok: false, message: "Importa de a 2.000 movimientos como máximo." };
  const batch = `imp-${Date.now().toString(36)}`;
  let added = 0;
  let duplicates = 0;
  for (const l of parsed.lines) {
    const fingerprint = statementFingerprint(l);
    if (await db.orm.public.BankStatementLine.where({ tenantId, fingerprint }).select("id").first()) {
      duplicates++;
      continue;
    }
    try {
      await db.orm.public.BankStatementLine.create({ tenantId, day: l.day, description: l.description, reference: l.reference, amount: dec(l.amount), fingerprint, batch });
      added++;
    } catch (error) {
      if (/BankStatementLine_tenantId_fingerprint|unique|duplicate/i.test(String((error as Error)?.message ?? error))) duplicates++;
      else throw error;
    }
  }
  return { ok: true, added, duplicates, bad: parsed.bad, proposed: await refreshProposals(tenantId) };
}

/** Confirma el cruce propuesto de un movimiento. Un pago o liquidación solo se concilia una vez. */
export async function confirmMatch(tenantId: string, lineId: string, userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const line = await db.orm.public.BankStatementLine.where({ tenantId, id: lineId }).first();
  if (!line || line.status !== "PROPOSED" || !line.matchId || !line.matchType) return { ok: false, message: "Ese movimiento no tiene una propuesta para confirmar." };
  const taken = await db.orm.public.BankStatementLine.where({ tenantId, matchType: line.matchType, matchId: line.matchId, status: "MATCHED" }).select("id").first();
  if (taken) return { ok: false, message: "Ese pago o liquidación ya está conciliado con otro movimiento." };
  const plan = db.sql.public.BankStatementLine.update({ status: "MATCHED", confirmedById: userId, confirmedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) })
    .where((f, fns) => fns.and(fns.eq(f.id, lineId), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "PROPOSED")))
    .returning("id")
    .build();
  if ((await db.transaction((tx) => tx.query(plan))).length === 0) return { ok: false, message: "Ese movimiento ya cambió." };
  await refreshProposals(tenantId); // el cruce confirmado sale de los candidatos de las demás propuestas
  return { ok: true };
}

/** Una persona revisó el movimiento y no cruza con nada: sale de las propuestas (sigue pendiente de conciliar). */
export async function markReviewed(tenantId: string, lineId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const plan = db.sql.public.BankStatementLine.update({ status: "REVIEWED", matchType: null, matchId: null, matchConfidence: null })
    .where((f, fns) => fns.and(fns.eq(f.id, lineId), fns.eq(f.tenantId, tenantId), fns.or(fns.eq(f.status, "PROPOSED"), fns.eq(f.status, "UNMATCHED"))))
    .returning("id")
    .build();
  if ((await db.transaction((tx) => tx.query(plan))).length === 0) return { ok: false, message: "Ese movimiento ya está conciliado o no existe." };
  return { ok: true };
}

/** Movimientos del extracto, los más recientes primero, con el nombre de lo que cruzan. */
export async function listStatement(tenantId: string, limit = 200): Promise<StatementRow[]> {
  const rows = await db.orm.public.BankStatementLine.where({ tenantId }).orderBy((l) => l.day.desc()).limit(limit).all();
  const settlementIds = rows.filter((r) => r.matchType === "SETTLEMENT" && r.matchId).map((r) => r.matchId!);
  const paymentIds = rows.filter((r) => r.matchType === "PAYMENT" && r.matchId).map((r) => r.matchId!);
  const [settlements, payments] = await Promise.all([
    settlementIds.length ? db.orm.public.ProviderSettlement.where({ tenantId }).where((s) => s.id.in(settlementIds)).select("id", "externalRef").all() : Promise.resolve([]),
    paymentIds.length ? db.orm.public.Payment.where({ tenantId }).where((p) => p.id.in(paymentIds)).select("id", "receiptNumber", "description").all() : Promise.resolve([]),
  ]);
  const label = new Map<string, string>([...settlements.map((s) => [`SETTLEMENT:${s.id}`, `Liquidación ${s.externalRef}`] as const), ...payments.map((p) => [`PAYMENT:${p.id}`, p.description ? `Pago · ${p.description}` : `Recibo ${p.receiptNumber ?? ""}`] as const)]);
  return rows.map((r) => ({ id: r.id, day: r.day, description: r.description, reference: r.reference, amount: toNumber(r.amount), status: r.status as StatementStatus, matchType: (r.matchType as "SETTLEMENT" | "PAYMENT" | null) ?? null, matchId: r.matchId, matchLabel: r.matchId ? (label.get(`${r.matchType}:${r.matchId}`) ?? null) : null, matchConfidence: (r.matchConfidence as "EXACT" | "APPROX" | null) ?? null }));
}
