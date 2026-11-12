"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Lock, Check, LockOpen, Plus, RefreshCcw, Scale, Ticket, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { MoneyInput } from "@/components/molecules/money-input";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { arqueo, CASH_KIND_LABELS, CASH_SIGN, replenishNeeded, type CashKind } from "@/lib/business/sales/cash";
import { formatCurrency, formatDateTime } from "@/lib/foundation/format";
import { cn } from "@/lib/utils";
import { cashMovementAction, closeCashAction, openCashAction, saveCashBoxAction } from "@/app/[tenant]/(app)/finanzas/money-actions";
import { Select } from "@/components/atoms/select";

type Box = { id: string; name: string; fundAmount: number; responsibleUserId: string | null; openSession: { id: string; openedAt: string; openingAmount: number; expected: number } | null };
type Move = { id: string; kind: CashKind; amount: number; description: string; beneficiary: string | null; createdAt: string };
type History = { id: string; openedAt: string; closedAt: string; expected: number; counted: number; difference: number; notes: string | null };
type Member = { id: string; name: string };

const widget = "rounded-(--radius-widget) border border-border/60 bg-card p-6";
const field = "h-11 rounded-2xl border-border/60";
const pillOutline = cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full border-border/60 bg-transparent px-5");
const pillAccent = cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold");
const soft = "rounded-2xl bg-surface-muted/60";

