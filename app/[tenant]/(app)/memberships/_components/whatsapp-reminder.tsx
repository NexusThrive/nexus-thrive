"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  expiryReminderMessage,
  normalizeWhatsAppPhone,
  plainFromInstant,
  whatsappReminderLink,
} from "@/lib/memberships";
import { formatDateShort } from "@/lib/format";
import type { MembershipViewRow } from "./membership-table";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";

/**
 * Previsualización del recordatorio de vencimiento por WhatsApp.
 * No se envía nada automáticamente: solo se abre wa.me con el mensaje
 * pre-cargado. Si el cliente no tiene teléfono, permite copiarlo.
 */
export default function WhatsAppReminder({
  membership,
  onClose,
}: {
  membership: MembershipViewRow;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const endPlain = plainFromInstant(membership.endDate);
  const message = expiryReminderMessage(membership.customerName, endPlain);
  const phone = normalizeWhatsAppPhone(membership.customerPhone);
  const link = whatsappReminderLink(membership.customerPhone, message);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Recordatorio de vencimiento"
      description={<>{membership.customerName} · vence{" "} {formatDateShort(membership.endDate)}</>}
    >
        <div className="mt-4">
          <p className="text-sm font-medium text-foreground/80">Mensaje</p>
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-muted p-3 text-sm text-foreground/80">
            {message}
          </p>
          {phone ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Se abrirá WhatsApp para el número{" "}
              <span className="font-medium text-foreground/80">+{phone}</span>.
            </p>
          ) : (
            <p className="mt-2 text-xs text-warning-foreground">
              Este cliente no tiene teléfono registrado: copia el mensaje y
              envíalo por tu cuenta.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={copyMessage}
            className={buttonVariants({ variant: "outline" })}
          >
            {copied ? (
              <Check aria-hidden="true" className="h-4 w-4 text-success" />
            ) : (
              <Copy aria-hidden="true" className="h-4 w-4" />
            )}
            {copied ? "Copiado" : "Copiar mensaje"}
          </button>
          {phone ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-success px-4 text-sm font-medium text-success-foreground transition hover:bg-success/90"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              Abrir WhatsApp
            </a>
          ) : null}
        </div>
      
    </ResponsiveSheet>
  );
}
