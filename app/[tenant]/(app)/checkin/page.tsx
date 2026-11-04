import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { StatTile } from "@/components/molecules/stat-tile";
import { addDaysKey, bogotaToMs } from "@/lib/business/scheduling/calendar";
import { attendanceBetween, attendanceCount, expiringSoon } from "@/lib/industry/gym/gym-db";
import { canHandleCash } from "@/lib/core/auth/roles";
import { bogotaDayKey } from "@/lib/foundation/kernel/finance-series";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { getVerticalTerms } from "@/lib/core/sectors/terms";
import CheckinStation from "./_components/checkin-station";
import ExpiringList from "./_components/expiring-list";

/**
 * Control de acceso del gimnasio: la recepción registra por documento o busca al
 * socio a mano y ve en grande si puede entrar, con su foto y el
 * tiempo que le queda. Cada intento queda en Asistencia.
 */
export default async function CheckinPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const ctx = await requireTenantContext(slug, "/checkin");
  if (!ctx) notFound();
  const terms = getVerticalTerms(ctx.vertical);

  const today = bogotaDayKey(new Date());
  const from = bogotaToMs(today, "00:00");
  const to = bogotaToMs(addDaysKey(today, 1), "00:00");
  const weekFrom = bogotaToMs(addDaysKey(today, -6), "00:00");
  const [entries, count, week, expiring] = await Promise.all([
    attendanceBetween(ctx.tenantId, from, to),
    attendanceCount(ctx.tenantId, from, to),
    attendanceCount(ctx.tenantId, weekFrom, to),
    expiringSoon(ctx.tenantId),
  ]);
  const denied = entries.filter((e) => !e.allowed).length;

  return (
    // Ver la nota del `CheckinStation`: los gestores de contraseñas añaden
    // atributos al DOM y provocan un aviso de hydration mismatch.
    <div className="space-y-6" suppressHydrationWarning>
      <PageHeader eyebrow="Gimnasio" title="Control de acceso" description={`Registra la entrada del ${terms.customer.toLowerCase()} por su documento o búscalo por nombre.`} />

      <section aria-label="Asistencia" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} label="Entradas hoy" value={count.entries} tone="success" note={`${count.people} ${count.people === 1 ? "persona" : "personas"}`} />
        <StatTile index={1} label="Negadas hoy" value={denied} tone={denied ? "danger" : "muted"} note="Vencidas, congeladas o sin plan" />
        <StatTile index={2} label="Últimos 7 días" value={week.entries} tone="neutral" note={`${week.people} ${terms.customers.toLowerCase()} distintos`} />
        <StatTile index={3} label="Por vencer" value={expiring.filter((e) => e.daysLeft > 0).length} tone="warning" pulse={expiring.some((e) => e.daysLeft > 0 && e.daysLeft <= 3)} note="En los próximos 7 días" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <CheckinStation slug={slug} canScan={canHandleCash(ctx.role)} entries={entries} customerTerm={terms.customer} />
        <ExpiringList slug={slug} rows={expiring} />
      </div>
    </div>
  );
}
