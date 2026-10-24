import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { getStaffContext } from "@/lib/ops/access";
import { getAppBaseUrl } from "@/lib/app-url";
import { listBenefitCodes, FIXED_BENEFIT_CODE } from "@/lib/benefits/benefits-db";
import { receiptQrDataUrl } from "@/lib/business/receipt-qr";
import { createBenefitAction, toggleBenefitAction, updateBenefitAction } from "./actions";
import { ContractFields, contractSummary } from "./_components/contract-fields";
import { Select } from "@/components/atoms/select";

export const metadata: Metadata = { title: "Accesos · NEXUS Operations Center" };

const PLAN_LABELS: Record<string, string> = {
  ESSENTIAL: "Esencial",
  ELITE: "Elite",
  SIGNATURE: "Signature",
};

const KIND_LABELS: Record<string, string> = {
  PROMO: "Promo (gratis)",
  PAID: "Acceso pagado",
};

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  active: { text: "Activo", className: "bg-emerald-100 text-emerald-800" },
  inactive: { text: "Pausado", className: "bg-muted text-muted-foreground" },
  expired: { text: "Vencido", className: "bg-amber-100 text-amber-800" },
  exhausted: { text: "Agotado", className: "bg-muted text-muted-foreground" },
};

const inputClass =
  "h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ink";
const labelClass = "grid gap-1 text-xs font-medium text-muted-foreground";

/**
 * Accesos a NEXUS. Hay dos tipos de código:
 *
 * - **PROMO (gratis)**: un regalo o promoción (tarjeta NFC/QR, evento). Quien
 *   lo reclama ve "N días gratis". El QR fijo de las tarjetas es de este tipo.
 * - **PAID (acceso pagado)**: se emite DESPUÉS de confirmar el pago por fuera
 *   (WhatsApp). Quien lo usa ve "cuenta activada", nunca "gratis".
 *
 * Aquí se crean, se listan con su QR para imprimir, se pausan y se editan
 * (plan, días, usos, vencimiento). Todo queda en la auditoría.
 */
