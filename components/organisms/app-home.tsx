"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/atoms/skeleton";
import { AvatarStack } from "@/components/molecules/avatar-stack";
import { GridBackdrop } from "@/components/molecules/grid-backdrop";
import { AppGrid, type AppArea } from "@/components/organisms/app-grid";
import { useQuickCreate } from "@/components/organisms/quick-create-host";
import { appTransitionName } from "@/lib/experience/navigation/tenant-nav";
import { BalanceCard } from "@/components/organisms/balance-card";
import { useShell } from "@/components/providers/shell-context";
import { formatCurrency } from "@/lib/foundation/format";
import type { HomeSummary } from "@/lib/experience/dashboard/home-summary";
import { cn } from "@/lib/utils";

/** Saludo según la hora de Bogotá: «Buenos días», «Buenas tardes» o «Buenas noches». */
function greetingOf(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(now));
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
}
/** «sábado, 7 de noviembre» (la etiqueta lo pone en mayúsculas). */
function dateLine(now: Date): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" }).format(now);
}
const compactMoney = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1 });

/** Etiqueta pequeña de sección y de fecha: 11 px, mayúsculas, espaciado amplio. */
const eyebrow = "text-2xs font-semibold uppercase tracking-[0.09em] text-muted-foreground";

export type AppHomeTrial = { daysLeft: number; level: "ok" | "soon" | "ended"; planHref: string };

type HomeSnapshot = { summary: HomeSummary | null; trial: AppHomeTrial | null; userName: string | null };
/**
 * Lo último que mostró Inicio en cada negocio, en la memoria de esta pestaña (no en el navegador ni en el service worker: son datos
 * privados). Al volver a Inicio se pinta al instante con esto y solo cambian las cifras cuando llega el resumen nuevo.
 */
const lastHome = new Map<string, HomeSnapshot>();

/** Inicio con lo último que se vio (la precarga de «/»); sin nada guardado, `fallback` (el esqueleto del cajón). */
export function CachedAppHome({ fallback }: { fallback: ReactNode }) {
  const tenant = useParams<{ tenant?: string }>()?.tenant ?? "";
  const snap = lastHome.get(tenant);
  return snap ? <AppHome summary={snap.summary} trial={snap.trial} userName={snap.userName} /> : <>{fallback}</>;
}

function isThenable<T>(value: unknown): value is Promise<T> {
  return typeof (value as { then?: unknown } | null)?.then === "function";
}

/** Bloque de Inicio esperando sus cifras (la primera vez, sin nada guardado): solo ese bloque, no la página. */
function BlockSkeleton({ rows, label }: { rows: number; label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="grid gap-4 pt-2">
      <Skeleton className="h-2.5 w-20" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-36" />
        </div>
      ))}
    </div>
  );
}

/**
 * Inicio unificado: el saludo y, debajo, tres columnas. Al centro el cajón de aplicaciones (cada área habilitada para la organización
 * y el rol; abre su espacio de trabajo); a los lados, «Este mes» (ventas, vencido y balance) y «Hoy» y «Atención». Las cifras salen de
 * las mismas fuentes que Resumen (`loadHomeSummary`). Resumen ya no es una app del cajón (su ruta sigue existiendo).
 */
