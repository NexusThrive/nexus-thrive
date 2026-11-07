"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Pencil, Plus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { whatsappReminderLink } from "@/lib/industry/gym/memberships";
import CustomerSheet from "../../_components/customer-sheet";
import AssignMembership from "./assign-membership";

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
  assignMembership = null,
}: {
  tenantSlug: string;
  tenantName: string;
  customerId: string;
  customerName: string;
  phone: string | null;
  assignMembership?: { hasActive: boolean; canCharge: boolean } | null;
}) {
  const [editing, setEditing] = useState(false);
  const whatsappHref = phone
    ? whatsappReminderLink(phone, `Hola ${customerName}, te escribimos desde ${tenantName}.`)
    : null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:flex-wrap sm:items-center sm:justify-end">
      {assignMembership ? (
        <AssignMembership
          tenantSlug={tenantSlug}
          customerId={customerId}
          customerName={customerName}
          hasActive={assignMembership.hasActive}
          canCharge={assignMembership.canCharge}
          className="col-span-2 w-full sm:w-auto"
        />
      ) : null}
      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "secondary", className: "w-full sm:w-auto" })}
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          WhatsApp
        </a>
      ) : null}
      <Link
        href={`/${tenantSlug}/finanzas?tab=cobros&nuevo=pago&cliente=${customerId}`}
        className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
      >
        <Plus aria-hidden="true" className="size-4" />
        Registrar pago
      </Link>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
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
