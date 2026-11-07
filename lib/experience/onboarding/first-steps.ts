import { createTenantDb } from "@/lib/core/tenancy/db";
import { listProducts } from "@/lib/business/catalog/products-db";
import type { WelcomeStep } from "@/components/organisms/first-steps-indicator";

/**
 * Primeros pasos de una cuenta nueva (los del círculo de la barra superior): solo los de los módulos activos; los marca
 * hecho lo que ya hay en los datos (las últimas 20 operaciones bastan para detectar el primer cobro y el primer gasto).
 * Devuelve `[]` si ya están todos hechos o si hay menos de dos pasos aplicables.
 */
export async function loadFirstSteps(params: {
  tenantId: string;
  slug: string;
  activeModules: readonly string[];
  customerWord: string;
}): Promise<WelcomeStep[]> {
  const { tenantId, slug, activeModules, customerWord } = params;
  const on = (name: string) => activeModules.includes(name);
  const base = `/${slug}`;
  const db = createTenantDb(tenantId);
  const [customers, activity, products] = await Promise.all([
    on("crm") ? db.customers.recent(1) : [],
    on("finance") ? db.finance.getRecentActivity(20) : [],
    on("inventory") ? listProducts(tenantId, { limit: 1 }) : [],
  ]);
  const steps = [
    on("crm") && {
      id: "customer", icon: "customer", done: customers.length > 0,
      title: `Registra tu primer ${customerWord}`,
      description: "Agrega a tus contactos para llevar su historial, sus cobros y su seguimiento.",
      cta: `Nuevo ${customerWord}`, href: `${base}/contactos`,
    },
    on("finance") && {
      id: "payment", icon: "payment", done: activity.some((a) => a.type === "payment"),
      title: "Registra tu primer cobro",
      description: "Cobra y genera el comprobante para que tus ingresos queden al día.",
      cta: "Registrar pago", href: `${base}/finanzas?nuevo=pago`,
    },
    on("finance") && {
      id: "expense", icon: "expense", done: activity.some((a) => a.type === "expense"),
      title: "Agrega tus gastos",
      description: "Anota los egresos de caja para conocer tu balance real.",
      cta: "Registrar gasto", href: `${base}/finanzas?nuevo=gasto`,
    },
    on("inventory") && {
      id: "catalog", icon: "catalog", done: products.length > 0,
      title: "Arma tu catálogo",
      description: "Define lo que vendes: precios, inventario y planes, para cobrar en un toque.",
      cta: "Agregar al catálogo", href: `${base}/inventario/productos?nuevo=1`,
    },
  ].filter((step): step is WelcomeStep => Boolean(step));
  return steps.length >= 2 && steps.some((s) => !s.done) ? steps : [];
}
