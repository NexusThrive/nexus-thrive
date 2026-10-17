import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink, UserX, Wrench } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { UrlSegmentedControl } from "@/components/molecules/url-segmented-control";
import { VERTICAL_LABELS } from "@/lib/admin-catalogs";
import { getVerticalIcon } from "@/lib/admin/vertical-icons";
import { createAdminDb } from "@/lib/admin-db";
import { getAccountExtras, listManagers, ACCOUNT_STAGES } from "@/lib/ops/accounts";
import { getStaffContext } from "@/lib/ops/access";
import { moduleStatusRow } from "@/lib/plans/compat";
import { planOf } from "@/lib/plans/pricing";
import { loadPricingConfig } from "@/lib/plans/settings";
import { isOpenStatus, statusMeta } from "@/lib/ops/support-rules";
import { listTickets } from "@/lib/ops/tickets";
import { accountHealth } from "@/lib/ops/health";
import { HEALTH_LEVELS } from "@/lib/ops/health-rules";
import { getSubscriptionByTenant, listCharges } from "@/lib/ops/billing";
import { CHARGE_STATUSES, dunningLabel, SUBSCRIPTION_STATUSES } from "@/lib/ops/billing-rules";
import type { PlanKey } from "@/lib/plans/catalog";
import { formatUsdCents } from "@/lib/plans/quote";
import AuditLog from "../../_components/audit-log";
import Panel from "../../_components/panel";
import { ResumenTab, UsuariosTab } from "../../_components/tenant-drawer";
import AccountForm from "./_components/account-form";
import ContactsPanel from "./_components/contacts-panel";
import ModuleToggles from "./_components/module-toggles";
import ServiceControls from "./_components/service-controls";

export const metadata: Metadata = { title: "Ficha del negocio · NEXUS Operations Center" };

type Tab = "general" | "plan" | "acceso" | "actividad";
const TABS: { value: Tab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "plan", label: "Plan y módulos" },
  { value: "acceso", label: "Usuarios y acceso" },
  { value: "actividad", label: "Actividad" },
];


/**
 * Ficha 360° de un negocio: quién es, en qué etapa está, quién lo atiende,
 * qué plan y módulos tiene, quién entra y qué ha pasado. Las pestañas viven
 * en la URL (?tab=) para compartir el enlace exacto.
 */
