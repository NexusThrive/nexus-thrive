"use client";

import { useEffect, useState } from "react";
import { Badge, type StatusTone } from "@/components/atoms/badge";
import { countdown, STATE_LABELS } from "@/lib/industry/gym/gym";
import type { MemberStatus } from "@/lib/industry/gym/gym-db";
import { cn } from "@/lib/utils";

const TONE: Record<MemberStatus["state"], StatusTone> = { active: "success", frozen: "neutral", expired: "danger", cancelled: "muted", upcoming: "neutral", none: "muted" };

/** Estado de la membresía del socio y cuenta de días que le quedan (sin QR ni tarjeta). */
export default function AccessCard({ status }: { status: MemberStatus }) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, []);

  const cd = status.endsAt && now ? countdown(status.endsAt, now) : null;

  return (
    <section className="rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border px-[18px] py-3">
        <h2 className="font-display text-base font-semibold">Membresía</h2>
        <Badge tone={TONE[status.state]}>{status.state === "none" ? "Sin membresía" : STATE_LABELS[status.state]}</Badge>
      </header>
      <div className="p-[18px]">
        {cd ? (
          <div className={cn("rounded-md px-3 py-2.5", cd.expired ? "bg-rose-500/10" : cd.urgent ? "bg-amber-500/10" : "bg-surface-muted")}>
            <p className="text-xs text-muted-foreground">{cd.expired ? "Membresía vencida" : status.state === "frozen" ? "Congelada · tiempo guardado" : "Tiempo restante"}</p>
            <p className="font-mono text-lg font-semibold tabular-nums">{cd.text}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Asígnale una membresía desde «Editar».</p>
        )}
      </div>
    </section>
  );
}
