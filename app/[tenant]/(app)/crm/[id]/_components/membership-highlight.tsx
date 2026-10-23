"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/molecules/card";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { typeLabel } from "@/lib/business/memberships";
import { useMinute } from "@/lib/hooks/use-minute";
import type { Customer360Membership } from "@/lib/tenant/db";
import type { VerticalTerms } from "@/lib/vertical-terms";
import { cn } from "@/lib/utils";
import { MembershipStatusPill } from "./status-pills";

const DAY_MS = 86_400_000;

/**
 * Membresía destacada de la ficha: la vigente (o la última registrada). Muestra
 * el estado DINÁMICO, el vencimiento y el tiempo restante "según el registro",
 * sin prometer renovaciones automáticas.
 */
export default function MembershipHighlight({
  membership,
  terms,
  baseHref,
  className,
}: {
  membership: Customer360Membership | null;
  terms: VerticalTerms;
  baseHref: string;
  className?: string;
}) {
  const now = useMinute();
  const historyHref = `${baseHref}?tab=membresias`;
  const end = membership ? Date.parse(membership.endDate) : Number.NaN;
  const expired = membership?.status === "expired";
  const daysLeft =
    membership && Number.isFinite(end)
      ? Math.max(0, Math.ceil((end - now) / DAY_MS))
      : null;

  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{terms.item} destacada</CardTitle>
          {membership ? (
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {typeLabel(membership.type)}
            </p>
          ) : null}
        </div>
        {membership ? (
          <CardAction>
            <MembershipStatusPill status={membership.status} />
          </CardAction>
        ) : null}
      </CardHeader>

      {membership ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-surface-muted px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                {expired ? "Venció el" : "Vence el"}
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-foreground">
                {formatDateShort(membership.endDate)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface-muted px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
                Tiempo restante
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-foreground">
                {daysLeft != null
                  ? `${daysLeft} ${daysLeft === 1 ? "día" : "días"}`
                  : "—"}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13.5px]">
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Inicio</dt>
              <dd className="font-medium text-foreground">
                {formatDateShort(membership.startDate)}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Precio</dt>
              <dd className="font-medium tabular-nums text-foreground">
                {formatCurrency(membership.price)}
              </dd>
            </div>
          </dl>

          <Link
            href={historyHref}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline"
          >
            Ver historial de {terms.items.toLowerCase()}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </>
      ) : (
        <p className="text-[13.5px] text-muted-foreground">
          Sin {terms.item.toLowerCase()} registrada.{" "}
          <Link
            href={historyHref}
            className="font-medium text-accent-text hover:underline"
          >
            Ver historial
          </Link>
        </p>
      )}
    </Card>
  );
}