export default async function AccountPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("accounts.view")) notFound();
  const { id } = await params;
  const { tab: tabRaw } = await searchParams;
  const tab: Tab = TABS.some((t) => t.value === tabRaw) ? (tabRaw as Tab) : "general";
  const can = (p: (typeof staff.permissions)[number]) => staff.permissions.includes(p);

  const adminDb = createAdminDb();
  const [detail, extras, managers, audit, pricing, tickets, subscription, charges, health] = await Promise.all([
    adminDb.getTenantDetail(id),
    getAccountExtras(id),
    listManagers(),
    can("audit.view") ? adminDb.listAuditLogs(50, { tenantId: id }) : Promise.resolve([]),
    loadPricingConfig(),
    can("tickets.view") ? listTickets({ tenantId: id }) : Promise.resolve([]),
    can("billing.view") ? getSubscriptionByTenant(id) : Promise.resolve(null),
    can("billing.view") ? listCharges({ tenantId: id }) : Promise.resolve([]),
    accountHealth({ tenantId: id }).then((r) => r[0] ?? null),
  ]);
  if (!detail || !extras) notFound();

  const { icon: VerticalIcon } = getVerticalIcon(detail.vertical);
  const plan = planOf(pricing, extras.plan as PlanKey);
  const tier = pricing.tiers.find((t) => t.id === extras.customerTierId);
  const moduleRows = detail.modules.map((m) => moduleStatusRow(pricing, detail.vertical, m.moduleName, extras.contractedModules, m.active));
  const stageLabel = ACCOUNT_STAGES.find((s) => s.value === extras.stage)?.label ?? extras.stage;
  const alerts = [
    !detail.active && { icon: AlertTriangle, tone: "danger" as const, text: `Servicio suspendido${detail.suspendedReason ? `: ${detail.suspendedReason}` : ""}` },
    !detail.onboardingCompleted && { icon: Wrench, tone: "warning" as const, text: `Onboarding sin terminar (${detail.onboardingProgress} %)` },
    detail.active && !extras.managerId && { icon: UserX, tone: "warning" as const, text: "Sin responsable de cuenta" },
  ].filter(Boolean) as { icon: typeof AlertTriangle; tone: "danger" | "warning"; text: string }[];

  return (
    <div className="grid gap-5">
      <Link href="/admin/negocios" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" /> Negocios
      </Link>

      <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <VerticalIcon aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0 flex-1 basis-[calc(100%-4rem)] sm:basis-auto">
          <h1 className="font-display text-[clamp(22px,3.4vw,30px)] font-bold leading-tight">{detail.name}</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">
            {VERTICAL_LABELS[detail.vertical]} · <span className="whitespace-nowrap font-mono">/{detail.slug}</span>
            {detail.city ? ` · ${detail.city}` : ""}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Badge tone={detail.active ? "success" : "danger"}>{detail.active ? "Servicio activo" : "Suspendido"}</Badge>
            <Badge tone="neutral">Cuenta: {stageLabel.toLowerCase()}</Badge>
            {health ? (
              <Link href="/admin/salud" title={health.factors.map((f) => `${f.label} ${f.points}/${f.max}: ${f.reason}`).join("\n")}>
                <Badge tone={HEALTH_LEVELS[health.level].tone}>
                  Salud {health.score} · {HEALTH_LEVELS[health.level].label}
                </Badge>
              </Link>
            ) : null}
            <Badge variant="gold">Thrive {plan?.name ?? extras.plan} · {formatUsdCents(subscription?.priceUsdCents ?? extras.planMonthlyUsdCents)}/mes</Badge>
            <Badge tone={extras.managerName ? "success" : "warning"}>{extras.managerName ? `Responsable: ${extras.managerName}` : "Sin responsable"}</Badge>
          </div>
        </div>
        <Link href={`/${detail.slug}`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm", className: "max-sm:w-full" })}>
          <ExternalLink aria-hidden="true" className="size-4" /> Abrir panel del negocio
        </Link>
      </header>

      {alerts.length ? (
        <ul className="grid gap-2">
          {alerts.map((a) => (
            <li key={a.text} className={`flex items-center gap-2.5 rounded-md border-l-[3px] px-3.5 py-2.5 text-[13px] ${a.tone === "danger" ? "border-l-danger bg-danger-subtle text-danger" : "border-l-accent bg-warning text-warning-foreground"}`}>
              <a.icon aria-hidden="true" className="size-4 shrink-0" />
              {a.text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-x-auto [scrollbar-width:none]">
        <UrlSegmentedControl param="tab" ariaLabel="Secciones de la ficha" value={tab} defaultValue="general" options={TABS} />
      </div>

      {tab === "general" ? (
        <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Panel title="Datos del negocio" hint="Lo que el negocio configuró en su onboarding.">
            <div className="p-[18px]">
              <ResumenTab detail={detail} />
            </div>
          </Panel>
          <div className="grid gap-3.5">
            <Panel title="Cuenta" hint="Etapa comercial y responsable en NEXUS.">
              <AccountForm tenantId={detail.id} stage={extras.stage} managerId={extras.managerId} managers={managers} canEdit={can("accounts.edit")} />
            </Panel>
            <Panel title="Contactos" hint="Para qué sirve cada canal y cuándo contactar.">
              <ContactsPanel tenantId={detail.id} contacts={extras.contacts} canEdit={can("accounts.edit")} />
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "plan" ? (
        <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="grid gap-3.5">
          <Panel title="Plan contratado">
            <div className="grid gap-1 p-[18px]">
              <p className="font-display text-[22px] font-bold">
                Thrive <span className="text-accent-text">{plan?.name ?? extras.plan}</span>
              </p>
              <p className="text-[13px] text-muted-foreground">{plan?.tagline}</p>
              <p className="mt-3 font-display text-[28px] font-bold tabular-nums">
                {formatUsdCents(subscription?.priceUsdCents ?? extras.planMonthlyUsdCents)} <span className="text-[13px] font-normal text-muted-foreground">USD/mes · {(subscription?.billingCycle ?? extras.billingCycle) === "ANNUAL" ? "anual" : "mensual"}</span>
              </p>
              <p className="text-[13px] text-muted-foreground">Clientes: {tier?.label ?? "sin tramo (negocio anterior al catálogo)"}</p>
              <p className="mt-2 text-xs text-muted-foreground">{subscription ? "Precio de la suscripción vigente." : "Precio elegido al registrarse; los cambios del catálogo aplican a registros nuevos."}</p>
            </div>
          </Panel>
          {can("billing.view") ? (
            <Panel
              title="Suscripción y cobros"
              hint={subscription ? `${SUBSCRIPTION_STATUSES.find((x) => x.value === subscription.displayStatus)?.label} · período hasta ${subscription.periodEnd}` : "Sin suscripción todavía"}
              action={
                subscription ? (
                  <Link href="/admin/facturacion?tab=suscripciones" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Facturación
                  </Link>
                ) : can("billing.record") ? (
                  <Link href={`/admin/facturacion?tab=suscripciones&suscribir=${detail.id}`} className={buttonVariants({ size: "sm" })}>
                    Crear suscripción
                  </Link>
                ) : null
              }
            >
              <ul className="divide-y divide-border">
                {charges.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/facturacion?cobro=${c.id}`} className="flex flex-wrap items-center gap-3 px-[18px] py-2.5 hover:bg-surface-muted">
                      <span className="min-w-0 flex-1 text-[13px]">
                        {c.periodStart} → {c.periodEnd}
                        <small className="block text-xs text-muted-foreground">{c.status === "PENDING" ? dunningLabel(c.dunning) : CHARGE_STATUSES.find((x) => x.value === c.status)?.label}</small>
                      </span>
                      <span className="font-mono text-[13px] tabular-nums">{formatUsdCents(c.amountUsdCents)}</span>
                    </Link>
                  </li>
                ))}
                {charges.length === 0 ? <li className="px-[18px] py-4 text-[13px] text-muted-foreground">Sin cobros.</li> : null}
              </ul>
            </Panel>
          ) : null}
          </div>
          <Panel title="Módulos" hint={can("accounts.modules") ? "Activa o desactiva módulos de este negocio." : "Solo lectura: tu rol no cambia módulos."}>
            <ModuleToggles tenantId={detail.id} modules={moduleRows} canEdit={can("accounts.modules")} />
          </Panel>
        </div>
      ) : null}

      {tab === "acceso" ? (
        <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
          <Panel title="Usuarios del negocio">
            <div className="p-[18px]">
              <UsuariosTab detail={detail} />
            </div>
          </Panel>
          <Panel title="Servicio y acceso" hint="Suspender pide un motivo; entrar como el negocio queda en la auditoría.">
            <div className="p-[18px]">
              <ServiceControls
                tenantId={detail.id}
                tenantName={detail.name}
                active={detail.active}
                canSuspend={can("accounts.suspend")}
                canImpersonate={can("accounts.impersonate")}
                hasUsers={detail.users.length > 0}
              />
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "actividad" ? (
        <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
          {can("tickets.view") ? (
            <Panel
              title="Soporte"
              hint={`${tickets.filter((t) => isOpenStatus(t.status)).length} abiertos · ${tickets.length} en total`}
              action={
                can("tickets.reply") ? (
                  <Link href={`/admin/soporte?nuevo=1&negocio=${detail.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Nuevo ticket
                  </Link>
                ) : null
              }
            >
              <ul className="divide-y divide-border">
                {tickets.slice(0, 8).map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/soporte/${t.id}`} className="flex items-center gap-3 px-[18px] py-2.5 hover:bg-surface-muted">
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[13.5px] font-medium">{t.subject}</b>
                        <small className="font-mono text-xs text-muted-foreground">{t.code}</small>
                      </span>
                      <Badge tone={statusMeta(t.status).tone}>{statusMeta(t.status).label}</Badge>
                    </Link>
                  </li>
                ))}
                {tickets.length === 0 ? <li className="px-[18px] py-4 text-[13px] text-muted-foreground">Sin tickets.</li> : null}
              </ul>
            </Panel>
          ) : null}
          <Panel title="Actividad del equipo en esta cuenta" hint="Cambios de estado, módulos, contactos y accesos.">
            <div className="p-[18px]">
              {can("audit.view") ? <AuditLog rows={audit} /> : <p className="text-[13px] text-muted-foreground">Tu rol no consulta la auditoría.</p>}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
