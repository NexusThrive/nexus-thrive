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
 * (`ExternalConnection`), no de un texto. Cada ficha lleva a la pantalla donde se gestiona. No hay sincronización con
 * otros sistemas ni marketplace: no existen todavía y no se anuncian.
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

  const [rows, activeNames, listing] = await Promise.all([listConnections(ctx.tenantId), activeModuleNames(ctx.tenantId), listingView(ctx.tenantId)]);
  const active = new Set(activeNames);
  const base = `/${tenant}`;
  const capability = (id: string) => CAPABILITIES.find((c) => c.id === id);
  const maturity = (id: string): Maturity => MATURITY[capability(id)?.status ?? "READY"];
  const managers = joinRoles(rolesThatCan("business.manage"));
  const cards: Card[] = [];

  if (active.has("online_payments")) {
    const payments = rows.filter((r) => r.kind === "PAYMENT");
    const base0 = { kind: "Cobros en línea", maturity: maturity("online_payments"), href: `${base}/cobros`, actionLabel: "Abrir Cobros en línea" } as const;
    if (payments.length === 0)
      cards.push({ ...base0, id: "payments-none", name: "Proveedor de pagos", description: "Aún no conectas un proveedor de pagos. Conéctalo para cobrar en línea; el ingreso se registra al confirmarse.", state: "disconnected", lastChecked: "Sin verificar" });
    for (const r of payments) {
      const name = adapterFor(r.provider, "PAYMENT")?.label ?? r.provider;
      cards.push({ ...base0, id: r.id, name, description: "Cobra en línea con este proveedor; el ingreso se registra al confirmarse.", state: stateOf(r), environment: r.environment, lastChecked: checked(r.lastCheckedAt), error: r.status === "ERROR" ? errorText(name, r.lastError) : null });
    }
  }

  if (active.has("einvoicing")) {
    const fiscal = rows.filter((r) => r.kind === "EINVOICE");
    const base0 = { kind: "Factura electrónica", maturity: maturity("einvoicing"), href: `${base}/factura-electronica`, actionLabel: "Abrir Factura electrónica" } as const;
    if (fiscal.length === 0)
      cards.push({ ...base0, id: "einvoice-none", name: "Proveedor de factura electrónica", description: "Aún no conectas un proveedor. La factura electrónica requiere uno habilitado ante la DIAN.", state: "disconnected", lastChecked: "Sin verificar" });
    for (const r of fiscal) {
      const name = r.provider === "http" ? "Proveedor tecnológico" : "Proveedor de prueba";
      cards.push({ ...base0, id: r.id, name, description: "Envía tus documentos electrónicos a este proveedor.", state: stateOf(r), environment: r.environment, lastChecked: checked(r.lastCheckedAt), error: r.status === "ERROR" ? errorText(name, r.lastError) : null });
    }
  }

  if (active.has("google")) {
    const state: ConnectionState = !listing.connected ? "disconnected" : listing.status === "ERROR" ? "attention" : "connected";
    cards.push({ id: "google", name: "Ficha de Google", kind: "Presencia en línea", description: "Trae los datos de tu ficha de Google para compararlos con los de tu negocio.", state, maturity: maturity("google"), lastChecked: checked(listing.syncedAt), error: state === "attention" ? errorText("tu ficha de Google", listing.lastError) : null, href: `${base}/google`, actionLabel: "Abrir Ficha de Google" });
  }

  if (active.has("whatsapp")) {
    cards.push({ id: "whatsapp", name: "WhatsApp", kind: "Canales", description: "Envía mensajes desde plantillas: se abre la conversación en WhatsApp con el texto listo. Todavía no está conectado a la API de WhatsApp Business.", state: "manual", maturity: maturity("whatsapp"), href: `${base}/whatsapp`, actionLabel: "Abrir WhatsApp" });
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
