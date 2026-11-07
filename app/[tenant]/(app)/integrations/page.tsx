import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/molecules/empty-state";
import { ConnectionCard, type ConnectionState, type Maturity } from "@/components/molecules/connection-card";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { buttonVariants } from "@/components/atoms/button-variants";
import { can } from "@/lib/core/auth/permissions";
import { CAPABILITIES, type CapabilityStatus } from "@/lib/core/capabilities/registry";
import { joinRoles, rolesThatCan } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { activeModuleNames } from "@/lib/core/tenancy/settings-db";
import { listingView } from "@/lib/integrations/google/google-db";
import { listConnections, type ConnectionRow } from "@/lib/integrations/providers/connections";
import { adapterFor } from "@/lib/integrations/providers/registry";
import { gatewayAccount } from "@/lib/domains/finance/payments/accounts-db";
import { getAppBaseUrl } from "@/lib/foundation/app-url";
import { WhatsappConnection } from "./_components/whatsapp-connection";
import { WompiConnection } from "./_components/wompi-connection";

const MATURITY: Record<CapabilityStatus, Maturity> = { READY: "Disponible", BETA: "En prueba", PLANNED: "En plan" };
const when = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
const checked = (iso: string | null) => (iso ? `Verificado ${when.format(new Date(iso))}` : "Sin verificar");
const stateOf = (c: ConnectionRow): ConnectionState => (c.status === "CONNECTED" ? "connected" : c.status === "ERROR" ? "attention" : "disconnected");
const errorText = (name: string, detail: string | null) =>
  `No pudimos verificar ${name}${detail ? `: ${detail}` : ""}. Reconecta la herramienta o revisa tus credenciales.`;

type Card = Omit<React.ComponentProps<typeof ConnectionCard>, "managedBy"> & { id: string };

/**
 * Integraciones (DR-18, DR-47, `10`): un solo lugar donde ver qué herramientas externas usa el negocio y en qué estado
 * están. Solo aparecen las que ya se pueden usar y cuya función está encendida (P3); el estado sale de la conexión real
 * (`ExternalConnection`), no de un texto. Cada ficha lleva a la pantalla donde se gestiona; Wompi se conecta aquí mismo
 * (HU-wompi-negocio-01), con las credenciales de cada negocio.
 */