const MOVES: { kind: Exclude<CashKind, "OPENING">; label: string; hint: string; icon: typeof Plus; manage?: boolean }[] = [
  { kind: "INCOME", label: "Ingreso", hint: "Entra efectivo", icon: ArrowDownLeft },
  { kind: "EXPENSE", label: "Gasto", hint: "Sale efectivo", icon: ArrowUpRight },
  { kind: "VOUCHER", label: "Vale", hint: "A nombre de alguien", icon: Ticket },
  { kind: "REPLENISH", label: "Reposición", hint: "Vuelve al fondo", icon: RefreshCcw },
  { kind: "ADJUST", label: "Ajuste", hint: "Sobra o falta", icon: Scale, manage: true },
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
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
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
      <section className={cn(widget, "grid max-w-xl gap-5")}>
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent-text">
            <Wallet className="size-5" strokeWidth={1.7} />
          </span>
          <div className="grid gap-1">
            <h2 className="font-display text-lg font-semibold">{box ? "Editar caja" : "Crea tu caja menor"}</h2>
            <p className="text-ui text-muted-foreground">Un fondo fijo de efectivo para gastos pequeños. Cada turno se abre, se mueve y se cierra contando el efectivo.</p>
          </div>
        </div>
        {canManage ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nombre">{(c) => <input {...c} value={boxForm?.name ?? ""} onChange={(e) => setBoxForm({ ...boxForm!, name: e.target.value })} className={cn(inputClasses, field)} />}</Field>
              <Field label="Fondo fijo" hint="Monto al que se repone la caja.">
                {(c) => <MoneyInput id={c.id} className={field} value={boxForm?.fund ?? null} onValueChange={(v) => setBoxForm({ ...boxForm!, fund: v })} />}
              </Field>
            </div>
            <Field label="Responsable">
              {(c) => (
                <Select {...c} className="h-11 rounded-2xl" value={boxForm?.responsibleUserId ?? ""} onChange={(e) => setBoxForm({ ...boxForm!, responsibleUserId: e.target.value })}>
                  <option value="">Sin responsable fijo</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex flex-wrap gap-2">
              {box ? (
                <button type="button" onClick={() => setBoxForm(null)} className={pillOutline}>
                  Cancelar
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => saveCashBoxAction(slug, { id: boxForm?.id, name: boxForm?.name ?? "", fund: String(boxForm?.fund ?? ""), responsibleUserId: boxForm?.responsibleUserId || null }), () => setBoxForm(null))}
                className={pillAccent}
              >
                {box ? "Guardar" : "Crear caja"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-ui text-muted-foreground">Pídele al dueño o a administración que cree la caja.</p>
        )}
      </section>
    );
  }

  const responsible = members.find((m) => m.id === box.responsibleUserId)?.name;
  const need = replenishNeeded(box.fundAmount, current);
  const result = closing?.counted != null ? arqueo(current, closing.counted) : null;
  const ledger = moves.filter((m) => m.kind !== "OPENING");
  const signOf = (m: Move) => (m.kind === "ADJUST" ? Math.sign(m.amount) : CASH_SIGN[m.kind]);
  const moneyIn = ledger.filter((m) => signOf(m) > 0).reduce((t, m) => t + Math.abs(m.amount), 0);
  const moneyOut = ledger.filter((m) => signOf(m) < 0).reduce((t, m) => t + Math.abs(m.amount), 0);
  const shown = ledger.filter((m) => filter === "all" || (filter === "in" ? signOf(m) > 0 : signOf(m) < 0));
  const fundPct = box.fundAmount > 0 ? Math.max(0, Math.min(100, Math.round((current / box.fundAmount) * 100))) : 0;
  const steps = [
    { label: "Apertura", done: !!session, text: session ? `${formatCurrency(session.openingAmount)} · ${formatDateTime(session.openedAt)}` : "Cuenta el efectivo y abre el turno" },
    { label: "Movimientos", done: !!session && ledger.length > 0, text: session ? `${ledger.length} ${ledger.length === 1 ? "registrado" : "registrados"}` : "Ingresos, gastos y vales" },
    { label: "Cierre con arqueo", done: false, text: "Cuenta lo que hay y compáralo" },
  ];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid min-w-0 gap-4">
        <section aria-label="Efectivo en caja" className="grid gap-5 rounded-(--radius-widget) bg-accent p-6 text-ink">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1.5">
              <p className="text-xs font-medium text-ink/70">
                {box.name}
                {responsible ? ` · ${responsible}` : ""}
              </p>
              <p className="font-display text-4xl font-semibold leading-none tracking-tight tabular-nums sm:text-5xl">{session ? formatCurrency(current) : "Cerrada"}</p>
              <p className="text-ui text-ink/70">{session ? "Efectivo esperado en caja" : "Abre el turno para registrar movimientos."}</p>
            </div>
            {canManage ? (
              <button type="button" onClick={() => setBoxForm({ id: box.id, name: box.name, fund: box.fundAmount, responsibleUserId: box.responsibleUserId ?? "" })} className="h-10 rounded-full bg-ink/10 px-4 text-sm font-semibold text-ink outline-none transition-colors hover:bg-ink/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                Editar caja
              </button>
            ) : null}
          </div>
          {session ? (
            <div className="grid gap-2">
              <div role="img" aria-label={`El efectivo es el ${fundPct} % del fondo fijo`} className="h-3 overflow-hidden rounded-full bg-ink/10">
                <i className="block h-full rounded-full bg-ink/70" style={{ width: `${fundPct}%` }} />
              </div>
              <p className="flex flex-wrap justify-between gap-2 text-xs text-ink/70">
                <span>{fundPct} % del fondo fijo de {formatCurrency(box.fundAmount)}</span>
                <span className="font-medium text-ink">{need > 0 ? `Faltan ${formatCurrency(need)} para reponer` : "Fondo completo"}</span>
              </p>
            </div>
          ) : null}
          <dl className="grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-2xl bg-ink/10 px-4 py-3">
              <dt className="text-xs text-ink/70">Fondo fijo</dt>
              <dd className="text-ui font-semibold tabular-nums">{formatCurrency(box.fundAmount)}</dd>
            </div>
            <div className="rounded-2xl bg-ink/10 px-4 py-3">
              <dt className="text-xs text-ink/70">Entró en el turno</dt>
              <dd className="text-ui font-semibold tabular-nums">{session ? `+${formatCurrency(moneyIn)}` : "—"}</dd>
            </div>
            <div className="rounded-2xl bg-ink/10 px-4 py-3">
              <dt className="text-xs text-ink/70">Salió en el turno</dt>
              <dd className="text-ui font-semibold tabular-nums">{session ? `−${formatCurrency(moneyOut)}` : "—"}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="caja-movs" className={cn(widget, "grid gap-4")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <h3 id="caja-movs" className="text-ui font-semibold">
                Movimientos del turno
              </h3>
              <p className="text-xs text-muted-foreground">{session ? "Lo más reciente primero" : "Se llenan cuando abres el turno"}</p>
            </div>
            {ledger.length > 0 ? (
              <SegmentedControl ariaLabel="Tipo de movimiento" value={filter} onChange={setFilter} options={[{ value: "all", label: "Todo" }, { value: "in", label: "Entradas" }, { value: "out", label: "Salidas" }]} />
            ) : null}
          </div>
          {shown.length === 0 ? (
            <EmptyState
              mark="center"
              remember={false}
              icon={<Wallet />}
              title={ledger.length === 0 ? "Aún no hay movimientos" : "Nada en este filtro"}
              description={session ? "Registra un ingreso, un gasto o un vale desde el panel de la derecha. Los cobros en efectivo entran solos." : "Abre el turno desde el panel de la derecha para empezar."}
            />
          ) : (
            <ul className="grid gap-2">
              {[...shown].reverse().map((m) => {
                const sign = signOf(m);
                const Icon = MOVES.find((x) => x.kind === m.kind)?.icon ?? Wallet;
                return (
                  <li key={m.id} className={cn(soft, "nx-rise flex min-h-[64px] items-center gap-3 px-4 py-3 text-ui")}>
                    <span aria-hidden="true" className={cn("grid size-10 shrink-0 place-items-center rounded-full", sign > 0 ? "bg-card text-foreground" : "bg-accent-subtle text-accent-text")}>
                      <Icon className="size-4" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate font-medium">{m.description}</b>
                      <small className="text-xs text-muted-foreground">
                        {CASH_KIND_LABELS[m.kind]}
                        {m.beneficiary ? ` · para ${m.beneficiary}` : ""} · {formatDateTime(m.createdAt)}
                      </small>
                    </span>
                    <span className={cn("font-display text-sm font-semibold tabular-nums", sign > 0 ? "text-success" : "text-danger")}>
                      {sign > 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(m.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <aside className="grid min-w-0 gap-4" aria-label="Acciones de la caja">
        {session ? (
          <section aria-labelledby="caja-reg" className={cn(widget, "grid gap-4")}>
            <h3 id="caja-reg" className="text-ui font-semibold">
              Registrar un movimiento
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {MOVES.filter((m) => !m.manage || canManage).map((m) => (
                <button key={m.kind} type="button" onClick={() => setMove({ kind: m.kind, amount: m.kind === "REPLENISH" && need > 0 ? need : null, description: m.kind === "REPLENISH" ? "Reposición del fondo" : "", beneficiary: "" })} className={cn(soft, "grid justify-items-start gap-2 p-3.5 text-left outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring")}>
                  <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-card text-accent-text">
                    <m.icon className="size-4" />
                  </span>
                  <span className="grid">
                    <span className="text-ui font-semibold text-foreground">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className={cn(widget, "grid gap-4")}>
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent-text">
                <LockOpen className="size-5" strokeWidth={1.7} />
              </span>
              <div className="grid gap-1">
                <h3 className="font-display text-lg font-semibold">Abre el turno</h3>
                <p className="text-ui text-muted-foreground">Cuenta el efectivo antes de empezar.</p>
              </div>
            </div>
            <Field label="¿Con cuánto efectivo abres?">{(c) => <MoneyInput id={c.id} className={field} value={opening} onValueChange={setOpening} />}</Field>
            <button type="button" disabled={pending} onClick={() => run(() => openCashAction(slug, box.id, String(opening ?? "")))} className={cn(pillAccent, "justify-self-start")}>
              <LockOpen aria-hidden="true" className="size-4" /> Abrir caja
            </button>
          </section>
        )}

        <section aria-labelledby="caja-turno" className={cn(widget, "grid gap-4")}>
          <h3 id="caja-turno" className="text-ui font-semibold">
            Turno
          </h3>
          <ol className="grid gap-3">
            {steps.map((st, n) => (
              <li key={st.label} className="flex items-start gap-3">
                <span aria-hidden="true" className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", st.done ? "bg-accent text-ink" : "bg-surface-muted text-muted-foreground")}>
                  {st.done ? <Check className="size-3.5" strokeWidth={2.6} /> : n + 1}
                </span>
                <span className="grid">
                  <span className="text-ui font-medium text-foreground">{st.label}</span>
                  <span className="text-xs text-muted-foreground">{st.text}</span>
                </span>
              </li>
            ))}
          </ol>
          {session ? (
            <button type="button" onClick={() => setClosing({ counted: null, notes: "" })} className={cn(pillOutline, "justify-self-start")}>
              <Lock aria-hidden="true" className="size-4" /> Cerrar con arqueo
            </button>
          ) : null}
        </section>

        {history.length ? (
          <section aria-labelledby="caja-hist" className={cn(widget, "grid gap-4")}>
            <h3 id="caja-hist" className="text-ui font-semibold">
              Cierres anteriores
            </h3>
            <ul className="grid gap-2">
              {history.map((h) => {
                const a = arqueo(h.expected, h.counted);
                return (
                  <li key={h.id} className={cn(soft, "grid gap-1 px-4 py-3 text-ui")}>
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{formatDateTime(h.closedAt)}</span>
                      <span className={cn("rounded-full px-3 py-0.5 text-xs font-medium", a.status === "cuadra" ? "bg-success/15 text-success" : a.status === "sobra" ? "bg-warning/15 text-warning-foreground" : "bg-danger/10 text-danger")}>
                        {a.status === "cuadra" ? "Cuadró" : `${a.status === "sobra" ? "Sobró" : "Faltó"} ${formatCurrency(Math.abs(a.difference))}`}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Esperado {formatCurrency(h.expected)} · contado {formatCurrency(h.counted)}
                    </span>
                    {h.notes ? <small className="text-xs text-muted-foreground">{h.notes}</small> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </aside>

      {move ? (
        <ResponsiveSheet
          open
          onOpenChange={(o) => !o && setMove(null)}
          title={CASH_KIND_LABELS[move.kind]}
          description={`Efectivo en caja: ${formatCurrency(current)}`}
          footer={
            <>
              <button type="button" onClick={() => setMove(null)} className={pillOutline}>
                Cancelar
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => cashMovementAction(slug, { kind: move.kind, amount: String(move.amount ?? ""), description: move.description, beneficiary: move.beneficiary }), () => setMove(null))} className={pillAccent}>
                Registrar
              </button>
            </>
          }
        >
          <div className="grid gap-4">
            <Field label="Monto" required hint={move.kind === "ADJUST" ? "Positivo si sobra efectivo, negativo si falta." : undefined}>
              {(c) => (move.kind === "ADJUST" ? <input {...c} inputMode="decimal" value={move.amount ?? ""} onChange={(e) => setMove({ ...move, amount: e.target.value ? Number(e.target.value.replace(",", ".")) : null })} className={cn(inputClasses, field)} /> : <MoneyInput id={c.id} className={field} value={move.amount} onValueChange={(v) => setMove({ ...move, amount: v })} />)}
            </Field>
            <Field label="Descripción" required>
              {(c) => <input {...c} value={move.description} onChange={(e) => setMove({ ...move, description: e.target.value })} className={cn(inputClasses, field)} placeholder="Concepto" />}
            </Field>
            {move.kind === "VOUCHER" ? (
              <Field label="Para quién es el vale" required>
                {(c) => <input {...c} value={move.beneficiary} onChange={(e) => setMove({ ...move, beneficiary: e.target.value })} className={cn(inputClasses, field)} />}
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
              <button type="button" onClick={() => setClosing(null)} className={pillOutline}>
                Cancelar
              </button>
              <button type="button" disabled={pending || closing.counted == null} onClick={() => run(() => closeCashAction(slug, String(closing.counted ?? ""), closing.notes), () => setClosing(null))} className={pillAccent}>
                Cerrar turno
              </button>
            </>
          }
        >
          <div className="grid gap-4">
            <p className={cn(soft, "flex justify-between px-4 py-3 text-ui")}>
              <span className="text-muted-foreground">Efectivo esperado</span>
              <b className="font-display tabular-nums">{formatCurrency(current)}</b>
            </p>
            <Field label="Efectivo contado" required>
              {(c) => <MoneyInput id={c.id} className={field} value={closing.counted} onValueChange={(v) => setClosing({ ...closing, counted: v })} />}
            </Field>
            {result ? (
              <p className={cn("rounded-2xl p-3.5 text-ui font-medium", result.status === "cuadra" ? "bg-success-subtle text-success" : result.status === "sobra" ? "bg-warning/15 text-warning-foreground" : "bg-danger-subtle text-danger")}>
                {result.status === "cuadra" ? "La caja cuadra." : `${result.status === "sobra" ? "Sobran" : "Faltan"} ${formatCurrency(Math.abs(result.difference))}.`}
              </p>
            ) : null}
            <Field label="Observaciones" hint={result && result.status !== "cuadra" ? "Explica la diferencia." : undefined}>
              {(c) => <input {...c} value={closing.notes} onChange={(e) => setClosing({ ...closing, notes: e.target.value })} className={cn(inputClasses, field)} />}
            </Field>
          </div>
        </ResponsiveSheet>
      ) : null}
    </div>
  );
}
