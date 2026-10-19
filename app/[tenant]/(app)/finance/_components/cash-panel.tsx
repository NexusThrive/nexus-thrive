"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Lock, LockOpen, Plus, RefreshCcw, Scale, Ticket } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, selectClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { MoneyInput } from "@/components/molecules/money-input";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { arqueo, CASH_KIND_LABELS, CASH_SIGN, replenishNeeded, type CashKind } from "@/lib/business/cash";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cashMovementAction, closeCashAction, openCashAction, saveCashBoxAction } from "../money-actions";

type Box = { id: string; name: string; fundAmount: number; responsibleUserId: string | null; openSession: { id: string; openedAt: string; openingAmount: number; expected: number } | null };
type Move = { id: string; kind: CashKind; amount: number; description: string; beneficiary: string | null; createdAt: string };
type History = { id: string; openedAt: string; closedAt: string; expected: number; counted: number; difference: number; notes: string | null };
type Member = { id: string; name: string };

const MOVES: { kind: Exclude<CashKind, "OPENING">; label: string; icon: typeof Plus; manage?: boolean }[] = [
  { kind: "INCOME", label: "Ingreso", icon: ArrowDownLeft },
  { kind: "EXPENSE", label: "Gasto", icon: ArrowUpRight },
  { kind: "VOUCHER", label: "Vale", icon: Ticket },
  { kind: "REPLENISH", label: "Reposición", icon: RefreshCcw },
  { kind: "ADJUST", label: "Ajuste", icon: Scale, manage: true },
];

/**
 * Caja menor real: fondo fijo con responsable, turno con apertura,
 * movimientos (ingresos, gastos, vales a nombre de alguien, reposiciones) y
 * cierre con arqueo. Los cobros en efectivo y los gastos "de caja" entran
 * solos al turno abierto.
 */
