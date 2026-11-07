"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { EmptyState } from "@/components/molecules/empty-state";
import { useToast } from "@/components/molecules/toast";
import { moveProductionAction } from "@/app/[tenant]/(app)/orders/actions";
import { STAGE_TEXT } from "@/lib/business/store/production";
import type { ProductionRow } from "@/lib/business/store/production-db";

const NEXT = { QUEUED: { to: "IN_PROGRESS", label: "Empezar" }, IN_PROGRESS: { to: "DONE", label: "Terminar" } } as const;

/** Lo que hay por fabricar, una tarjeta por línea de pedido. Un toque avanza la etapa; al terminar la última, el pedido queda listo. */
export function ProductionBoard({ slug, rows }: { slug: string; rows: ProductionRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  if (rows.length === 0) return <EmptyState title="Nada en producción" description="Cuando un pedido pase a «En producción», sus productos aparecen aquí para fabricarlos." />;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {rows.map((p) => {
        const next = NEXT[p.stage as keyof typeof NEXT];
        return (
          <li key={p.id} className="grid gap-2 rounded-lg border border-border bg-surface p-3">
            <div className="flex flex-wrap items-center gap-2">
              <b className="font-mono">{p.orderCode}</b>
              <Badge variant={p.stage === "IN_PROGRESS" ? "default" : "secondary"}>{STAGE_TEXT[p.stage]}</Badge>
            </div>
            <p className="break-words text-ui">{p.quantity} × {p.productName}</p>
            {next ? (
              <button type="button" aria-label={`${next.label} ${p.productName} del pedido ${p.orderCode}`} onClick={async () => { const r = await moveProductionAction(slug, p.id, next.to); toast(r.message, r.ok ? "success" : "error"); if (r.ok) router.refresh(); }} className={buttonVariants({ size: "sm" })}>{next.label}</button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
