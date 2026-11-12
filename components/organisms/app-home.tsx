"use client";

import { readSnapshot } from "@/lib/experience/hooks/use-section-snapshot";
import { writeSection } from "@/lib/experience/hooks/section-cache";
import { buttonVariants } from "@/components/atoms/button-variants";
import { useEffect, useState, ViewTransition, type CSSProperties, type ReactNode } from "react";
import { useIntroSignal } from "@/lib/experience/assistant/intro-signal";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowUpRight, ChevronRight, FileText, Target, UserPlus, Users, Wallet, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/atoms/skeleton";
import { EyeTracker } from "@/components/atoms/eye-tracker";
import { askAuri } from "@/lib/experience/assistant/ask-auri";
import { AvatarStack } from "@/components/molecules/avatar-stack";
import { DeltaPill, HatchBars, LineArea, QuickTile, Widget, WidgetHead, WidgetValue, widgetRow } from "@/components/widgets/widget";
import { HomeQuickSearch } from "@/components/organisms/home-quick-search";
import { useQuickCreate } from "@/components/organisms/quick-create-host";
import { useShell } from "@/components/providers/shell-context";
import { formatCurrency } from "@/lib/foundation/format";
import type { HomeSummary, HomeSummaryParts } from "@/lib/experience/dashboard/home-summary";
import { cn } from "@/lib/utils";

/** Saludo según la hora de Bogotá: «Buenos días», «Buenas tardes» o «Buenas noches». */
function greetingOf(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(now));
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
}
const compactMoney = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1 });

/** Columnas de una fila de widgets según cuántos hay: así nunca queda un hueco a la derecha (2, 3 o 4 como máximo). */
function fit(n: number): CSSProperties {
  const cols = (max: number) => `repeat(${Math.max(1, Math.min(n, max))}, minmax(0, 1fr))`;
  return { "--c2": cols(2), "--c3": cols(3), "--c4": cols(4) } as CSSProperties;
}

export type AppHomeTrial = { daysLeft: number; level: "ok" | "soon" | "ended"; planHref: string };

/** La agencia (negocio) en la que se está y dónde queda; sin ubicación registrada solo se muestra el nombre. */
export type AppHomeBusiness = { name: string; location: string | null };

type HomeSnapshot = { summary: HomeSummary | null; trial: AppHomeTrial | null; userName: string | null; business: AppHomeBusiness | null };
/**
 * Lo último que mostró Inicio en cada negocio, en la caché de secciones (`lib/experience/hooks/section-cache.ts`: memoria de esta pestaña,
 * por persona y negocio; no en el navegador ni en el service worker: son datos privados). Al volver a Inicio se pinta al instante con esto y solo cambian las cifras cuando llega el resumen nuevo.
 */
const homeKey = (tenant: string) => `home:${tenant}`;
const lastHome = {
  get: (tenant: string) => readSnapshot<HomeSnapshot>(homeKey(tenant)) ?? undefined,
  set: (tenant: string, value: HomeSnapshot) => writeSection(homeKey(tenant), value),
  has: (tenant: string) => readSnapshot<HomeSnapshot>(homeKey(tenant)) !== null,
};

/** Inicio con lo último que se vio (la precarga de «/»); sin nada guardado, `fallback` (el esqueleto del cajón). */
export function CachedAppHome({ fallback }: { fallback: ReactNode }) {
  const tenant = useParams<{ tenant?: string }>()?.tenant ?? "";
  const snap = lastHome.get(tenant);
  return snap ? <AppHome summary={snap.summary} trial={snap.trial} userName={snap.userName} business={snap.business} /> : <>{fallback}</>;
}

function isThenable<T>(value: unknown): value is Promise<T> {
  return typeof (value as { then?: unknown } | null)?.then === "function";
}

/** Un bloque de Inicio que llega por su cuenta: su valor (o `null` si falló o no aplica) y si ya terminó. */
function useBlock<T>(input: Promise<T | null> | undefined): { value: T | null; ready: boolean } {
  const [state, setState] = useState<{ from: unknown; value: T | null } | null>(null);
  useEffect(() => {
    if (!isThenable(input)) return;
    let alive = true;
    input.then(
      (value) => alive && setState({ from: input, value }),
      () => alive && setState({ from: input, value: null }),
    );
    return () => {
      alive = false;
    };
  }, [input]);
  return { value: state && state.from === input ? state.value : null, ready: !input || state?.from === input };
}

