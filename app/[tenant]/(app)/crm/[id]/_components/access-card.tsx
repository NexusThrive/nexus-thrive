"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nfc, Printer, QrCode as QrIcon, RefreshCw } from "lucide-react";
import { Badge, type StatusTone } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { QrCode } from "@/components/atoms/qr-code";
import { useToast } from "@/components/molecules/toast";
import { countdown, STATE_LABELS } from "@/lib/business/gym";
import type { MemberStatus } from "@/lib/business/gym-db";
import { cn } from "@/lib/utils";
import { accessCodeAction, linkNfcAction, type AccessActionResult } from "../access-actions";

const TONE: Record<MemberStatus["state"], StatusTone> = { active: "success", frozen: "neutral", expired: "danger", cancelled: "muted", upcoming: "neutral", none: "muted" };

type NdefReader = { scan: (o?: { signal?: AbortSignal }) => Promise<void>; onreading: ((e: { serialNumber: string }) => void) | null };

/** Acceso del socio: estado y contador [9], QR para la puerta, tarjeta NFC y carné imprimible. */
export default function AccessCard({ slug, customerId, code, nfcUid, status }: { slug: string; customerId: string; code: string | null; nfcUid: string | null; status: MemberStatus }) {
  const [uid, setUid] = useState(nfcUid ?? "");
  const [editingNfc, setEditingNfc] = useState(false);
  const [canReadNfc, setCanReadNfc] = useState(false);
  const [now, setNow] = useState(0);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanReadNfc("NDEFReader" in window);
    const tick = () => setNow(Date.now());
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, []);

  const run = (p: Promise<AccessActionResult>, after?: () => void) =>
    start(async () => {
      const r = await p;
      if (r.ok) {
        toast(r.message ?? "Listo", "success");
        after?.();
        router.refresh();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });

  const readNfc = () => {
    const ctrl = new AbortController();
    const reader = new (window as unknown as { NDEFReader: new () => NdefReader }).NDEFReader();
    reader.onreading = (e) => {
      setUid(e.serialNumber.toUpperCase());
      ctrl.abort();
    };
    reader.scan({ signal: ctrl.signal }).catch(() => toast({ title: "NFC no disponible", description: "Activa el NFC del teléfono.", variant: "error" }));
    toast("Acerca la tarjeta al teléfono", "success");
  };

  const cd = status.endsAt && now ? countdown(status.endsAt, now) : null;

  return (
    <section className="rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border px-[18px] py-3">
        <h2 className="font-display text-[15px] font-semibold">Acceso al gimnasio</h2>
        <Badge tone={TONE[status.state]}>{status.state === "none" ? "Sin membresía" : STATE_LABELS[status.state]}</Badge>
      </header>
      <div className="grid gap-4 p-[18px]">
        {cd ? (
          <div className={cn("rounded-md px-3 py-2.5", cd.expired ? "bg-rose-500/10" : cd.urgent ? "bg-amber-500/10" : "bg-surface-muted")}>
            <p className="text-xs text-muted-foreground">{cd.expired ? "Membresía" : status.state === "frozen" ? "Congelada · tiempo guardado" : "Tiempo restante"}</p>
            <p className="font-mono text-lg font-semibold tabular-nums">{cd.text}</p>
          </div>
        ) : null}

        {code ? (
          <div className="flex items-center gap-4">
            <QrCode value={code} size={112} label={`QR de acceso ${code}`} />
            <div className="grid gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Código de socio (para el QR)</p>
                <p className="font-mono text-lg font-semibold tracking-widest">{code}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/${slug}/crm/${customerId}/carnet`} target="_blank" className={buttonVariants({ size: "sm", variant: "outline" })}>
                  <Printer aria-hidden="true" className="size-3.5" /> Carné
                </Link>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => window.confirm("El QR actual dejará de funcionar. ¿Generar uno nuevo?") && run(accessCodeAction(slug, customerId, true))}
                  className={buttonVariants({ size: "sm", variant: "ghost" })}
                >
                  <RefreshCw aria-hidden="true" className="size-3.5" /> Nuevo
                </button>
              </div>
              <p className="text-[12px] text-muted-foreground">
                El QR es como una tarjeta: personal. Si se pierde o alguien lo fotografía, genera
                uno nuevo con <b>Nuevo</b> y el anterior deja de servir.
              </p>
            </div>
          </div>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(accessCodeAction(slug, customerId, false))} className={buttonVariants({ size: "sm" })}>
            <QrIcon aria-hidden="true" className="size-3.5" /> Crear QR de acceso
          </button>
        )}

        <div className="grid gap-2 border-t border-border pt-3">
          <p className="flex items-center gap-2 text-[13px]">
            <Nfc aria-hidden="true" className="size-4 text-muted-foreground" />
            {nfcUid ? <>Tarjeta <b className="font-mono">{nfcUid}</b></> : "Sin tarjeta NFC"}
            <button type="button" onClick={() => setEditingNfc((v) => !v)} className="ml-auto text-xs font-medium text-accent-text hover:underline">
              {nfcUid ? "Cambiar" : "Vincular"}
            </button>
          </p>
          {editingNfc ? (
            <div className="grid gap-2">
              <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Número de serie de la etiqueta (p. ej. 04A1B2C3D4E5)" aria-label="Código de la tarjeta NFC" className={inputClasses} />
              <p className="text-[12px] text-muted-foreground">
                Es el <b>número de serie del chip</b> de la etiqueta NFC (no una URL ni un código de
                NEXUS). Léelo con una app de NFC del teléfono (TagInfo, NFC Tools) o con{" "}
                <b>&quot;Leer con este teléfono&quot;</b> si usas Chrome en Android.
              </p>
              <div className="flex flex-wrap gap-2">
                {canReadNfc ? (
                  <button type="button" onClick={readNfc} className={buttonVariants({ size: "sm", variant: "outline" })}>
                    Leer con este teléfono
                  </button>
                ) : null}
                <button type="button" disabled={pending || !uid.trim()} onClick={() => run(linkNfcAction(slug, customerId, uid), () => setEditingNfc(false))} className={buttonVariants({ size: "sm" })}>
                  Guardar tarjeta
                </button>
                {nfcUid ? (
                  <button type="button" disabled={pending} onClick={() => run(linkNfcAction(slug, customerId, null), () => setEditingNfc(false))} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                    Quitar
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
