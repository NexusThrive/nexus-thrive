import { isModule, type ModuleValue } from "@/lib/core/capabilities/modules";

/**
 * «Tu operación»: cómo funciona el negocio (qué vende, cómo vende, qué controla y qué usa hoy). El rubro identifica y la etapa
 * contextualiza; estas respuestas deciden qué capacidades se preparan al empezar. Todo es opcional: quien no responde recibe lo
 * esencial de su rubro. Puras: sirven en el navegador y en el servidor.
 */
export const OFFERS = [
  { value: "PRODUCTS", label: "Productos", hint: "Mercancía que tienes o produces." },
  { value: "SERVICES", label: "Servicios", hint: "Trabajo, citas, planes o suscripciones." },
] as const;

export const CHANNELS = [
  { value: "COUNTER", label: "Vendo en mostrador", hint: "Cobro en el local, con caja y turnos." },
  { value: "ORDERS", label: "Recibo pedidos", hint: "Por la web, redes o a domicilio." },
  { value: "WHATSAPP", label: "Atiendo por WhatsApp", hint: "Clientes que escriben para preguntar o pedir." },
  { value: "QUOTES", label: "Hago cotizaciones o contratos", hint: "Presupuestos que el cliente aprueba." },
  { value: "BOOKINGS", label: "Agendo citas, clases o reservas", hint: "Con fecha y hora." },
] as const;

export const CONTROLS = [
  { value: "INVENTORY", label: "Inventario", hint: "Cuánto tengo de cada cosa." },
  { value: "SUPPLIERS", label: "Compras y proveedores", hint: "Lo que pido y a quién." },
  { value: "INCOME_EXPENSES", label: "Ingresos y gastos", hint: "Cuánto entra y cuánto sale." },
  { value: "RECEIVABLES", label: "Lo que me deben (fiado)", hint: "Ventas a crédito y cobros pendientes." },
  { value: "INVOICING", label: "Facturación", hint: "Facturas y documentos para mis clientes." },
] as const;

export const TOOLS = [
  { value: "NOTEBOOK", label: "Cuaderno o papel" },
  { value: "SPREADSHEET", label: "Excel u hojas de cálculo" },
  { value: "SOFTWARE", label: "Otro programa administrativo" },
  { value: "NONE", label: "Nada todavía" },
] as const;

export type Offer = (typeof OFFERS)[number]["value"];
export type Channel = (typeof CHANNELS)[number]["value"];
export type Control = (typeof CONTROLS)[number]["value"];
export type Tool = (typeof TOOLS)[number]["value"];

export type OperationAnswers = { offers: Offer[]; channels: Channel[]; controls: Control[]; tools: Tool[] };

export const EMPTY_OPERATION: OperationAnswers = { offers: [], channels: [], controls: [], tools: [] };

const only = <T extends string>(raw: unknown, allowed: readonly { value: T }[]): T[] => {
  const set = new Set<string>(allowed.map((a) => a.value));
  return Array.isArray(raw) ? [...new Set(raw.filter((x): x is T => typeof x === "string" && set.has(x)))] : [];
};

/** Deja solo valores conocidos y sin repetir (lo que llega del navegador no se toma tal cual). */
export function sanitizeOperation(raw: unknown): OperationAnswers {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { offers: only(o.offers, OFFERS), channels: only(o.channels, CHANNELS), controls: only(o.controls, CONTROLS), tools: only(o.tools, TOOLS) };
}

export const hasOperation = (a: OperationAnswers) => a.offers.length + a.channels.length + a.controls.length > 0;

/**
 * Capacidades que conviene preparar según lo que respondió. Siempre incluye clientes y finanzas básicas; el plan y el rubro
 * deciden después cuáles se pueden activar (`resolveModules`).
 */
export function recommendedModules(a: OperationAnswers): ModuleValue[] {
  const out = new Set<string>(["dashboard"]);
  if (hasOperation(a)) {
    out.add("crm");
    out.add("finance");
  }
  if (a.channels.includes("COUNTER")) out.add("pos");
  if (a.channels.includes("ORDERS")) out.add("orders");
  if (a.channels.includes("WHATSAPP")) out.add("whatsapp");
  if (a.channels.includes("QUOTES")) out.add("quotes");
  if (a.channels.includes("BOOKINGS")) out.add("bookings");
  if (a.controls.includes("INVENTORY") || a.offers.includes("PRODUCTS")) out.add("inventory");
  if (a.controls.includes("SUPPLIERS")) out.add("purchases");
  if (a.controls.includes("RECEIVABLES")) out.add("receivables");
  if (a.controls.includes("INVOICING")) out.add("billing");
  return [...out].filter(isModule) as ModuleValue[];
}

/** Frase para el resumen («Vende productos · Mostrador y WhatsApp · Inventario y fiado»). */
export function operationSummary(a: OperationAnswers): string {
  const label = <T extends string>(list: readonly { value: T; label: string }[], values: readonly T[]) => values.map((v) => list.find((x) => x.value === v)?.label ?? v);
  return [label(OFFERS, a.offers).join(" y "), label(CHANNELS, a.channels).join(", "), label(CONTROLS, a.controls).join(", ")].filter(Boolean).join(" · ");
}