export default async function BeneficiosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("catalog.edit")) notFound();

  const { ok, error } = await searchParams;
  const base = await getAppBaseUrl();
  const rows = await listBenefitCodes();
  const qrs = await Promise.all(
    rows.map((row) =>
      receiptQrDataUrl(`${base}/c/${row.code}`).catch(() => null),
    ),
  );

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Producto"
        title="Accesos"
        description="Códigos de acceso a NEXUS. Los promocionales se regalan (tarjetas, eventos) y los de pago se emiten después de confirmar el pago. Quien usa un código pagado ve &quot;cuenta activada&quot;, no &quot;gratis&quot;."
      />

      {ok ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-sm font-semibold">Acceso pagado</h2>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Confirma el pago por fuera (WhatsApp) y emite el código con los días que el cliente
          contrató. Es de un solo uso.
        </p>
        <form action={createBenefitAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="kind" value="PAID" />
          <input type="hidden" name="maxUses" value="1" />
          <label className={`${labelClass} sm:col-span-2 lg:col-span-1`}>
            Cliente
            <input name="label" required placeholder="Restaurante Donde Ana" className={inputClass} />
          </label>
          <label className={labelClass}>
            Plan que otorga
            <Select name="plan" defaultValue="ELITE">
              <option value="ESSENTIAL">Esencial</option>
              <option value="ELITE">Elite</option>
              <option value="SIGNATURE">Signature</option>
            </Select>
          </label>
          <label className={labelClass}>
            Días pagados
            <input name="durationDays" type="number" min={1} max={365} defaultValue={30} className={inputClass} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Referencia del pago (opcional)
            <input name="notes" placeholder="Nequi · ref 12345 · 12 oct" className={inputClass} />
          </label>
          <ContractFields idPrefix="nuevo" />
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-black"
            >
              Emitir acceso pagado
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-sm font-semibold">Código promocional (gratis)</h2>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Regalo o promoción: quien lo reclama ve &quot;N días gratis&quot;. Sin tope de usos, salvo que
          quieras limitarlo.
        </p>
        <form action={createBenefitAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="kind" value="PROMO" />
          <label className={`${labelClass} sm:col-span-2 lg:col-span-1`}>
            Nombre del beneficio
            <input name="label" required placeholder="Mes de regalo — Feria escolar" className={inputClass} />
          </label>
          <label className={labelClass}>
            Código (opcional)
            <input name="code" placeholder="Se genera solo" className={inputClass} />
          </label>
          <label className={labelClass}>
            Plan que otorga
            <Select name="plan" defaultValue="ELITE">
              <option value="ESSENTIAL">Esencial</option>
              <option value="ELITE">Elite</option>
              <option value="SIGNATURE">Signature</option>
            </Select>
          </label>
          <label className={labelClass}>
            Días de regalo
            <input name="durationDays" type="number" min={1} max={365} defaultValue={30} className={inputClass} />
          </label>
          <label className={labelClass}>
            Usos máximos (1 = acceso único)
            <input name="maxUses" type="number" min={1} placeholder="Ilimitado" className={inputClass} />
          </label>
          <label className={labelClass}>
            Vence el (opcional)
            <input name="expiresAt" type="date" className={inputClass} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Notas (opcional)
            <input name="notes" placeholder="Lote, evento, responsable…" className={inputClass} />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-black"
            >
              Crear código promo
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-sm font-semibold">Códigos</h2>
          <p className="text-xs text-muted-foreground">
            Enlace público: <span className="font-mono">{base}/c/…</span>
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
            Aún no hay códigos. Crea el primero arriba.
          </p>
        ) : (
          <ul className="grid gap-3">
            {rows.map((row, index) => {
              const status = STATUS_LABELS[row.status] ?? STATUS_LABELS.active;
              const link = `${base}/c/${row.code}`;
              const qr = qrs[index];
              return (
                <li
                  key={row.id}
                  className="grid gap-4 rounded-xl border border-border bg-surface p-4"
                >
                  {row.code === FIXED_BENEFIT_CODE ? (
                    <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700">
                      QR fijo impreso — <span className="font-mono">{base}/c/{row.code}</span>. No cambies
                      el código; usa Pausar/Activar o edita sus beneficios aquí abajo.
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="grid gap-2 sm:flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold tracking-wider">{row.code}</span>
                        <span
                          className={`rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide ${
                            row.kind === "PAID"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {KIND_LABELS[row.kind] ?? row.kind}
                        </span>
                        <span className={`rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide ${status.className}`}>
                          {status.text}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{row.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {PLAN_LABELS[row.plan] ?? row.plan} · {row.durationDays} días · usos{" "}
                        {row.usedCount}
                        {row.maxUses != null ? `/${row.maxUses}` : " (ilimitado)"} · canjes {row.redemptions}
                        {row.expiresAt ? ` · vence ${row.expiresAt.slice(0, 10)}` : ""}
                      </p>
                      <a href={link} className="break-all font-mono text-[11px] text-muted-foreground underline">
                        {link}
                      </a>
                      {contractSummary(row.terms) ? (
                        <p className="text-xs font-medium text-foreground">Contrato: {contractSummary(row.terms)}</p>
                      ) : null}
                      {row.notes ? <p className="text-xs text-muted-foreground">{row.notes}</p> : null}
                    </div>

                    <div className="flex items-center gap-3 sm:flex-col">
                      {qr ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qr}
                          alt={`QR de ${row.code}`}
                          width={92}
                          height={92}
                          className="size-[92px] rounded-md border border-border bg-white p-1"
                        />
                      ) : null}
                      <form action={toggleBenefitAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="active" value={row.active ? "false" : "true"} />
                        <button
                          type="submit"
                          className="h-9 rounded-md border border-border px-4 text-xs font-semibold transition hover:bg-surface-muted"
                        >
                          {row.active ? "Pausar" : "Activar"}
                        </button>
                      </form>
                    </div>
                  </div>

                  <details className="border-t border-border pt-3">
                    <summary className="cursor-pointer select-none text-xs font-semibold text-muted-foreground">
                      Editar beneficio (plan, días, usos, vencimiento, contrato)
                    </summary>
                    <form
                      action={updateBenefitAction}
                      className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <label className={labelClass}>
                        Nombre del beneficio
                        <input name="label" defaultValue={row.label} required className={inputClass} />
                      </label>
                      <label className={labelClass}>
                        Membresía que otorga
                        <Select name="plan" defaultValue={row.plan}>
                          <option value="ESSENTIAL">Esencial</option>
                          <option value="ELITE">Elite</option>
                          <option value="SIGNATURE">Signature</option>
                        </Select>
                      </label>
                      <label className={labelClass}>
                        Tipo de acceso
                        <Select name="kind" defaultValue={row.kind}>
                          <option value="PROMO">Promo (gratis)</option>
                          <option value="PAID">Acceso pagado</option>
                        </Select>
                      </label>
                      <label className={labelClass}>
                        Días del beneficio
                        <input
                          name="durationDays"
                          type="number"
                          min={1}
                          max={365}
                          defaultValue={row.durationDays}
                          className={inputClass}
                        />
                      </label>
                      <label className={labelClass}>
                        Usos máximos (vacío = ilimitado)
                        <input
                          name="maxUses"
                          type="number"
                          min={1}
                          defaultValue={row.maxUses ?? ""}
                          className={inputClass}
                        />
                      </label>
                      <label className={labelClass}>
                        Vence el (vacío = nunca)
                        <input
                          name="expiresAt"
                          type="date"
                          defaultValue={row.expiresAt ? row.expiresAt.slice(0, 10) : ""}
                          className={inputClass}
                        />
                      </label>
                      <label className={labelClass}>
                        Notas
                        <input name="notes" defaultValue={row.notes ?? ""} className={inputClass} />
                      </label>
                      <ContractFields terms={row.terms} idPrefix={row.id} />
                      <div className="flex items-end sm:col-span-2 lg:col-span-3">
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center rounded-md bg-ink px-5 text-xs font-semibold text-white transition hover:bg-black"
                        >
                          Guardar cambios
                        </button>
                      </div>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
