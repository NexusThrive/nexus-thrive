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
    <article className="rounded-lg border border-border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
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
      <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
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
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground/80"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver a {terms.quote.toLowerCase()}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Explosión de Materiales
          </h1>
          <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {explosion.quote.code} · {explosion.quote.title}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Insumos consolidados para ejecutar la obra: cantidades finales
          (desperdicio incluido) y costo estimado por categoría, listos para
          compras y programación.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCard(
          <Boxes aria-hidden="true" className="h-5 w-5 text-accent-text" />,
          "Materiales",
          explosion.materials.length,
          explosion.totals.materials,
          "bg-accent-subtle text-accent-text",
        )}
        {metricCard(
          <HardHat aria-hidden="true" className="h-5 w-5 text-gold-700" />,
          "Mano de Obra",
          explosion.labor.length,
          explosion.totals.labor,
          "bg-gold-100 text-gold-700",
        )}
        {metricCard(
          <Cog aria-hidden="true" className="h-5 w-5 text-graphite-700" />,
          "Equipos",
          explosion.equipment.length,
          explosion.totals.equipment,
          "bg-graphite-100 text-graphite-700",
        )}
        {metricCard(
          <Truck aria-hidden="true" className="h-5 w-5 text-graphite-500" />,
          "Transporte",
          explosion.transport.length,
          explosion.totals.transport,
          "bg-graphite-100 text-graphite-500",
        )}
      </div>

      <article className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Costo Global de Insumos
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {formatCurrency(explosion.totals.global)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
          >
            <Wallet className="h-5 w-5" />
          </span>
        </div>
      </article>

      {resourceCount === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-16 text-center shadow-xs">
          <p className="text-sm font-medium text-foreground/80">
            No existen composiciones APU disponibles para generar la
            explosión.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
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