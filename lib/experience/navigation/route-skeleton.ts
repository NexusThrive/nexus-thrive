/** Las variantes de `PageSkeleton` (components/organisms/page-skeleton.tsx). */
export type RouteSkeletonVariant = "dashboard" | "table" | "detail" | "form" | "profile" | "apps" | "list" | "record" | "board";

export type RouteSkeleton = { variant: RouteSkeletonVariant; label: string; kpis?: boolean };

/**
 * Precarga de cada pantalla del negocio, por ruta (relativa al negocio, sin el slug). Una sola fuente: la usan el `loading.tsx` de
 * la raíz y el de cada sección (`RouteLoading`), así que mientras Next pasa de una frontera de carga a la siguiente se ve siempre el
 * mismo esqueleto, no varios seguidos. Gana el prefijo más largo; las rutas con `[id]` se escriben con `*`.
 */
const RULES: [pattern: string, skeleton: RouteSkeleton][] = [
  ["/", { variant: "apps", label: "Cargando aplicaciones" }],
  ["/bookings", { variant: "table", label: "Cargando reservas" }],
  ["/canales/avisos", { variant: "table", label: "Cargando avisos", kpis: false }],
  ["/canales/conversaciones", { variant: "table", label: "Cargando conversaciones", kpis: false }],
  ["/canales/whatsapp", { variant: "table", label: "Cargando WhatsApp", kpis: false }],
  ["/checkin", { variant: "table", label: "Cargando control de acceso", kpis: false }],
  ["/compras", { variant: "table", label: "Cargando compras", kpis: false }],
  ["/contactos", { variant: "list", label: "Cargando clientes" }],
  ["/contactos/nuevo", { variant: "record", label: "Cargando el formulario" }],
  ["/contactos/*", { variant: "record", label: "Cargando ficha" }],
  ["/crm", { variant: "board", label: "Cargando oportunidades" }],
  ["/crm/configuracion", { variant: "form", label: "Cargando la configuración", kpis: false }],
  ["/crm/formularios", { variant: "table", label: "Cargando formularios", kpis: false }],
  ["/crm/informes", { variant: "dashboard", label: "Cargando los informes" }],
  ["/crm/oportunidades/*", { variant: "record", label: "Cargando la oportunidad" }],
  ["/crm/tareas", { variant: "table", label: "Cargando tareas", kpis: false }],
  ["/data", { variant: "table", label: "Cargando importar y exportar", kpis: false }],
  ["/finanzas", { variant: "table", label: "Cargando finanzas" }],
  ["/finanzas/cartera", { variant: "table", label: "Cargando cartera", kpis: false }],
  ["/finanzas/contabilidad", { variant: "table", label: "Cargando la contabilidad", kpis: false }],
  ["/finanzas/dinero", { variant: "table", label: "Cargando tu dinero", kpis: false }],
  ["/finanzas/facturacion-electronica", { variant: "table", label: "Cargando la factura electrónica", kpis: false }],
  ["/finanzas/facturacion", { variant: "table", label: "Cargando facturación", kpis: false }],
  ["/finanzas/impuestos", { variant: "table", label: "Cargando impuestos y numeración", kpis: false }],
  ["/functions", { variant: "table", label: "Cargando funciones", kpis: false }],
  ["/integrations", { variant: "table", label: "Cargando integraciones", kpis: false }],
  ["/inventario/existencias", { variant: "table", label: "Cargando existencias", kpis: false }],
  ["/inventario/productos", { variant: "table", label: "Cargando inventario", kpis: false }],
  ["/memberships", { variant: "table", label: "Cargando membresías" }],
  ["/payments", { variant: "table", label: "Cargando pagos", kpis: false }],
  ["/presence", { variant: "table", label: "Cargando presencia en línea", kpis: false }],
  ["/presencia/crecimiento", { variant: "table", label: "Cargando campañas y reseñas", kpis: false }],
  ["/presencia/google", { variant: "table", label: "Cargando la ficha de Google", kpis: false }],
  ["/presencia/sitio", { variant: "table", label: "Cargando tu sitio web", kpis: false }],
  ["/proyectos", { variant: "table", label: "Cargando obras" }],
  ["/proyectos/*", { variant: "detail", label: "Cargando obra" }],
  ["/proyectos/catalogo-apu", { variant: "table", label: "Cargando catálogo" }],
  ["/proyectos/catalogo-apu/import", { variant: "form", label: "Cargando importador" }],
  ["/proyectos/entregables", { variant: "table", label: "Cargando entregables", kpis: false }],
  ["/settings", { variant: "form", label: "Cargando ajustes" }],
  ["/tickets", { variant: "table", label: "Cargando taquilla", kpis: false }],
  ["/ventas/cobros", { variant: "table", label: "Cargando cobros en línea", kpis: false }],
  ["/ventas/cotizaciones", { variant: "table", label: "Cargando cotizaciones", kpis: false }],
  ["/ventas/cotizaciones/anteriores", { variant: "table", label: "Cargando cotizaciones", kpis: false }],
  ["/ventas/cotizaciones/anteriores/*", { variant: "detail", label: "Cargando cotización" }],
  ["/ventas/pedidos", { variant: "table", label: "Cargando pedidos", kpis: false }],
  ["/ventas/pos", { variant: "table", label: "Cargando el punto de venta", kpis: false }],
];

const FALLBACK: RouteSkeleton = { variant: "dashboard", label: "Cargando" };

function matches(pattern: string, parts: string[]): number {
  const want = pattern.split("/").filter(Boolean);
  if (want.length > parts.length) return -1;
  // Un patrón con `*` al final solo cubre la ruta exacta de ese largo (la ficha), no sus subpáginas; sin `*`, es prefijo.
  if (want.at(-1) === "*" && want.length !== parts.length) return -1;
  for (let i = 0; i < want.length; i++) if (want[i] !== "*" && want[i] !== parts[i]) return -1;
  // Más largo gana; a igual largo, lo literal le gana al comodín («/contactos/nuevo» antes que «/contactos/*»).
  return want.length * 2 - want.filter((w) => w === "*").length;
}

/** Esqueleto de una ruta relativa al negocio («/crm», «/contactos/abc»). Inicio es «/». */
export function routeSkeleton(relativePath: string): RouteSkeleton {
  const parts = relativePath.split("?")[0]!.split("/").filter(Boolean);
  if (!parts.length) return RULES[0]![1];
  let best: RouteSkeleton | null = null;
  let score = 0;
  for (const [pattern, skeleton] of RULES.slice(1)) {
    const s = matches(pattern, parts);
    if (s > score) {
      score = s;
      best = skeleton;
    }
  }
  return best ?? FALLBACK;
}
