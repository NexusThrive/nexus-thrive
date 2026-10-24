"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { COUNT_LABELS, countDifference, countSummary } from "@/lib/inventory/stock-docs";
import type { CountDetail } from "@/lib/inventory/stock-docs-db";
import { cancelCountAction, countDetailAction, finalizeCountAction, saveCountAction } from "@/app/[tenant]/(app)/stock/actions";

const TONES = { DRAFT: "warning", COMPLETED: "success", CANCELED: "muted" } as const;

/** Conteo físico: lo esperado vs. lo contado, la diferencia y el cierre con motivo. */
export default function CountSheet({ slug, id, onClose }: { slug: string; id: string; onClose: () => void }) {
  const [count, setCount] = useState<CountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    let alive = true;
    countDetailAction(slug, id).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setCount(r.count);
        setValues(Object.fromEntries(r.count.lines.map((l) => [l.id, l.counted === null ? "" : String(l.counted)])));
        setNote(r.count.note ?? "");
      } else setError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [slug, id]);

  const open = count?.status === "DRAFT";
  const items = (count?.lines ?? []).map((l) => ({ lineId: l.id, counted: values[l.id] === "" || values[l.id] === undefined ? null : Number(values[l.id]) }));
  const summary = countSummary((count?.lines ?? []).map((l, i) => ({ expected: l.expected, counted: items[i].counted })));

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, close = false) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast(r.message, "success");
        router.refresh();
        if (close) onClose();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });

  const finalize = async () => {
    const text = summary.withDifference ? `Se ajustarán ${summary.withDifference} ${summary.withDifference === 1 ? "producto" : "productos"} (+${summary.surplus} / −${summary.shortage} unidades) y quedará el motivo en el kardex.` : "No hay diferencias: el conteo se cierra sin ajustes.";
    if (!(await confirm({ title: `¿Cerrar ${count?.code}?`, description: `${text} Un conteo cerrado no se puede editar.`, confirmLabel: "Cerrar y ajustar", tone: "default" }))) return;
    run(async () => {
      const saved = await saveCountAction(slug, id, items);
      if (!saved.ok) return saved;
      return finalizeCountAction(slug, id, note);
    }, true);
  };

  return (
    <>
      <ResponsiveSheet
        drawer
        size="lg"
        open
        onOpenChange={(o) => !o && onClose()}
        busy={pending}
        title={count ? `Conteo ${count.code}` : "Conteo"}
        description={count ? `${count.warehouseName} · ${summary.counted} de ${summary.total} contados` : undefined}
        footer={
          open ? (
            <>
              <button type="button" disabled={pending} onClick={async () => { if (await confirm({ title: `¿Cancelar ${count?.code}?`, description: "No se ajusta nada. El conteo queda cancelado en el historial.", confirmLabel: "Cancelar conteo", tone: "danger" })) run(() => cancelCountAction(slug, id), true); }} className={buttonVariants({ variant: "outline" })}>
                Cancelar conteo
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => saveCountAction(slug, id, items))} className={buttonVariants({ variant: "outline" })}>
                Guardar avance
              </button>
              <button type="button" disabled={pending || summary.counted === 0} onClick={finalize} className={buttonVariants()}>
                Cerrar y ajustar
              </button>
            </>
          ) : undefined
        }
      >
        {error ? (
          <Alert tone="danger">{error}</Alert>
        ) : !count ? (
          <p role="status" className="text-[13px] text-muted-foreground">Cargando el conteo…</p>
        ) : (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TONES[count.status]}>{COUNT_LABELS[count.status]}</Badge>
              {summary.withDifference ? <span className="text-[13px] text-muted-foreground">{summary.withDifference} con diferencia · sobran {summary.surplus} · faltan {summary.shortage}</span> : null}
            </div>
            <div role="region" aria-label={`Productos del conteo ${count.code}`} tabIndex={0} className="overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <table className="w-full min-w-[420px] text-[13px]">
                <caption className="sr-only">Lo esperado y lo contado por producto</caption>
                <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Producto</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Sistema</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Contado</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {count.lines.map((l) => {
                    const counted = values[l.id] === "" || values[l.id] === undefined ? null : Number(values[l.id]);
                    const diff = countDifference({ expected: l.expected, counted: open ? counted : l.counted });
                    return (
                      <tr key={l.id}>
                        <th scope="row" className="px-3 py-2 text-left font-medium">{l.productName}</th>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{l.expected}</td>
                        <td className="px-3 py-2 text-right">
                          {open ? (
                            <input aria-label={`Contado de ${l.productName}`} inputMode="numeric" value={values[l.id] ?? ""} onChange={(e) => setValues({ ...values, [l.id]: e.target.value.replace(/\D/g, "") })} className={`${inputClasses} h-8 w-20 text-right`} />
                          ) : (
                            <span className="font-mono tabular-nums">{l.counted ?? "—"}</span>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono tabular-nums ${diff ? (diff < 0 ? "text-danger" : "text-success") : "text-muted-foreground"}`}>{diff === null ? "—" : diff > 0 ? `+${diff}` : diff}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {open ? (
              <Field label="Motivo de las diferencias" hint={summary.withDifference ? "Obligatorio: queda en el kardex de cada producto." : "Solo hace falta si hay diferencias."}>
                {(c) => <textarea {...c} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClasses} placeholder="Conteo de fin de mes; merma por vencimiento" />}
              </Field>
            ) : count.note ? (
              <p className="text-[13px] text-muted-foreground">Motivo: {count.note}</p>
            ) : null}
          </div>
        )}
      </ResponsiveSheet>
      {confirmDialog}
    </>
  );
}