export default async function IntegrationsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/integrations");
  if (!ctx) notFound();
  const header = <PageHeader eyebrow="Sistema" title="Integraciones" description="Las herramientas externas que usa tu negocio y en qué estado están." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="business.manage" action="ver las integraciones" />
      </div>
    );
  }

  const [rows, activeNames, listing, appUrl, wompiAccount] = await Promise.all([listConnections(ctx.tenantId), activeModuleNames(ctx.tenantId), listingView(ctx.tenantId), getAppBaseUrl(), gatewayAccount(ctx.tenantId, "wompi")]);
  const active = new Set(activeNames);
  const base = `/${tenant}`;
  const capability = (id: string) => CAPABILITIES.find((c) => c.id === id);
  const maturity = (id: string): Maturity => MATURITY[capability(id)?.status ?? "READY"];
  const managers = joinRoles(rolesThatCan("business.manage"));
  const cards: Card[] = [];

  if (active.has("online_payments")) {
    const payments = rows.filter((r) => r.kind === "PAYMENT" && r.status !== "DISCONNECTED");
    const base0 = { kind: "Cobros en línea", maturity: maturity("online_payments"), href: `${base}/ventas/cobros`, actionLabel: "Abrir Cobros en línea" } as const;
    const wompi = payments.find((r) => r.provider === "wompi") ?? null;
    // Wompi siempre tiene su ficha: sin conexión, el negocio cobra por transferencia o efectivo y no se bloquea nada.
    cards.push({
      ...base0,
      id: wompi?.id ?? "wompi-none",
      name: "Wompi",
      description: wompi
        ? "Tus clientes pagan con tarjeta o PSE y el dinero llega a tu cuenta Wompi; el ingreso se registra al confirmarse."
        : "Conecta tu cuenta Wompi para cobrar con tarjeta o PSE. Mientras tanto, tus cobros y pedidos se pagan por transferencia o efectivo y los confirmas en Cobros en línea.",
      state: wompi ? stateOf(wompi) : "disconnected",
      environment: wompi?.environment,
      lastChecked: wompi ? checked(wompi.lastCheckedAt) : "Sin verificar",
      error: wompi?.status === "ERROR" ? errorText("Wompi", wompi.lastError) : null,
      extra: <WompiConnection slug={tenant} connection={wompi ? { id: wompi.id, connected: wompi.status === "CONNECTED" } : null} eventsUrl={wompi ? `${appUrl}${wompi.webhookPath}` : null} tariff={wompiAccount?.tariff ?? { feePct: 0, feeFixed: 0, feeVatPct: 0 }} />,
    });
    for (const r of payments.filter((p) => p.provider !== "wompi")) {
      const name = adapterFor(r.provider, "PAYMENT")?.label ?? r.provider;
      cards.push({ ...base0, id: r.id, name, description: "Cobra en línea con este proveedor; el ingreso se registra al confirmarse.", state: stateOf(r), environment: r.environment, lastChecked: checked(r.lastCheckedAt), error: r.status === "ERROR" ? errorText(name, r.lastError) : null });
    }
  }

  if (active.has("einvoicing")) {
    const fiscal = rows.filter((r) => r.kind === "EINVOICE");
    const base0 = { kind: "Factura electrónica", maturity: maturity("einvoicing"), href: `${base}/finanzas/facturacion-electronica`, actionLabel: "Abrir Factura electrónica" } as const;
    if (fiscal.length === 0)
      cards.push({ ...base0, id: "einvoice-none", name: "Proveedor de factura electrónica", description: "Aún no conectas un proveedor. La factura electrónica requiere uno habilitado ante la DIAN.", state: "disconnected", lastChecked: "Sin verificar" });
    for (const r of fiscal) {
      const name = r.provider === "http" ? "Proveedor tecnológico" : "Proveedor de prueba";
      cards.push({ ...base0, id: r.id, name, description: "Envía tus documentos electrónicos a este proveedor.", state: stateOf(r), environment: r.environment, lastChecked: checked(r.lastCheckedAt), error: r.status === "ERROR" ? errorText(name, r.lastError) : null });
    }
  }

  if (active.has("google")) {
    const state: ConnectionState = !listing.connected ? "disconnected" : listing.status === "ERROR" ? "attention" : "connected";
    cards.push({ id: "google", name: "Ficha de Google", kind: "Presencia en línea", description: "Trae los datos de tu ficha de Google para compararlos con los de tu negocio.", state, maturity: maturity("google"), lastChecked: checked(listing.syncedAt), error: state === "attention" ? errorText("tu ficha de Google", listing.lastError) : null, href: `${base}/presencia/google`, actionLabel: "Abrir Ficha de Google" });
  }

  if (active.has("whatsapp")) {
    const wa = rows.find((r) => r.kind === "MESSAGING" && r.provider === "whatsapp_cloud" && r.status !== "DISCONNECTED") ?? null;
    cards.push({
      id: wa?.id ?? "whatsapp",
      name: "WhatsApp Business",
      kind: "Canales",
      description: wa
        ? "Envía y recibe por tu propio número desde Nexus. Fuera de las 24 h desde su último mensaje, el aviso queda listo para enviarlo con un toque."
        : "Conecta tu número de WhatsApp Business para enviar y recibir desde Nexus. Mientras tanto, envías con un toque por wa.me con el texto ya escrito.",
      state: wa ? stateOf(wa) : "manual",
      maturity: maturity("whatsapp"),
      environment: undefined,
      lastChecked: wa ? checked(wa.lastCheckedAt) : undefined,
      error: wa?.status === "ERROR" ? errorText("WhatsApp", wa.lastError) : null,
      href: `${base}/canales/conversaciones`,
      actionLabel: "Abrir conversaciones",
      extra: <WhatsappConnection slug={tenant} connection={wa ? { id: wa.id, connected: wa.status === "CONNECTED" } : null} webhookUrl={wa ? `${appUrl}/api/webhooks/channels/whatsapp/${wa.id}` : null} />,
    });
  }

  const dataManagers = joinRoles(rolesThatCan("data.exchange"));

  return (
    <div className="grid gap-5">
      {header}
      {cards.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            title="Aún no tienes herramientas para conectar"
            description="Cuando enciendas funciones como Cobros en línea o Factura electrónica, sus conexiones aparecerán aquí."
            action={<Link href={`${base}/functions`} className={buttonVariants({ variant: "outline" })}>Ver funciones</Link>}
          />
        </div>
      ) : (
        <section aria-label="Herramientas conectadas" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ id, ...card }) => (
            <ConnectionCard key={id} {...card} managedBy={managers} />
          ))}
          <ConnectionCard
            name="Importar y exportar"
            kind="Datos"
            description="Sube clientes y catálogo desde Excel o CSV y descarga copias de tus datos."
            state="manual"
            maturity="Disponible"
            managedBy={dataManagers}
            href={`${base}/data`}
            actionLabel="Abrir Importar y exportar"
          />
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        Aquí solo aparecen las herramientas que ya puedes usar y cuya función está encendida. Para encender otras, ve a{" "}
        <Link href={`${base}/functions`} className="font-semibold text-accent-text hover:underline">Funciones</Link>.
      </p>
    </div>
  );
}
