"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Alert } from "@/components/molecules/alert";
import { EmptyState } from "@/components/molecules/empty-state";
import { SkeletonRows } from "@/components/molecules/skeleton-rows";
import { MovementsList, type Movement } from "@/components/organisms/movements-list";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";

export type MovementsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; rows: Movement[]; truncated: boolean };

/**
 * Hoja lateral con las transacciones de la barra que se tocó en la gráfica
 * (un día, una semana o un mes). Los datos los trae quien la usa
 * (`IncomeChartPanel`); aquí están los cuatro estados: carga, error, vacío y
 * lista, con el enlace al registro completo de Finanzas.
 */
export function DayMovementsSheet({
  open,
  onOpenChange,
  title,
  state,
  fullHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «Lunes 14 oct.», «Semana del 13 al 19 oct.», «Octubre 2026». */
  title: string;
  state: MovementsState;
  /** Registro completo en Finanzas. */
  fullHref: string;
}) {
  return (
    <ResponsiveSheet
      drawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Pagos recibidos y gastos de este periodo."
      unsavedGuard={false}
      footer={
        <Link href={fullHref} className={buttonVariants({ variant: "outline" })}>
          Ver en Finanzas <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      }
    >
      {state.status === "loading" ? <SkeletonRows rows={6} label="Cargando movimientos" /> : null}
      {state.status === "error" ? <Alert title="No se pudieron cargar los movimientos">{state.message}</Alert> : null}
      {state.status === "ok" && state.rows.length === 0 ? (
        <EmptyState title="Sin movimientos" description="En este periodo no hubo cobros ni gastos registrados." />
      ) : null}
      {state.status === "ok" && state.rows.length > 0 ? (
        <>
          <MovementsList items={state.rows} title="Movimientos" />
          {state.truncated ? <p className="mt-3 text-xs text-muted-foreground">Se muestran los más recientes. El registro completo está en Finanzas.</p> : null}
        </>
      ) : null}
    </ResponsiveSheet>
  );
}
