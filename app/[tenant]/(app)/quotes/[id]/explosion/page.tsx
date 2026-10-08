import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  Cog,
  HardHat,
  Truck,
  Wallet,
} from "lucide-react";
import { db } from "@/prisma/db";
import {
  calculateInsumosExplosion,
  explosionResourceCount,
} from "@/lib/apu-explosion";
import { getQuoteTerms } from "@/lib/vertical-terms";
import { formatCurrency } from "@/lib/format";
import ExplosionReport from "./_components/explosion-report";

function metricCard(
  icon: React.ReactNode,
  title: string,
  count: number,
  cost: string,
  tone: string,
) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {formatCurrency(cost)}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tone}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
        {count} {count === 1 ? "recurso distinto" : "recursos distintos"}
      </p>
    </article>
  );
}

/**
 * Reporte operativo de explosión de insumos — Fase 3.
 *
 * Orientado al contratista / director de obra / comprador: lista
 * consolidada de materiales, mano de obra, equipos y transporte con sus
 * cantidades (desperdicio incluido) y costos estimados, más exportación
 * de la lista de compras (CSV).
 *
 * El motor vive en `lib/apu-explosion.ts`; esta página solo resuelve el
 * tenant, calcula y presenta. Sin snapshot → 404 (multi-tenant).
 */
export default async function QuoteExplosionPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id: quoteId } = await params;

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    notFound();
  }

  const explosion = await calculateInsumosExplosion({
    tenantId: tenantRecord.id,
    quoteId,
  });
  if (!explosion) {
    notFound();
  }

  const terms = getQuoteTerms(tenantRecord.vertical);
  const resourceCount = explosionResourceCount(explosion);

  const sections = [
    {
      key: "materials" as const,
      title: "Materiales",
      resourceLabel: "Insumo",
      rows: explosion.materials,
    },
    {
      key: "labor" as const,
      title: "Mano de Obra",
      resourceLabel: "Recurso",
      rows: explosion.labor,
    },
    {
      key: "equipment" as const,
      title: "Equipos",
      resourceLabel: "Equipo",
      rows: explosion.equipment,
    },
    {
      key: "transport" as const,
      title: "Transporte",
      resourceLabel: "Recurso",
      rows: explosion.transport,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <Link
          href={`/${tenantSlug}/quotes/${quoteId}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver a {terms.quote.toLowerCase()}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Explosión de Materiales
          </h1>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
            {explosion.quote.code} · {explosion.quote.title}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Insumos consolidados para ejecutar la obra: cantidades finales
          (desperdicio incluido) y costo estimado por categoría, listos para
          compras y programación.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCard(
          <Boxes aria-hidden="true" className="h-5 w-5 text-indigo-600" />,
          "Materiales",
          explosion.materials.length,
          explosion.totals.materials,
          "bg-indigo-50 text-indigo-600",
        )}
        {metricCard(
          <HardHat aria-hidden="true" className="h-5 w-5 text-amber-600" />,
          "Mano de Obra",
          explosion.labor.length,
          explosion.totals.labor,
          "bg-amber-50 text-amber-600",
        )}
        {metricCard(
          <Cog aria-hidden="true" className="h-5 w-5 text-violet-600" />,
          "Equipos",
          explosion.equipment.length,
          explosion.totals.equipment,
          "bg-violet-50 text-violet-600",
        )}
        {metricCard(
          <Truck aria-hidden="true" className="h-5 w-5 text-cyan-600" />,
          "Transporte",
          explosion.transport.length,
          explosion.totals.transport,
          "bg-cyan-50 text-cyan-600",
        )}
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">
              Costo Global de Insumos
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {formatCurrency(explosion.totals.global)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"
          >
            <Wallet className="h-5 w-5" />
          </span>
        </div>
      </article>

      {resourceCount === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">
            No existen composiciones APU disponibles para generar la
            explosión.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Este {terms.quote.toLowerCase()} no tiene {terms.apuItems.toLowerCase()}{" "}
            asociados en su snapshot ni en el catálogo vigente.
          </p>
        </div>
      ) : (
        <ExplosionReport
          quote={{
            code: explosion.quote.code,
            title: explosion.quote.title,
          }}
          sections={sections}
          totals={explosion.totals}
        />
      )}
    </div>
  );
}