"use client";

import { Badge } from "@/components/atoms/badge";
import { useMinute } from "@/lib/hooks/use-minute";
import { slaState, type TicketPriorityValue, type TicketStatusValue } from "@/lib/ops/support-rules";

function left(ms: number) {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : h ? `${h} h ${m} min` : `${m} min`;
}

/** Semáforo del SLA, se actualiza cada minuto. */
export default function SlaBadge({ t }: { t: { priority: TicketPriorityValue; status: TicketStatusValue; createdAt: number; firstResponseAt: number | null; resolvedAt: number | null } }) {
  const now = useMinute();
  const s = slaState(t, now);
  const what = s.kind === "response" ? "respuesta" : "resolución";
  if (s.state === "paused") return <Badge tone="muted">SLA en pausa</Badge>;
  if (s.state === "met") return <Badge tone="success">SLA cumplido</Badge>;
  if (s.state === "breached") return <Badge tone="danger" pulse={t.status !== "RESOLVED" && t.status !== "CLOSED"}>{s.dueAt ? `${what} vencida hace ${left(now - s.dueAt)}` : "SLA vencido"}</Badge>;
  return <Badge tone={s.state === "at_risk" ? "warning" : "neutral"}>{`${what} en ${left((s.dueAt ?? now) - now)}`}</Badge>;
}
