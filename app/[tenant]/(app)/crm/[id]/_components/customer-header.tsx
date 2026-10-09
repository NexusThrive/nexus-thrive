import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import type { VerticalTerms } from "@/lib/vertical-terms";
import type { Customer360Profile } from "@/lib/tenant-db";
import { formatDateShort } from "@/lib/format";
import { whatsappReminderLink } from "@/lib/memberships";

/** Iniciales del nombre, mayúsculas (hasta 2 letras). */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Panel superior de la ficha 360°: avatar, nombre, contacto, badges,
 * fecha de registro y botón de WhatsApp (solo previsualización + abrir la
 * conversación; nunca envía mensajes automáticamente).
 */
export default function CustomerHeader({
  tenantSlug,
  tenantName,
  customer,
  terms,
}: {
  tenantSlug: string;
  tenantName: string;
  customer: Customer360Profile;
  terms: VerticalTerms;
}) {
  const hasPhone = Boolean(customer.phone);
  const whatsappMessage = `Hola ${customer.name}, te escribimos desde ${tenantName}.`;
  const whatsappHref = whatsappReminderLink(customer.phone, whatsappMessage);

  return (
    <header className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <Link
        href={`/${tenantSlug}/crm`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver a {terms.customers}
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-sm bg-accent-subtle text-lg font-semibold text-accent-text"
          >
            {initialsOf(customer.name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                {customer.name}
              </h1>
              {!customer.active ? (
                <span className="rounded-sm bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Archivado
                </span>
              ) : null}
            </div>
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
          </div>
        </div>

        {hasPhone ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-success-foreground transition-colors hover:bg-success/90"
          >
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            WhatsApp
          </a>
        ) : null}
      </div>
    </header>
  );
}
