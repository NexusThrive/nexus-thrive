import type { ModuleValue } from "@/lib/admin/catalogs";
import { db } from "@/prisma/db";

/**
 * Qué funciones, aunque estén encendidas, todavía necesitan configuración real para operar (proveedor, ficha, publicación…).
 * Se lee de los datos del negocio; nunca se marca «lista» una función que no lo está.
 */
export type SetupState = { configured: boolean; hint: string; href: string };

export async function setupStates(tenantId: string): Promise<Partial<Record<ModuleValue, SetupState>>> {
  const [tenant, payment, einvoice, site, listing] = await Promise.all([
    db.orm.public.Tenant.where({ id: tenantId }).select("einvoiceEnabled", "accountingEnabled").first(),
    db.orm.public.ExternalConnection.where({ tenantId, kind: "PAYMENT", status: "CONNECTED" }).select("id").first(),
    db.orm.public.ExternalConnection.where({ tenantId, kind: "EINVOICE", status: "CONNECTED" }).select("id").first(),
    db.orm.public.SiteConfig.where({ tenantId, enabled: true }).select("id").first(),
    db.orm.public.GoogleListing.where({ tenantId }).select("id").first(),
  ]);
  return {
    online_payments: { configured: !!payment, hint: "Conecta tu pasarela de pagos para cobrar en línea.", href: "/cobros" },
    einvoicing: { configured: !!(tenant?.einvoiceEnabled && einvoice), hint: "Activa la factura electrónica y conecta tu proveedor autorizado.", href: "/factura-electronica" },
    accounting: { configured: !!tenant?.accountingEnabled, hint: "Activa la contabilización para que tus ventas y gastos generen asientos.", href: "/contabilidad" },
    website: { configured: !!site, hint: "Publica tu sitio para que tus clientes lo vean.", href: "/sitio" },
    google: { configured: !!listing, hint: "Conecta tu ficha de Google para compararla con tus datos.", href: "/google" },
  };
}
