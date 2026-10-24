"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Switch } from "@/components/atoms/switch";
import { EmptyState } from "@/components/molecules/empty-state";
import { useToast } from "@/components/molecules/toast";
import { connectSandboxAction, retryAction, setEnabledAction, submitAction, type FiscalResult } from "@/app/[tenant]/(app)/factura-electronica/actions";
import { FISCAL_LABELS } from "@/lib/einvoice/port";
import type { FiscalRow } from "@/lib/einvoice/einvoice-db";
import { formatCurrency } from "@/lib/format";

const STATUS = { PENDING_PROVIDER: { label: "En cola", tone: "warning" }, SUBMITTED: { label: "Enviado", tone: "secondary" }, ACCEPTED: { label: "Aceptado", tone: "success" }, REJECTED: { label: "Rechazado", tone: "destructive" } } as const;

export default function FiscalView({ slug, settings, docs }: { slug: string; settings: { enabled: boolean; provider: string | null; connected: boolean; pending: number }; docs: FiscalRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<"all" | keyof typeof STATUS>("all");
  const run = (fn: () => Promise<FiscalResult>) =>
    start(async () => {
      const r = await fn();
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok) router.refresh();
    });
  const list = docs.filter((d) => filter === "all" || d.status === filter);
  return (
    <div className="grid gap-4">
      <section aria-labelledby="fiscal-settings" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="fiscal-settings" className="font-display text-[15px] font-semibold">Facturación electrónica</h2>
          <label className="ml-auto flex items-center gap-2 text-[13px]">
            <Switch checked={settings.enabled} disabled={pending} onCheckedChange={(v) => run(() => setEnabledAction(slug, v))} aria-label="Generar documento fiscal de cada venta" />
            Generar el documento fiscal de cada venta
          </label>
        </div>
        <p className="text-[13px] text-muted-foreground">NEXUS arma el documento y se lo entrega a un proveedor tecnológico autorizado; no firma ni emite por su cuenta. Vender nunca se bloquea: si el proveedor no responde, el documento espera en cola.</p>
        {settings.enabled && !settings.connected ? (
          <Alert tone="warning">
            Aún no hay proveedor conectado: los documentos esperan en cola.
            <button type="button" disabled={pending} onClick={() => run(() => connectSandboxAction(slug))} className={buttonVariants({ variant: "outline", size: "sm", className: "ml-3" })}>Conectar proveedor de prueba</button>
          </Alert>
        ) : null}
        {settings.connected ? <p className="text-[13px]">Proveedor: <b>{settings.provider === "sandbox" ? "Proveedor de prueba (no es ante la DIAN)" : settings.provider}</b> · {settings.pending} en cola</p> : null}
        {settings.connected ? <button type="button" disabled={pending || settings.pending === 0} onClick={() => run(() => submitAction(slug))} className={buttonVariants({ className: "justify-self-start" })}>{pending ? "Enviando…" : "Enviar los pendientes"}</button> : null}
      </section>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        {(["all", "PENDING_PROVIDER", "ACCEPTED", "REJECTED"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={buttonVariants({ variant: filter === f ? "default" : "outline", size: "sm" })}>
            {f === "all" ? "Todos" : STATUS[f].label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState title="Sin documentos fiscales" description={settings.enabled ? "Cada venta, nota crédito o débito que hagas aparecerá aquí." : "Activa la factura electrónica para que cada venta deje su documento fiscal."} />
      ) : (
        <div role="region" aria-label="Documentos fiscales" tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-accent">
          <table className="w-full min-w-[720px] text-[13px]">
            <caption className="sr-only">Documentos fiscales con su estado</caption>
            <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
              <tr><th scope="col" className="px-3 py-2 font-medium">Documento</th><th scope="col" className="px-3 py-2 font-medium">Adquirente</th><th scope="col" className="px-3 py-2 text-right font-medium">Total</th><th scope="col" className="px-3 py-2 font-medium">Estado</th><th scope="col" className="px-3 py-2"><span className="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((d) => (
                <tr key={d.id}>
                  <th scope="row" className="px-3 py-2 text-left font-normal"><span className="font-mono font-semibold">{d.code}</span><small className="block text-xs text-muted-foreground">{FISCAL_LABELS[d.kind]}</small></th>
                  <td className="px-3 py-2">{d.acquirer}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(d.total)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS[d.status as keyof typeof STATUS]?.tone ?? "secondary"}>{STATUS[d.status as keyof typeof STATUS]?.label ?? d.status}</Badge>
                    {d.rejectReason ? <small className="mt-1 block max-w-xs text-xs text-danger">{d.rejectReason}</small> : null}
                    {d.cufe ? <small className="mt-1 block max-w-[220px] truncate font-mono text-[11px] text-muted-foreground" title={d.cufe}>CUFE {d.cufe}</small> : null}
                  </td>
                  <td className="px-3 py-2 text-right">{d.status === "REJECTED" ? <button type="button" disabled={pending} aria-label={`Reintentar ${d.code}`} onClick={() => run(() => retryAction(slug, d.id))} className={buttonVariants({ variant: "outline", size: "sm" })}>Reintentar</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