export function AppHome({ trial = null, summary: input, userName = null }: { trial?: AppHomeTrial | null; summary?: HomeSummary | Promise<HomeSummary | null> | null; userName?: string | null }) {
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
        lastHome.set(tenant, { summary: data, trial, userName });
        setFresh({ from: input, data });
      },
      () => {
        if (alive) setFresh({ from: input, data: lastHome.get(tenant)?.summary ?? null });
      },
    );
    return () => {
      alive = false;
    };
  }, [input, tenant, trial, userName]);
  const ready = !isPromise || fresh?.from === input;
  const summary: HomeSummary | null = !isThenable<HomeSummary | null>(input) ? (input ?? null) : ready ? fresh!.data : (lastHome.get(tenant)?.summary ?? null);
  // Solo la primera vez (nada guardado) se ven bloques en esqueleto; nunca la página entera.
  const pending = !ready && !summary;

  const { groups, hrefFor, createActions = [] } = useShell();
  const router = useRouter();
  const quick = useQuickCreate();

  // Las áreas del negocio (sin «General», que era Resumen), y al final Configuración (el ítem de «Sistema»), que también es una app.
  const areas = useMemo<AppArea[]>(() => {
    const list = groups.filter((group) => group.label !== "Sistema" && group.label !== "General" && group.items.length > 0);
    const settings = groups.find((group) => group.label === "Sistema")?.items.find((item) => item.key === "settings");
    const all = settings ? [...list, { label: "Configuración", items: [settings], icon: settings.icon }] : list;
    return all.map((g) => ({ label: g.label, href: hrefFor(g.items[0]!.href), icon: g.icon ?? g.items[0]!.icon, sections: g.items.length, vt: appTransitionName(groups, g.items[0]!.key) }));
  }, [groups, hrefFor]);
  const hrefOfGroup = (label: string, fallback: string) => hrefFor(groups.find((g) => g.label === label)?.items[0]?.href ?? fallback);
  // Acciones rápidas: las mismas de «Crear»; las que tienen mini-modal se abren aquí mismo, las demás llevan a su pantalla.
  // «Nueva reserva» no tiene mini-modal: no va aquí (se crea desde la agenda).
  const actions = createActions.filter((a) => a.key !== "booking").slice(0, 4);

  const now = new Date();
  const month = summary?.month ?? null;
  const today = summary?.today ?? null;
  const attention = summary?.attention ?? null;
  const crm = summary?.crm ?? null;
  const crmToday = crm?.today ?? [];
  const customers = summary?.customers ?? null;
  const team = summary?.team ?? { members: [], total: 0 };
  const recent = summary?.recent ?? [];
  // Columnas laterales: base 240 px, entre 220 y 290 (bajo 1100 px ocupan el ancho y se apilan arriba y abajo del cajón).
  const side = "w-full max-w-xl pt-2 min-[1100px]:w-auto min-[1100px]:min-w-[220px] min-[1100px]:max-w-[290px] min-[1100px]:flex-[1_1_240px]";

  return (
    // `data-still`: si Inicio ya se había visto (se precargó con su último estado), no repite la entrada al llegar la página real.
    <div data-bleed="" data-still={lastHome.has(tenant) ? "" : undefined} className="relative isolate min-h-[calc(100dvh-var(--topbar-height)-7rem-env(safe-area-inset-bottom,0px))] overflow-hidden md:min-h-[calc(100dvh-var(--topbar-height)-4rem)]">
      <GridBackdrop variant="home" />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-6 pb-20 pt-5">
        {/* Cabecera: saludo y, a la derecha, la pastilla de la prueba */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-1.5">
            <p suppressHydrationWarning className={eyebrow}>
              {dateLine(now)}
            </p>
            <h1 suppressHydrationWarning className="text-3xl font-semibold tracking-tight text-foreground">
              {greetingOf(now)}
              {userName ? (
                <>
                  , <span className="text-accent-text">{userName}</span>
                </>
              ) : null}
            </h1>
          </div>
          {trial ? (
            <p className="inline-flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-ui text-foreground">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
              {trial.level === "ended" ? "Tu prueba gratuita terminó" : `Tu prueba gratuita termina en ${trial.daysLeft} ${trial.daysLeft === 1 ? "día" : "días"}`}
              <a href={trial.planHref} className="font-medium text-accent-text underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                Elige un plan
              </a>
            </p>
          ) : null}
        </div>

        {/* Tres columnas: Este mes · apps · Hoy y Atención (bajo 1100 px se apilan en ese orden) */}
        <div className="flex flex-wrap items-start justify-center gap-8">
          {pending ? (
            <div className={side}>
              <BlockSkeleton rows={3} label="Cargando las cifras del mes" />
            </div>
          ) : null}
          {month || customers || team.members.length ? (
            <div className={cn(side, "grid gap-6")}>
            {month ? (
            <section aria-labelledby="home-mes">
              <h2 id="home-mes" className={eyebrow}>
                Este mes
              </h2>
              <dl className="mt-2 divide-y divide-border/60">
                <Figure label="Ventas" value={formatCurrency(month.sales)} href={hrefOfGroup("Ventas y cobros", "/finanzas")} aside={<Sparkline values={month.weekTrend} />}>
                  {month.salesChange != null ? (
                    <span className={month.salesChange >= 0 ? "text-success" : "text-danger"}>
                      {month.salesChange >= 0 ? "▲" : "▼"} {Math.abs(month.salesChange)} % frente al mes anterior
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sin mes anterior para comparar</span>
                  )}
                </Figure>
                {month.overdue ? (
                  <Figure label="Por cobrar vencido" value={formatCurrency(month.overdue.total)} href={hrefFor("/finanzas/cartera")}>
                    {month.overdue.count > 0 ? (
                      <Link href={hrefFor("/finanzas/cartera")} className="text-danger underline-offset-2 hover:underline">
                        {month.overdue.count} {month.overdue.count === 1 ? "factura vencida" : "facturas vencidas"} · Ver cartera
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Nada vencido</span>
                    )}
                  </Figure>
                ) : null}
              </dl>
            </section>
            ) : null}
            {customers?.latest.length ? (
              <section aria-labelledby="home-clientes" className="grid gap-2.5">
                <h2 id="home-clientes" className={eyebrow}>
                  Clientes nuevos
                </h2>
                <AvatarStack
                  label="Últimos clientes creados"
                  people={customers.latest.map((c) => ({ key: c.id, name: c.name, href: hrefFor(`/contactos/${c.id}`), identity: { name: c.name, id: c.id }, photoUrl: c.photoId ? `/api/files/${c.photoId}` : null }))}
                  extra={customers.today > 0 ? { text: `+${customers.today}`, href: hrefFor("/contactos"), label: `${customers.today} ${customers.today === 1 ? "cliente nuevo" : "clientes nuevos"} hoy` } : null}
                />
                <p className="text-xs text-muted-foreground">{customers.today > 0 ? `${customers.today} ${customers.today === 1 ? "nuevo" : "nuevos"} hoy · ${customers.total} en total` : `${customers.total} en total`}</p>
              </section>
            ) : null}
            {team.members.length ? (
              <section aria-labelledby="home-equipo" className="grid gap-2.5">
                <h2 id="home-equipo" className={eyebrow}>
                  Equipo
                </h2>
                <AvatarStack
                  label="Equipo del negocio"
                  people={team.members.map((m) => ({ key: m.id, name: m.name, href: hrefFor("/settings?seccion=team"), identity: { name: m.name, email: m.email, id: m.id } }))}
                  extra={team.total > team.members.length ? { text: `+${team.total - team.members.length}`, href: hrefFor("/settings?seccion=team"), label: `${team.total - team.members.length} integrantes más` } : null}
                />
                <p className="text-xs text-muted-foreground">
                  {team.total} {team.total === 1 ? "persona" : "personas"} en el equipo
                </p>
              </section>
            ) : null}
            </div>
          ) : null}

          <nav aria-label="Aplicaciones" className="w-full pt-2 min-[1100px]:w-auto min-[1100px]:flex-[0_1_560px]">
            {/* La tarjeta de balance de Finanzas (la misma, con su línea de ingresos y gastos), del ancho del cajón. */}
            {pending ? <Skeleton className="mx-auto mb-8 h-[156px] w-full max-w-[532px] rounded-xl" /> : null}
            {summary?.balance30 ? (
              <div className="mx-auto mb-8 w-full max-w-[532px]">
                <BalanceCard label="Balance · últimos 30 días" balance={summary.balance30.balance} income={summary.balance30.income} expenses={summary.balance30.expenses} />
              </div>
            ) : null}
            {actions.length ? (
              <section aria-labelledby="home-acciones" className="mx-auto mb-8 grid w-full max-w-[532px] gap-2.5">
                <h2 id="home-acciones" className={eyebrow}>
                  Acciones rápidas
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {actions.map((a) => (
                    <li key={a.key}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!quick.open(a.key)) router.push(hrefFor(a.href));
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-ui font-medium text-foreground outline-none transition-[border-color,transform] duration-(--d1) ease-(--nx-ease-out) hover:-translate-y-0.5 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      >
                        <a.icon aria-hidden="true" className="size-4 text-accent-text" />
                        {a.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <AppGrid areas={areas} badges={summary?.badges ?? {}} />
          </nav>

          {pending ? (
            <div className={side}>
              <BlockSkeleton rows={2} label="Cargando lo de hoy" />
            </div>
          ) : null}
          {today || crm || attention || recent.length ? (
            <div className={cn(side, "grid gap-[22px]")}>
              {today || crm ? (
                <section aria-labelledby="home-hoy">
                  <h2 id="home-hoy" className={eyebrow}>
                    Hoy
                  </h2>
                  <ul className="mt-1.5">
                    {today?.next ? (
                      <Row dot="bg-accent" href={hrefFor("/bookings")} title={[today.next.title, today.next.customer].filter(Boolean).join(" · ")} note={[today.next.time, today.next.status].filter(Boolean).join(" · ")} />
                    ) : today && !crmToday.length ? (
                      <Row dot="bg-muted-foreground/50" href={hrefFor("/bookings")} title="Nada programado para hoy" note="Abre la agenda para agendar una cita" />
                    ) : null}
                    {crmToday.map((t) => (
                      <Row key={t.id} dot="bg-accent" href={hrefFor(`/crm/oportunidades/${t.opportunityId}`)} title={t.label} note={t.time} />
                    ))}
                    {!today && !crmToday.length ? <Row dot="bg-muted-foreground/50" href={hrefFor("/crm")} title="Nada programado para hoy" note="Sin llamadas ni reuniones" /> : null}
                    {today && today.more > 0 ? <Row dot="bg-muted-foreground/50" href={hrefFor("/bookings")} title={`${today.more} ${today.more === 1 ? "cita más programada" : "citas más programadas"}`} note="Ver la agenda del día" /> : null}
                  </ul>
                </section>
              ) : null}
              {attention ? (
                <section aria-labelledby="home-atencion">
                  <h2 id="home-atencion" className={eyebrow}>
                    Atención
                  </h2>
                  <ul className="mt-1.5">
                    {attention.overdueCount > 0 ? (
                      <Row
                        dot="bg-danger"
                        href={hrefFor("/finanzas/cartera")}
                        title={`${attention.overdueCount} ${attention.overdueCount === 1 ? "factura vencida" : "facturas vencidas"}`}
                        note={attention.overdueTotal != null ? `${compactMoney.format(attention.overdueTotal)} por cobrar` : "Revisa la cartera"}
                      />
                    ) : null}
                    {attention.expiringCount ? (
                      <Row
                        dot="bg-gold-300"
                        href={hrefFor("/memberships")}
                        title={`${attention.expiringCount} ${attention.expiringCount === 1 ? "membresía por vencer" : "membresías por vencer"}`}
                        note={`En los próximos ${attention.expiringDays} días`}
                      />
                    ) : null}
                    {crm?.overdue ? <Row dot="bg-danger" href={hrefFor("/crm?vista=actividades")} title={`${crm.overdue} ${crm.overdue === 1 ? "actividad vencida" : "actividades vencidas"}`} note="En el CRM" /> : null}
                    {crm?.withoutActivity ? <Row dot="bg-muted-foreground/50" href={hrefFor("/crm")} title={`${crm.withoutActivity} ${crm.withoutActivity === 1 ? "oportunidad sin actividad" : "oportunidades sin actividad"}`} note="Programa el siguiente paso" /> : null}
                    {attention.overdueCount === 0 && !attention.expiringCount && !crm?.overdue && !crm?.withoutActivity ? <Row dot="bg-success" title="Todo al día" note="Nada vencido ni por vencer" /> : null}
                  </ul>
                </section>
              ) : null}
              {recent.length ? (
                <section aria-labelledby="home-reciente">
                  <h2 id="home-reciente" className={eyebrow}>
                    Actividad reciente
                  </h2>
                  <ul className="mt-1.5">
                    {recent.map((r) => (
                      <Row key={r.id} dot={r.kind === "expense" ? "bg-muted-foreground/50" : r.kind === "payment" ? "bg-success" : "bg-accent"} href={hrefFor(r.href)} title={r.title} note={r.note} />
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Cifra de «Este mes»: etiqueta, valor grande (enlaza a su módulo), un acompañante opcional a la derecha y la nota debajo. */
function Figure({ label, value, href, aside, children }: { label: string; value: string; href: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-center justify-between gap-3">
        <Link href={href} className="text-2xl font-semibold tracking-tight text-foreground tabular-nums outline-none hover:text-accent-text focus-visible:outline-2 focus-visible:outline-ring">
          {value}
        </Link>
        {aside}
      </dd>
      <dd className="text-xs">{children}</dd>
    </div>
  );
}

/** Fila de «Hoy» y «Atención»: punto de estado, texto principal (dorado al pasar) y secundario. */
function Row({ dot, title, note, href }: { dot: string; title: string; note: string; href?: string }) {
  const body = (
    <>
      <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot)} />
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate text-ui text-foreground transition-colors duration-(--d1) group-hover:text-accent-text motion-reduce:transition-none">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{note}</span>
      </span>
    </>
  );
  return (
    <li className="border-b border-border/60">
      {href ? (
        <Link href={href} className="group flex gap-3 py-3 outline-none focus-visible:outline-2 focus-visible:outline-ring">
          {body}
        </Link>
      ) : (
        <div className="flex gap-3 py-3">{body}</div>
      )}
    </li>
  );
}

/** Línea de tendencia de 84×30 hecha con SVG a partir de los ingresos de la semana. Sin datos, no se pinta. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => `${((i / (values.length - 1)) * 82 + 1).toFixed(1)},${(29 - ((v - min) / span) * 28).toFixed(1)}`).join(" ");
  return (
    <svg aria-hidden="true" viewBox="0 0 84 30" className="h-[30px] w-[84px] shrink-0 text-success">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