export default function CashPanel({ slug, boxes, moves, history, members, canManage }: { slug: string; boxes: Box[]; moves: Move[]; history: History[]; members: Member[]; canManage: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const [boxForm, setBoxForm] = useState<{ id?: string; name: string; fund: number | null; responsibleUserId: string } | null>(boxes.length ? null : { name: "Caja principal", fund: 300000, responsibleUserId: "" });
  const [opening, setOpening] = useState<number | null>(boxes[0]?.fundAmount ?? null);
  const [move, setMove] = useState<{ kind: Exclude<CashKind, "OPENING">; amount: number | null; description: string; beneficiary: string } | null>(null);
  const [closing, setClosing] = useState<{ counted: number | null; notes: string } | null>(null);
  const box = boxes[0] ?? null;
  const session = box?.openSession ?? null;
  const current = session?.expected ?? 0;

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast(r.message ?? "Listo", "success");
        after?.();
        router.refresh();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });

  if (!box || boxForm) {
    return (
      <section className="grid max-w-xl gap-4 rounded-lg border border-border bg-surface p-[18px]">
        <div>
          <h2 className="font-display text-[17px] font-semibold">{box ? "Editar caja" : "Crea tu caja menor"}</h2>
          <p className="text-[13px] text-muted-foreground">Un fondo fijo de efectivo para gastos pequeños. Cada turno se abre, se mueve y se cierra contando el efectivo.</p>
        </div>
        {canManage ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nombre">{(c) => <input {...c} value={boxForm?.name ?? ""} onChange={(e) => setBoxForm({ ...boxForm!, name: e.target.value })} className={inputClasses} />}</Field>
              <Field label="Fondo fijo" hint="Monto al que se repone la caja.">
                {(c) => <MoneyInput id={c.id} value={boxForm?.fund ?? null} onValueChange={(v) => setBoxForm({ ...boxForm!, fund: v })} />}
              </Field>
            </div>
            <Field label="Responsable">
              {(c) => (
                <select {...c} value={boxForm?.responsibleUserId ?? ""} onChange={(e) => setBoxForm({ ...boxForm!, responsibleUserId: e.target.value })} className={selectClasses}>
                  <option value="">Sin responsable fijo</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="flex gap-2">
              {box ? (
                <button type="button" onClick={() => setBoxForm(null)} className={buttonVariants({ variant: "outline" })}>
                  Cancelar
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => saveCashBoxAction(slug, { id: boxForm?.id, name: boxForm?.name ?? "", fund: String(boxForm?.fund ?? ""), responsibleUserId: boxForm?.responsibleUserId || null }), () => setBoxForm(null))}
                className={buttonVariants()}
              >
                {box ? "Guardar" : "Crear caja"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-muted-foreground">Pídele al dueño o a administración que cree la caja.</p>
        )}
      </section>
    );
  }

  const responsible = members.find((m) => m.id === box.responsibleUserId)?.name;
  const need = replenishNeeded(box.fundAmount, current);
  const result = closing?.counted != null ? arqueo(current, closing.counted) : null;

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 rounded-lg bg-ink p-[18px] text-[#F7F6F3] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-1">
          <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#A1A1A8]">
            {box.name} · fondo {formatCurrency(box.fundAmount)}
            {responsible ? ` · ${responsible}` : ""}
          </p>
          <p className="font-display text-[38px] font-bold leading-none tabular-nums">{session ? formatCurrency(current) : "Cerrada"}</p>
          <p className="text-[13px] text-[#A1A1A8]">{session ? `Efectivo esperado · turno abierto ${formatDateTime(session.openedAt)}` : "Abre el turno para registrar movimientos."}</p>
          {session && need > 0 ? <p className="text-[12.5px] text-[#D4AF37]">Faltan {formatCurrency(need)} para volver al fondo fijo.</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <button type="button" onClick={() => setBoxForm({ id: box.id, name: box.name, fund: box.fundAmount, responsibleUserId: box.responsibleUserId ?? "" })} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-[#3A3A40] text-[#F7F6F3] hover:bg-[#1E1E21]")}>
              Editar caja
            </button>
          ) : null}
          {session ? (
            <button type="button" onClick={() => setClosing({ counted: null, notes: "" })} className={buttonVariants({ variant: "accent", size: "sm" })}>
              <Lock aria-hidden="true" className="size-3.5" /> Cerrar con arqueo
            </button>
          ) : null}
        </div>
      </section>

      {!session ? (
        <section className="grid max-w-md gap-3 rounded-lg border border-border bg-surface p-[18px]">
          <Field label="¿Con cuánto efectivo abres?" hint="Cuenta el efectivo antes de empezar.">
            {(c) => <MoneyInput id={c.id} value={opening} onValueChange={setOpening} />}
          </Field>
          <button type="button" disabled={pending} onClick={() => run(() => openCashAction(slug, box.id, String(opening ?? "")))} className={buttonVariants({ className: "justify-self-start" })}>
            <LockOpen aria-hidden="true" className="size-4" /> Abrir caja
          </button>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {MOVES.filter((m) => !m.manage || canManage).map((m) => (
              <button key={m.kind} type="button" onClick={() => setMove({ kind: m.kind, amount: m.kind === "REPLENISH" && need > 0 ? need : null, description: m.kind === "REPLENISH" ? "Reposición del fondo" : "", beneficiary: "" })} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <m.icon aria-hidden="true" className="size-3.5" /> {m.label}
              </button>
            ))}
          </div>
          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <h3 className="border-b border-border px-[18px] py-3 font-display text-[15px] font-semibold">Movimientos del turno</h3>
            <ul className="divide-y divide-border">
              {[...moves].reverse().map((m) => {
                const sign = m.kind === "ADJUST" ? Math.sign(m.amount) : CASH_SIGN[m.kind];
                return (
                  <li key={m.id} className="flex items-center gap-3 px-[18px] py-2.5 text-[13.5px]">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate font-medium">{m.description}</b>
                      <small className="text-xs text-muted-foreground">
                        {CASH_KIND_LABELS[m.kind]}
                        {m.beneficiary ? ` · para ${m.beneficiary}` : ""} · {formatDateTime(m.createdAt)}
                      </small>
                    </span>
                    <span className={cn("font-mono tabular-nums", sign > 0 ? "text-success" : "text-danger")}>
                      {sign > 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(m.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {history.length ? (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <h3 className="border-b border-border px-[18px] py-3 font-display text-[15px] font-semibold">Cierres anteriores</h3>
          <ul className="divide-y divide-border">
            {history.map((h) => {
              const a = arqueo(h.expected, h.counted);
              return (
                <li key={h.id} className="grid gap-1 px-[18px] py-2.5 text-[13px] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <span>
                    {formatDateTime(h.closedAt)} · esperado {formatCurrency(h.expected)} · contado {formatCurrency(h.counted)}
                    {h.notes ? <small className="block text-xs text-muted-foreground">{h.notes}</small> : null}
                  </span>
                  <Badge tone={a.status === "cuadra" ? "success" : a.status === "sobra" ? "warning" : "danger"}>{a.status === "cuadra" ? "Cuadró" : `${a.status === "sobra" ? "Sobró" : "Faltó"} ${formatCurrency(Math.abs(a.difference))}`}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {move ? (
        <ResponsiveSheet
          open
          onOpenChange={(o) => !o && setMove(null)}
          title={CASH_KIND_LABELS[move.kind]}
          description={`Efectivo en caja: ${formatCurrency(current)}`}
          footer={
            <>
              <button type="button" onClick={() => setMove(null)} className={buttonVariants({ variant: "outline" })}>
                Cancelar
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => cashMovementAction(slug, { kind: move.kind, amount: String(move.amount ?? ""), description: move.description, beneficiary: move.beneficiary }), () => setMove(null))} className={buttonVariants()}>
                Registrar
              </button>
            </>
          }
        >
          <div className="grid gap-4">
            <Field label="Monto" required hint={move.kind === "ADJUST" ? "Positivo si sobra efectivo, negativo si falta." : undefined}>
              {(c) => (move.kind === "ADJUST" ? <input {...c} inputMode="decimal" value={move.amount ?? ""} onChange={(e) => setMove({ ...move, amount: e.target.value ? Number(e.target.value.replace(",", ".")) : null })} className={inputClasses} /> : <MoneyInput id={c.id} value={move.amount} onValueChange={(v) => setMove({ ...move, amount: v })} />)}
            </Field>
            <Field label="Descripción" required>
              {(c) => <input {...c} value={move.description} onChange={(e) => setMove({ ...move, description: e.target.value })} className={inputClasses} placeholder={move.kind === "VOUCHER" ? "Transporte a proveedor" : "Café y aseo"} />}
            </Field>
            {move.kind === "VOUCHER" ? (
              <Field label="Para quién es el vale" required>
                {(c) => <input {...c} value={move.beneficiary} onChange={(e) => setMove({ ...move, beneficiary: e.target.value })} className={inputClasses} />}
              </Field>
            ) : null}
          </div>
        </ResponsiveSheet>
      ) : null}

      {closing ? (
        <ResponsiveSheet
          open
          onOpenChange={(o) => !o && setClosing(null)}
          title="Cerrar caja con arqueo"
          description="Cuenta el efectivo que hay físicamente en la caja."
          footer={
            <>
              <button type="button" onClick={() => setClosing(null)} className={buttonVariants({ variant: "outline" })}>
                Cancelar
              </button>
              <button type="button" disabled={pending || closing.counted == null} onClick={() => run(() => closeCashAction(slug, String(closing.counted ?? ""), closing.notes), () => setClosing(null))} className={buttonVariants()}>
                Cerrar turno
              </button>
            </>
          }
        >
          <div className="grid gap-4">
            <p className="flex justify-between text-[13.5px]">
              <span className="text-muted-foreground">Efectivo esperado</span>
              <b className="font-mono tabular-nums">{formatCurrency(current)}</b>
            </p>
            <Field label="Efectivo contado" required>
              {(c) => <MoneyInput id={c.id} value={closing.counted} onValueChange={(v) => setClosing({ ...closing, counted: v })} />}
            </Field>
            {result ? (
              <p className={cn("rounded-md p-3 text-[13.5px] font-medium", result.status === "cuadra" ? "bg-success-subtle text-success" : result.status === "sobra" ? "bg-warning/15 text-warning-foreground" : "bg-danger-subtle text-danger")}>
                {result.status === "cuadra" ? "La caja cuadra." : `${result.status === "sobra" ? "Sobran" : "Faltan"} ${formatCurrency(Math.abs(result.difference))}.`}
              </p>
            ) : null}
            <Field label="Observaciones" hint={result && result.status !== "cuadra" ? "Explica la diferencia." : undefined}>
              {(c) => <input {...c} value={closing.notes} onChange={(e) => setClosing({ ...closing, notes: e.target.value })} className={inputClasses} />}
            </Field>
          </div>
        </ResponsiveSheet>
      ) : null}
    </div>
  );
}
