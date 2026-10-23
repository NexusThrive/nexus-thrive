import Link from "next/link";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import type {
  Customer360Membership,
  Customer360Profile,
  CustomerAccountStatus,
} from "@/lib/tenant/db";
import { typeLabel } from "@/lib/business/memberships";
import { formatDateShort } from "@/lib/format";
import type { VerticalTerms } from "@/lib/vertical-terms";
import { AccountStatusPill, MembershipStatusPill } from "./status-pills";
import CustomerActions from "./customer-actions";

/**
 * Cabecera de la ficha 360°: identidad, contacto, y los DOS estados que NUNCA
 * deben confundirse — el estado de cuenta (según pagos) y el estado de la
 * membresía (según su vigencia). Las acciones viven en `CustomerActions`.
 */
export default function CustomerHeader({
  tenantSlug,
  tenantName,
  customer,
  terms,
  photoId = null,
  accountStatus,
  membership,
  showMemberships,
}: {
  tenantSlug: string;
  tenantName: string;
  customer: Customer360Profile;
  terms: VerticalTerms;
  photoId?: string | null;
  accountStatus: CustomerAccountStatus;
  membership: Customer360Membership | null;
  showMemberships: boolean;
}) {
  return (
    <header className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <Link
        href={`/${tenantSlug}/crm`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver a {terms.customers}
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {photoId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${photoId}`} alt={`Foto de ${customer.name}`} className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-sm bg-accent-subtle text-lg font-semibold text-accent-text">
              {initialsOf(customer.name)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-display text-[clamp(22px,3.6vw,30px)] font-bold tracking-[-0.02em] text-foreground">
              {customer.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {terms.customer} desde{" "}
              <span className="font-medium text-foreground/80">
                {formatDateShort(customer.createdAt)}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              {customer.email ? (
                <span className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                  <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{customer.email}</span>
                </span>
              ) : null}
              {customer.phone ? (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  {customer.phone}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AccountStatusPill status={accountStatus} />
              {showMemberships ? (
                membership ? (
                  <MembershipStatusPill
                    status={membership.status}
                    prefix={typeLabel(membership.type)}
                  />
                ) : (
                  <Badge tone="muted">Sin {terms.item.toLowerCase()}</Badge>
                )
              ) : null}
              {!customer.active ? (
                <Badge tone="muted">Archivado</Badge>
              ) : null}
            </div>
          </div>
        </div>

        <CustomerActions
          tenantSlug={tenantSlug}
          tenantName={tenantName}
          customerId={customer.id}
          customerName={customer.name}
          phone={customer.phone}
        />
      </div>
    </header>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
