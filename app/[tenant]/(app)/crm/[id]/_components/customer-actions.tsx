"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Pencil, Plus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { whatsappReminderLink } from "@/lib/memberships";
import CustomerSheet from "../../_components/customer-sheet";

/**
 * Acciones de la cabecera de la ficha: WhatsApp (nunca envía solo, abre el
 * chat), registrar un pago (abre el cobro con el cliente precargado) y editar
 * la ficha con el mismo formulario del CRM.
 */
export default function CustomerActions({
  tenantSlug,
  tenantName,
  customerId,
  customerName,
  phone,
}: {
  tenantSlug: string;
  tenantName: string;
  customerId: string;
  customerName: string;
  phone: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const whatsappHref = phone
    ? whatsappReminderLink(phone, `Hola ${customerName}, te escribimos desde ${tenantName}.`)
    : null;

  return (
    <div className="flex flex-nowrap items-center gap-2 max-sm:overflow-x-auto sm:shrink-0 sm:justify-end">
      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "secondary" })}
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          WhatsApp
        </a>
      ) : null}
      <Link
        href={`/${tenantSlug}/finance?tab=cobros&nuevo=pago&cliente=${customerId}`}
        className={buttonVariants({ variant: "outline" })}
      >
        <Plus aria-hidden="true" className="size-4" />
        Registrar pago
      </Link>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={buttonVariants({ variant: "outline" })}
      >
        <Pencil aria-hidden="true" className="size-3.5" />
        Editar
      </button>

      {editing ? (
        <CustomerSheet
          tenantSlug={tenantSlug}
          customerId={customerId}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}