/** Widget esperando sus datos: conserva su sitio en la rejilla y se anuncia una vez; el resto de Inicio ya se ve. */
function PendingWidget({ label, className }: { label: string; className?: string }) {
  return (
    <Widget role="status" aria-busy="true" aria-label={label} className={className}>
      <div aria-hidden="true" className="grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="size-9 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-3xl" />
        <Skeleton className="h-16 w-full rounded-3xl" />
      </div>
    </Widget>
  );
}

/**
 * Inicio unificado: el saludo y, debajo, tres columnas. Al centro el cajón de aplicaciones (cada área habilitada para la organización
 * y el rol; abre su espacio de trabajo); a los lados, «Este mes» (ventas, vencido y balance) y «Hoy» y «Atención». Las cifras salen de
 * las mismas fuentes que Resumen (`loadHomeSummary`). Resumen ya no es una app del cajón (su ruta sigue existiendo).
 */
export function AppHome({ trial = null, summary: input, parts, userName = null, business = null }: { trial?: AppHomeTrial | null; summary?: HomeSummary | Promise<HomeSummary | null> | null; /** Los bloques por separado: cada uno se pinta cuando llega, sin esperar a los demás. */ parts?: HomeSummaryParts; userName?: string | null; business?: AppHomeBusiness | null }) {
  const intro = useIntroSignal();

  const tenant = useParams<{ tenant?: string }>()?.tenant ?? "";
  // El resumen llega como promesa (la página no lo espera): mientras tanto, lo último que se vio; al llegar, solo cambian las cifras.
  // La promesa que llega del servidor es un «thenable» de React, no siempre `instanceof Promise`.
  const isPromise = isThenable(input);
  const [fresh, setFresh] = useState<{ from: unknown; data: HomeSummary | null } | null>(null);
  useEffect(() => {
    if (!isThenable(input)) return;
    let alive = true;
    input.then(
      (data) => {
        if (!alive) return;
        lastHome.set(tenant, { summary: data, trial, userName, business });
        setFresh({ from: input, data });
      },
      () => {
        if (alive) setFresh({ from: input, data: lastHome.get(tenant)?.summary ?? null });
      },
    );
    return () => {
      alive = false;
    };
  }, [input, tenant, trial, userName, business]);
  const ready = !isPromise || fresh?.from === input;
  const cached = lastHome.get(tenant)?.summary ?? null;
  const legacy: HomeSummary | null = !isThenable<HomeSummary | null>(input) ? (input ?? null) : ready ? fresh!.data : cached;

  // Por bloques: lo que ya llegó se pinta; lo que no, conserva lo último que se vio o, la primera vez, su esqueleto.
  const moneyB = useBlock(parts?.money);
  const todayB = useBlock(parts?.today);
  const peopleB = useBlock(parts?.people);
  const moneyV = moneyB.ready ? (moneyB.value ?? (cached ? { month: cached.month, balance30: cached.balance30 } : null)) : cached ? { month: cached.month, balance30: cached.balance30 } : null;
  const todayV = todayB.ready ? (todayB.value ?? (cached ? { today: cached.today, fiscal: cached.fiscal, attention: cached.attention, crm: cached.crm } : null)) : cached ? { today: cached.today, fiscal: cached.fiscal, attention: cached.attention, crm: cached.crm } : null;
  const peopleV = peopleB.ready ? (peopleB.value ?? (cached ? { customers: cached.customers, team: cached.team, recent: cached.recent } : null)) : cached ? { customers: cached.customers, team: cached.team, recent: cached.recent } : null;
  const summary: HomeSummary | null = parts
    ? {
        month: moneyV?.month ?? null,
        balance30: moneyV?.balance30 ?? null,
        today: todayV?.today ?? null,
        fiscal: todayV?.fiscal ?? null,
        attention: todayV?.attention ?? { overdueCount: 0, overdueTotal: null, expiringCount: null, expiringDays: 3 },
        crm: todayV?.crm ?? null,
        customers: peopleV?.customers ?? null,
        team: peopleV?.team ?? { members: [], total: 0 },
        recent: peopleV?.recent ?? [],
        badges: {},
        updatedAt: parts.updatedAt,
      }
    : legacy;
  // Solo la primera vez (nada guardado) se ven bloques en esqueleto, y cada uno el suyo; nunca la página entera.
  const pendingMoney = parts ? !moneyB.ready && !moneyV : !ready && !legacy;
  const pendingToday = parts ? !todayB.ready && !todayV : !ready && !legacy;
  const pendingPeople = parts ? !peopleB.ready && !peopleV : !ready && !legacy;
  // Cuando todos los bloques llegaron se guarda la foto completa para la próxima vez.
  useEffect(() => {
    if (parts && moneyB.value && todayB.value && peopleB.value) {
      lastHome.set(tenant, { summary: { ...moneyB.value, ...todayB.value, ...peopleB.value, badges: {}, updatedAt: parts.updatedAt }, trial, userName, business });
    }
  }, [parts, moneyB.value, todayB.value, peopleB.value, tenant, trial, userName, business]);

  const { groups, hrefFor, createActions = [] } = useShell();
  const router = useRouter();
  const quick = useQuickCreate();

  const hrefOfGroup = (label: string, fallback: string) => hrefFor(groups.find((g) => g.label === label)?.items[0]?.href ?? fallback);
  const now = new Date();
  const month = summary?.month ?? null;
  const today = summary?.today ?? null;
  const attention = summary?.attention ?? null;
  const fiscal = summary?.fiscal ?? null;
  const crm = summary?.crm ?? null;
  const crmToday = crm?.today ?? [];
  const customers = summary?.customers ?? null;
  const team = summary?.team ?? { members: [], total: 0 };
  // Accesos rápidos: los mismos de «Crear»; los que tienen mini-modal se abren aquí mismo, los demás llevan a su pantalla. «Nueva reserva» se crea desde la agenda.
  const actions = createActions.filter((a) => a.key !== "booking").slice(0, 4);
  const recent = summary?.recent ?? [];
  // Cifras clave: solo las que tienen dato (cada una enlaza a su módulo).
  const kpis: ReactNode[] = [];
  if (month) {
    kpis.push(<Kpi key="ventas" id="home-kpi-ventas" label="Ventas del mes" description="Ventas totales de este mes" value={formatCurrency(month.sales)} href={hrefOfGroup("Ventas y cobros", "/finanzas")} icon={FileText} delta={month.salesChange} hint="Sin mes anterior para comparar" />);
    if (month.overdue) kpis.push(<Kpi key="vencido" id="home-kpi-vencido" label="Vencido" description="Facturas vencidas sin pagar" value={formatCurrency(month.overdue.total)} href={hrefFor("/finanzas/cartera")} icon={Wallet} hint={month.overdue.count > 0 ? `${month.overdue.count} ${month.overdue.count === 1 ? "factura vencida" : "facturas vencidas"}` : "Nada vencido"} danger={month.overdue.count > 0} />);
  }
  if (customers) kpis.push(<Kpi key="clientes" id="home-kpi-clientes" label="Clientes" description="Clientes del negocio" value={String(customers.total)} href={hrefFor("/contactos")} icon={Users} hint={customers.today > 0 ? `${customers.today} ${customers.today === 1 ? "nuevo" : "nuevos"} hoy` : "Ninguno nuevo hoy"} />);
  if (summary?.balance30) kpis.push(<Kpi key="balance" id="home-kpi-balance" label="Balance" description="Ingresos menos gastos" value={formatCurrency(summary.balance30.balance)} href={hrefOfGroup("Finanzas y contabilidad", "/finanzas")} icon={Target} hint="Últimos 30 días" />);

  // «Para hoy»: lo que pide atención, cada cosa con su salida.
  type Task = { key: string; dot: string; title: string; note: string; cta: string; href: string | null };
  const tasks: Task[] = [];
  if (attention) {
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    if (attention.overdueCount > 0) tasks.push({ key: "vencidas", dot: "bg-danger", title: plural(attention.overdueCount, "factura vencida", "facturas vencidas"), note: attention.overdueTotal != null ? `${compactMoney.format(attention.overdueTotal)} por cobrar` : "Revisa la cartera", cta: "Cobrar", href: hrefFor("/finanzas/cartera") });
    if (attention.expiringCount) tasks.push({ key: "membresias", dot: "bg-gold-300", title: plural(attention.expiringCount, "membresía por vencer", "membresías por vencer"), note: `En los próximos ${attention.expiringDays} días`, cta: "Ver", href: hrefFor("/memberships") });
    if (fiscal?.rejected) tasks.push({ key: "rechazadas", dot: "bg-danger", title: plural(fiscal.rejected, "factura rechazada", "facturas rechazadas"), note: "Revisa la causa y reintenta", cta: "Revisar", href: hrefFor("/finanzas/facturacion-electronica") });
    if (fiscal?.queued) tasks.push({ key: "espera", dot: "bg-gold-300", title: plural(fiscal.queued, "factura en espera", "facturas en espera"), note: fiscal.today ? plural(fiscal.today, "documento de hoy", "documentos de hoy") : "Esperan al proveedor", cta: "Ver", href: hrefFor("/finanzas/facturacion-electronica") });
    if (crm?.overdue) tasks.push({ key: "actividades", dot: "bg-danger", title: plural(crm.overdue, "actividad vencida", "actividades vencidas"), note: "En el CRM", cta: "Abrir", href: hrefFor("/crm?vista=actividades") });
    if (crm?.withoutActivity) tasks.push({ key: "sin-actividad", dot: "bg-muted-foreground/50", title: plural(crm.withoutActivity, "oportunidad sin actividad", "oportunidades sin actividad"), note: "Programa el siguiente paso", cta: "Abrir", href: hrefFor("/crm") });
  }
  // Agenda de hoy: la próxima cita y lo del CRM; la primera se resalta.
  type Ev = { key: string; time: string; title: string; note: string; href: string; first: boolean };
  const events: Ev[] = [];
  if (today?.next) events.push({ key: "next", time: today.next.time, title: [today.next.title, today.next.customer].filter(Boolean).join(" · "), note: today.next.status, href: hrefFor("/bookings"), first: true });
  for (const t of crmToday) events.push({ key: t.id, time: t.time, title: t.label, note: "CRM", href: hrefFor(`/crm/oportunidades/${t.opportunityId}`), first: events.length === 0 });
  if (today && today.more > 0) events.push({ key: "more", time: "", title: `${today.more} ${today.more === 1 ? "cita más" : "citas más"}`, note: "Ver la agenda del día", href: hrefFor("/bookings"), first: false });
  const weekValues = month?.weekTrend ?? [];
  const weekLabels = weekValues.map((_, k) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (weekValues.length - 1 - k));
    return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "short" }).format(d).replace(".", "");
  });
  const weekTotal = weekValues.reduce((sum, v) => sum + v, 0);
  const trend = month?.monthTrend?.length ? month.monthTrend : [];
  const dayLabel = (back: number) => {
    const d = new Date(now);
    d.setDate(now.getDate() - back);
    return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short" }).format(d).replace(".", "");
  };
  const bestDay = weekValues.length ? weekLabels[weekValues.reduce((bi, v, k, arr) => (v > arr[bi]! ? k : bi), 0)] : null;
  const heroLine = tasks.length
    ? `Tienes ${tasks.length} ${tasks.length === 1 ? "pendiente" : "pendientes"} para hoy${today?.next ? ` y tu próxima cita es a las ${today.next.time}` : ""}`
    : today?.next
      ? `Todo al día. Tu próxima cita es a las ${today.next.time}`
      : "Todo al día. Buen momento para adelantar lo que sigue";
  const row2 = (month && weekValues.length ? 1 : 0) + (summary?.balance30 ? 2 : 0);
  const row4 = (actions.length ? 1 : 0) + (customers?.latest.length ? 1 : 0) + (team.members.length ? 1 : 0);
  const group = (label: string) => <p className="text-xs font-medium text-muted-foreground">{label}</p>;

  return (
    // `data-still`: si Inicio ya se había visto (se precargó con su último estado), no repite la entrada al llegar la página real.
    <div data-bleed="" data-still={lastHome.has(tenant) ? "" : undefined} className="relative isolate min-h-[calc(100dvh-var(--topbar-height)-7rem-env(safe-area-inset-bottom,0px))] overflow-hidden md:min-h-0">
      <HomeQuickSearch />
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-5 pb-16 pt-6 md:px-6">
        {/* Saludo: el protagonista de Inicio. Fondo cálido de oro, esquinas muy suaves y texto ligero; con lo que pasa hoy y el negocio. */}
        <section
          aria-labelledby="home-saludo"
          className="relative isolate grid items-center gap-6 overflow-hidden rounded-[28px] bg-accent-subtle/40 px-6 py-7 min-[820px]:grid-cols-[minmax(0,1fr)_auto] min-[820px]:px-9 min-[820px]:py-9"
          style={{ backgroundImage: "radial-gradient(90% 130% at 100% 10%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 75%), radial-gradient(70% 100% at 0% 100%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 75%)" }}
        >
          <div className="grid gap-5">
          <h1 id="home-saludo" suppressHydrationWarning className="font-display text-3xl font-semibold leading-[1.08] tracking-tight text-foreground min-[820px]:text-5xl">
            {greetingOf(now)}
            {userName ? (
              <>
                ,<br />
                <span className="font-[700] text-accent-text">{userName}</span>
              </>
            ) : null}
          </h1>
          <p className="max-w-[46ch] text-base text-muted-foreground">{pendingToday ? "Preparando tu resumen…" : `${heroLine.replace(/\.$/, "")}.`}</p>
          </div>

          {/* A la derecha, AURI: grande, mirando al cursor, sobre un halo suave. Desde 820 px es la asistente (un clic abre su chat) y el botón de la esquina se oculta en Inicio. */}
          <button
            type="button"
            onClick={() => askAuri()}
            aria-label="Hablar con AURI AI"
            data-auri-hero=""
            className="eyt-gold relative hidden shrink-0 place-items-center rounded-full outline-none transition-transform duration-(--d2) hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none min-[820px]:grid"
            style={{ width: 260, height: 260 }}
          >
            <span aria-hidden="true" className="absolute rounded-full bg-card/35" style={{ width: 260, height: 260 }} />
            <span aria-hidden="true" className="absolute rounded-full bg-card/50" style={{ width: 190, height: 190 }} />
            {/* El nombre compartido es fijo y solo lo lleva esta AURI (la de la esquina no): así nunca hay dos con el mismo nombre. */}
            <ViewTransition name="auri-onboarding" share="nx-auri" default="none">
              <div className="size-[150px]">
                {/* En el recorrido de bienvenida pone la cara que corresponde a lo que dice; fuera de él, alegre y mirando al cursor. */}
                <EyeTracker fit decorative poke={false} follow={50} size={150} shape="Ball" eyeScale={1.2} mood={intro?.mood ?? "joy"} gaze={intro?.gaze ?? null} speaking={intro?.speaking ?? false} />
              </div>
            </ViewTransition>
          </button>
        </section>

        {/* Fila 1: cifras clave (cada una enlaza a su módulo) */}
        {pendingMoney ? (
          <div className="grid gap-4 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-4" role="status" aria-busy="true" aria-label="Cargando las cifras del mes">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[148px] rounded-(--radius-widget)" />
            ))}
          </div>
        ) : kpis.length ? (
          <div className="grid gap-4 min-[640px]:grid-cols-(--c2) min-[1100px]:grid-cols-(--c4)" style={fit(kpis.length)}>
            {kpis}
          </div>
        ) : null}

        {/* Fila 2: barras de la semana, línea de oro de 30 días y dona de ingresos contra gastos */}
        {pendingMoney ? (
          <div className="grid gap-4 min-[820px]:grid-cols-2 min-[1280px]:grid-cols-3" role="status" aria-busy="true" aria-label="Cargando las ventas y el balance">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[330px] rounded-(--radius-widget)" />
            ))}
          </div>
        ) : month || summary?.balance30 ? (
          <div className="grid items-stretch gap-4 min-[820px]:grid-cols-(--c2) min-[1280px]:grid-cols-(--c3)" style={fit(row2)}>
            {month && weekValues.length ? (
              <Widget aria-labelledby="home-ventas" className="grid-rows-[auto_auto_minmax(0,1fr)]">
                <WidgetHead id="home-ventas" title="Ventas de la semana" subtitle={bestDay ? `Mejor día: ${bestDay}` : "Últimos 7 días"} href={hrefOfGroup("Ventas y cobros", "/finanzas")} actionLabel="Ver ventas" />
                <WidgetValue>{formatCurrency(weekTotal)}</WidgetValue>
                <HatchBars values={weekValues} labels={weekLabels} format={formatCurrency} ariaLabel="Ingresos de los últimos 7 días" />
              </Widget>
            ) : null}
            {summary?.balance30 ? (
              <Widget variant="accent" aria-labelledby="home-balance" className="grid-rows-[auto_auto_minmax(0,1fr)]">
                <WidgetHead id="home-balance" title="Balance" subtitle="Últimos 30 días" href={hrefOfGroup("Finanzas y contabilidad", "/finanzas")} actionLabel="Ver finanzas" onAccent />
                <WidgetValue>{formatCurrency(summary.balance30.balance)}</WidgetValue>
                {trend.length > 1 ? <LineArea values={trend} labels={[dayLabel(trend.length - 1), dayLabel(0)]} format={compactMoney.format} ariaLabel="Ingresos por día, últimos 30 días" /> : null}
              </Widget>
            ) : null}
            {summary?.balance30 ? (
              <Widget aria-labelledby="home-flujo" className={cn(row2 === 3 && "min-[820px]:max-[1279px]:col-span-2")}>
                <WidgetHead id="home-flujo" title="Ingresos y gastos" subtitle="Últimos 30 días" href={hrefOfGroup("Finanzas y contabilidad", "/finanzas")} actionLabel="Ver finanzas" />
                <div className="grid justify-items-center gap-4">
                  <Donut income={summary.balance30.income} expenses={summary.balance30.expenses} balance={summary.balance30.balance} />
                  <ul className="grid w-full grid-cols-2 gap-2">
                    <Chip label="Ingresos" value={compactMoney.format(summary.balance30.income)} color="var(--accent)" />
                    <Chip label="Gastos" value={compactMoney.format(summary.balance30.expenses)} color="var(--nx-graphite-400)" />
                    {month?.overdue ? <Chip label="Vencido" value={compactMoney.format(month.overdue.total)} color="var(--danger)" /> : null}
                    {customers ? <Chip label="Nuevos hoy" value={String(customers.today)} color="var(--border-strong)" /> : null}
                  </ul>
                </div>
              </Widget>
            ) : null}
          </div>
        ) : null}

        {/* Fila 3: lo que pide atención (con su salida), la actividad reciente y la agenda de hoy */}
        {pendingToday || pendingPeople || tasks.length || recent.length || today || crmToday.length ? (
          <div className="grid items-stretch gap-4 min-[820px]:grid-cols-2 min-[1280px]:grid-cols-3">
{pendingToday ? <PendingWidget label="Cargando lo de hoy" /> : (
            <Widget aria-labelledby="home-tareas" className="grid-rows-[auto_minmax(0,1fr)]">
              <WidgetHead id="home-tareas" title="Para hoy" subtitle={tasks.length ? `${tasks.length} ${tasks.length === 1 ? "pendiente" : "pendientes"}` : undefined} />
              <div className="flex flex-col gap-3">
              {tasks.length ? (
                tasks.map((t) => (
                  <article key={t.key} className={cn(widgetRow, "flex flex-1 items-center gap-3")}>
                    <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", t.dot)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ui font-semibold text-foreground">{t.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{t.note}</span>
                    </span>
                    {t.href ? (
                      <Link href={t.href} className={buttonVariants({ variant: "outline", size: "sm", className: "rounded-full border-border/60 bg-card" })}>
                        {t.cta}
                      </Link>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className={cn(widgetRow, "flex-1 text-ui text-muted-foreground")}>Todo al día: nada vencido ni por vencer.</p>
              )}
              </div>
            </Widget>
)}

{pendingPeople ? <PendingWidget label="Cargando la actividad reciente" /> : (
            <Widget aria-labelledby="home-reciente" className="grid-rows-[auto_minmax(0,1fr)]">
              <WidgetHead id="home-reciente" title="Actividad reciente" subtitle="Lo último que pasó" />
              <div className="flex flex-col gap-4">
              {recent.length ? (
                (["customer", "money"] as const).map((kind) => {
                  const rows = recent.filter((r) => (r.kind === "customer" ? "customer" : "money") === kind);
                  if (!rows.length) return null;
                  return (
                    <div key={kind} className="flex min-w-0 flex-1 flex-col gap-2">
                      {group(kind === "customer" ? "Clientes" : "Dinero")}
                      {rows.map((r) => {
                        const Icon = r.kind === "customer" ? UserPlus : Wallet;
                        return (
                          <Link key={r.id} href={hrefFor(r.href)} className={cn(widgetRow, "group flex flex-1 items-center gap-3 outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring")}>
                            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-accent-text">
                              <Icon className="size-4" strokeWidth={1.7} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-ui font-medium text-foreground">{r.title}</span>
                              <span className="block truncate text-xs text-muted-foreground">{r.note}</span>
                            </span>
                            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                          </Link>
                        );
                      })}
                    </div>
                  );
                })
              ) : (
                <p className={cn(widgetRow, "flex-1 text-ui text-muted-foreground")}>Aún no hay movimientos.</p>
              )}
              </div>
            </Widget>
)}

{pendingToday ? <PendingWidget label="Cargando la agenda de hoy" className="min-[820px]:max-[1279px]:col-span-2" /> : (
            <Widget aria-labelledby="home-agenda" className="min-[820px]:max-[1279px]:col-span-2 grid-rows-[auto_auto_minmax(0,1fr)]">
              <WidgetHead id="home-agenda" title="Agenda de hoy" subtitle="Citas y tareas del CRM" href={hrefFor("/bookings")} actionLabel="Ver la agenda" />
              <WeekStrip now={now} />
              <div className="flex flex-col gap-3">
              {events.length ? (
                events.map((e) => (
                  <Link key={e.key} href={e.href} className="grid flex-1 items-stretch gap-3 outline-none focus-visible:outline-2 focus-visible:outline-ring" style={{ gridTemplateColumns: "62px minmax(0, 1fr)" }}>
                    <span className="pt-3 text-xs text-muted-foreground">{e.time}</span>
                    <span className={cn(widgetRow, "grid content-center transition-colors hover:bg-accent-subtle")} style={e.first ? { backgroundColor: "var(--accent-subtle)", backgroundImage: "repeating-linear-gradient(135deg, transparent 0 7px, color-mix(in srgb, var(--accent) 22%, transparent) 7px 8px)" } : undefined}>
                      <span className="block truncate text-ui font-medium text-foreground">{e.title}</span>
                      {e.note ? <span className="block truncate text-xs text-muted-foreground">{e.note}</span> : null}
                    </span>
                  </Link>
                ))
              ) : (
                <p className={cn(widgetRow, "flex-1 text-ui text-muted-foreground")}>Nada programado para hoy.</p>
              )}
              </div>
            </Widget>
)}
          </div>
        ) : null}

        {/* Fila 4: accesos rápidos, clientes nuevos y equipo */}
        {actions.length || pendingPeople || customers?.latest.length || team.members.length ? (
          <div className="grid items-stretch gap-4 min-[820px]:grid-cols-(--c2) min-[1280px]:grid-cols-(--c3)" style={fit(row4)}>
            {actions.length ? (
              <Widget aria-labelledby="home-accesos" className="grid-rows-[auto_minmax(0,1fr)]">
                <WidgetHead id="home-accesos" title="Accesos rápidos" subtitle="Lo que haces cada día" />
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${actions.length === 4 ? 2 : actions.length}, minmax(0, 1fr))`, gridAutoRows: "minmax(0, 1fr)" }}>
                  {actions.map((a) => (
                    <QuickTile
                      key={a.key}
                      icon={a.icon}
                      label={a.label}
                      onClick={() => {
                        if (!quick.open(a.key)) router.push(hrefFor(a.href));
                      }}
                    />
                  ))}
                </div>
              </Widget>
            ) : null}
            {pendingPeople ? <PendingWidget label="Cargando los clientes nuevos" /> : null}
            {!pendingPeople && customers?.latest.length ? (
              <Widget aria-labelledby="home-clientes" className="grid-rows-[auto_auto_minmax(0,1fr)]">
                <WidgetHead id="home-clientes" title="Clientes nuevos" subtitle={customers.today > 0 ? `${customers.today} ${customers.today === 1 ? "nuevo" : "nuevos"} hoy` : "Los últimos en llegar"} href={hrefFor("/contactos")} actionLabel="Ver todos los clientes" />
                <WidgetValue>{customers.total}</WidgetValue>
                <div className={cn(widgetRow, "grid content-center gap-2")}>
                  <AvatarStack
                    label="Últimos clientes creados"
                    people={customers.latest.map((c) => ({ key: c.id, name: c.name, href: hrefFor(`/contactos/${c.id}`), identity: { name: c.name, id: c.id }, photoUrl: c.photoId ? `/api/files/${c.photoId}` : null }))}
                    extra={customers.total > customers.latest.length ? { text: `+${customers.total - customers.latest.length}`, href: hrefFor("/contactos"), label: `${customers.total - customers.latest.length} clientes más` } : null}
                  />
                  <p className="text-xs text-muted-foreground">{customers.total === 1 ? "cliente en total" : "clientes en total"}</p>
                </div>
              </Widget>
            ) : null}
            {pendingPeople ? <PendingWidget label="Cargando el equipo" /> : null}
            {!pendingPeople && team.members.length ? (
              <Widget aria-labelledby="home-equipo" className="grid-rows-[auto_auto_minmax(0,1fr)]">
                <WidgetHead id="home-equipo" title="Equipo" subtitle="Quién trabaja contigo" href={hrefFor("/settings?seccion=team")} actionLabel="Ver el equipo" />
                <WidgetValue>{team.total}</WidgetValue>
                <div className={cn(widgetRow, "grid content-center gap-2")}>
                  <AvatarStack
                    label="Personas del equipo"
                    people={team.members.slice(0, 5).map((m) => ({ key: m.id, name: m.name, href: hrefFor("/settings?seccion=team"), identity: { name: m.name, email: m.email, id: m.id } }))}
                    extra={team.total > 5 ? { text: `+${team.total - 5}`, href: hrefFor("/settings?seccion=team"), label: `${team.total - 5} personas más` } : null}
                  />
                  <p className="text-xs text-muted-foreground">{team.total === 1 ? "persona en el equipo" : "personas en el equipo"}</p>
                </div>
              </Widget>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Cifra clave: título con su botón circular al módulo, descripción, valor grande con su píldora de variación y pie de comparación. */
function Kpi({ id, label, description, value, href, icon: Icon, delta, hint, danger = false }: { id: string; label: string; description: string; value: string; href: string; icon: LucideIcon; delta?: number | null; hint: string; danger?: boolean }) {
  return (
    <Widget aria-labelledby={id} className="gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <h2 id={id} className="inline-flex min-w-0 items-center gap-2 text-ui font-semibold">
            <Icon aria-hidden="true" className="size-4 text-muted-foreground" strokeWidth={1.7} />
            <span className="truncate">{label}</span>
          </h2>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
        <Link href={href} aria-label={`Abrir ${label}`} className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </Link>
      </div>
      <WidgetValue>{value}</WidgetValue>
      <div className="flex flex-wrap items-center gap-2">
        <DeltaPill value={delta} />
        <p className={cn("text-xs text-muted-foreground", delta == null && danger && "text-danger")}>{delta != null ? "frente al mes anterior" : hint}</p>
      </div>
    </Widget>
  );
}

/** Ficha pequeña de la dona: punto de color, nombre y valor, sobre fondo gris claro. */
function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <li className="grid min-w-0 gap-0.5 rounded-2xl bg-surface-muted/60 px-3 py-2.5">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="truncate text-ui font-semibold tabular-nums text-foreground">{value}</span>
    </li>
  );
}

/** Dona de ingresos contra gastos con el balance al centro (SVG con los colores del sistema; sin movimiento). */
function Donut({ income, expenses, balance }: { income: number; expenses: number; balance: number }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const total = income + expenses;
  const incomeLen = total ? (income / total) * c : 0;
  const expenseLen = total ? (expenses / total) * c : 0;
  return (
    <svg role="img" aria-label={`Balance de ${compactMoney.format(balance)}: ingresos ${compactMoney.format(income)} y gastos ${compactMoney.format(expenses)}`} viewBox="0 0 150 150" style={{ width: 160, height: 160 }} className="shrink-0">
      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--surface-muted)" strokeWidth="14" />
      <g transform="rotate(-90 75 75)" fill="none" strokeWidth="14" strokeLinecap="round">
        {income > 0 ? <circle cx="75" cy="75" r={r} stroke="var(--accent)" strokeDasharray={`${Math.max(incomeLen - (expenses > 0 ? 4 : 0), 0)} ${c}`} /> : null}
        {expenses > 0 ? <circle cx="75" cy="75" r={r} stroke="var(--nx-graphite-400)" strokeDasharray={`${Math.max(expenseLen - (income > 0 ? 4 : 0), 0)} ${c}`} strokeDashoffset={-incomeLen} /> : null}
      </g>
      <text x="75" y="70" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
        Balance
      </text>
      <text x="75" y="91" textAnchor="middle" className="fill-foreground" style={{ fontSize: 17, fontWeight: 600 }}>
        {compactMoney.format(balance)}
      </text>
    </svg>
  );
}

/** Semana de la agenda: seis días alrededor de hoy, con hoy resaltado en oro. */
function WeekStrip({ now }: { now: Date }) {
  const wd = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "short" });
  const dn = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric" });
  const raw = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", month: "long", year: "numeric" }).format(now);
  const month = `${raw.charAt(0).toUpperCase()}${raw.slice(1).replace(" de ", " ")}`;
  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - 2 + i);
    return { key: i, wd: wd.format(d).replace(".", ""), n: dn.format(d), today: i === 2 };
  });
  return (
    <div className="grid gap-3">
      <p className="text-ui font-semibold text-foreground">{month}</p>
      <ol className="grid text-center text-xs" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
        {days.map((d) => (
          <li key={d.key} className="grid gap-1">
            <span className="text-muted-foreground">{d.wd}</span>
            <span aria-current={d.today ? "date" : undefined} className={cn("mx-auto grid size-7 place-items-center rounded-full tabular-nums", d.today ? "bg-accent font-semibold text-ink" : "text-foreground")}>
              {d.n}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
