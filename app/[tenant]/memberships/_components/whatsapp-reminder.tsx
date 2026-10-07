"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import {
  expiryReminderMessage,
  normalizeWhatsAppPhone,
  plainFromInstant,
  whatsappReminderLink,
} from "@/lib/memberships";
import { formatDateShort } from "@/lib/format";
import type { MembershipViewRow } from "./membership-table";

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

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-modal-title"
        className="relative mt-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:mt-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="whatsapp-modal-title"
              className="text-lg font-semibold text-slate-900"
            >
              Recordatorio de vencimiento
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {membership.customerName} · vence{" "}
              {formatDateShort(membership.endDate)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="-m-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">Mensaje</p>
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {message}
          </p>
          {phone ? (
            <p className="mt-2 text-xs text-slate-500">
              Se abrirá WhatsApp para el número{" "}
              <span className="font-medium text-slate-700">+{phone}</span>.
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-600">
              Este cliente no tiene teléfono registrado: copia el mensaje y
              envíalo por tu cuenta.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={copyMessage}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {copied ? (
              <Check aria-hidden="true" className="h-4 w-4 text-emerald-600" />
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
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              Abrir WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
