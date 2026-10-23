import Link from "next/link";
import { MessageCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import type { ExpiringRow } from "@/lib/business/gym-db";
import { formatDateShort } from "@/lib/format";
import { whatsappReminderLink } from "@/lib/business/memberships";

/** Membresías que vencen pronto o vencieron hace poco: aviso por WhatsApp y renovación. */
export default function ExpiringList({ slug, rows }: { slug: string; rows: ExpiringRow[] }) {
  return (
    <aside className="grid grid-cols-1 content-start gap-2">
      <h2 className="text-sm font-semibold">Vencimientos</h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {rows.map((r) => {
          const gone = r.daysLeft <= 0;
          const text = gone
            ? `Hola ${r.name}, tu membresía venció el ${formatDateShort(r.endsAt)}. ¡Te esperamos! Renuévala para seguir entrenando.`
            : `Hola ${r.name}, tu membresía vence el ${formatDateShort(r.endsAt)} (${r.daysLeft === 1 ? "mañana" : `en ${r.daysLeft} días`}). Renuévala para no perder ningún día.`;
          return (
            <li key={r.membershipId} className="grid grid-cols-1 gap-2 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Link href={`/${slug}/crm/${r.customerId}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                  {r.name}
                </Link>
                <Badge tone={gone ? "danger" : r.daysLeft <= 3 ? "warning" : "neutral"}>{gone ? "Vencida" : r.daysLeft === 1 ? "Mañana" : `${r.daysLeft} días`}</Badge>
              </div>
              <div className="flex gap-2">
                <a href={whatsappReminderLink(r.phone, text)} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
                  <MessageCircle aria-hidden="true" className="size-3.5" /> Avisar
                </a>
                <Link href={`/${slug}/memberships?q=${encodeURIComponent(r.name)}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                  <RefreshCw aria-hidden="true" className="size-3.5" /> Renovar
                </Link>
              </div>
            </li>
          );
        })}
        {rows.length === 0 ? <li className="px-3 py-4 text-sm text-muted-foreground">Nadie vence esta semana.</li> : null}
      </ul>
    </aside>
  );
}
