import { db } from "@/prisma/db";
import { msOf } from "@/lib/core/events/instant";
import { toNumber } from "@/lib/foundation/format";
import type { ShiftRow } from "./shift-report";

const iso = (v: unknown) => new Date(msOf(v) ?? 0).toISOString();

/** Los últimos turnos de caja del mostrador (abiertos y cerrados) con su terminal, quién los abrió y cómo cuadraron. */
export async function shiftReport(tenantId: string, limit = 60): Promise<ShiftRow[]> {
  const sessions = await db.orm.public.CashSession.where({ tenantId }).where((s) => s.terminalId.isNotNull()).orderBy((s) => s.openedAt.desc()).limit(limit).all();
  if (!sessions.length) return [];
  const [terminals, members] = await Promise.all([
    db.orm.public.PosTerminal.where({ tenantId }).select("id", "name").limit(200).all(),
    db.orm.public.User.where({ tenantId }).select("id", "name", "email").limit(500).all(),
  ]);
  const tn = new Map(terminals.map((t) => [t.id, t.name]));
  const mn = new Map(members.map((m) => [m.id, m.name?.trim() || m.email]));
  return sessions.map((s) => ({
    id: s.id,
    terminalName: (s.terminalId && tn.get(s.terminalId)) || "—",
    cashier: mn.get(s.openedById) ?? "—",
    openedAt: iso(s.openedAt),
    closedAt: s.closedAt ? iso(s.closedAt) : null,
    opening: toNumber(s.openingAmount),
    expected: s.expectedAmount == null ? null : toNumber(s.expectedAmount),
    counted: s.countedAmount == null ? null : toNumber(s.countedAmount),
    difference: s.difference == null ? null : toNumber(s.difference),
    notes: s.closingNotes ?? null,
  }));
}
