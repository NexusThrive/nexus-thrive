import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CheckCircle2,
  FileText,
  MessageSquareWarning,
  ShieldAlert,
  UserPlus,
  UsersRound,
  Wallet,
} from "lucide-react";
import type { ActivityItem, ActivityKind } from "@/lib/admin/db";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  ActivityKind,
  { icon: LucideIcon; className: string }
> = {
  tenant_created: {
    icon: Building2,
    className: "bg-muted text-muted-foreground",
  },
  payment_approved: {
    icon: CheckCircle2,
    className: "bg-success/10 text-success",
  },
  payment_declined: {
    icon: MessageSquareWarning,
    className: "bg-destructive/10 text-destructive",
  },
  payment_pending: {
    icon: Wallet,
    className: "bg-gold-100 text-gold-700",
  },
  quote_created: {
    icon: FileText,
    className: "bg-muted text-muted-foreground",
  },
  quote_approved: {
    icon: CheckCircle2,
    className: "bg-success/10 text-success",
  },
  customer_created: {
    icon: UserPlus,
    className: "bg-accent-subtle text-accent-text",
  },
  membership_created: {
    icon: UsersRound,
    className: "bg-muted text-muted-foreground",
  },
  user_created: {
    icon: UsersRound,
    className: "bg-muted text-muted-foreground",
  },
  tenant_suspended: {
    icon: ShieldAlert,
    className: "bg-destructive/10 text-destructive",
  },
  tenant_activated: {
    icon: CheckCircle2,
    className: "bg-success/10 text-success",
  },
  module_toggled: {
    icon: Building2,
    className: "bg-gold-100 text-gold-700",
  },
  audit: {
    icon: ShieldAlert,
    className: "bg-gold-100 text-gold-700",
  },
};

/**
 * Feed de actividad real de la plataforma (server component). Los datos ya
 * vienen resueltos de `lib/admin/db.ts`.
 */
export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        Todavía no hay actividad registrada.
      </p>
    );
  }

  return (
    <ol className="divide-y">
      {items.map((item) => {
        const meta = KIND_META[item.kind];
        const Icon = meta.icon;
        return (
          <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className={cn(
                "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-sm",
                meta.className,
              )}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.tenantName ? `${item.tenantName} · ` : ""}
                {item.description ?? ""}
              </p>
            </div>
            <time
              className="shrink-0 text-xs text-muted-foreground"
              dateTime={item.at}
              title={item.at}
            >
              {item.atLabel}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
