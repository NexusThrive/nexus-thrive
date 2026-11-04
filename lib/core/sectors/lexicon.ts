/**
 * Léxico de los sectores: qué términos puede declarar un sector (`VerticalTerms`) y los de cotizaciones y APU (`QuoteTerms`).
 *
 * Un término cambia SOLO cómo se llama algo. Si cambiarlo exige cambiar también un campo, una validación, un estado, un cálculo,
 * un permiso o una pantalla, no es terminología: es una capacidad o un proceso y necesita su propio contrato (V10 · §3.2).
 * Hoja: no importa nada de Nexus.
 */

export type VerticalTerms = {
  customer: string;
  customers: string;
  booking: string;
  bookings: string;
  item: string;
  items: string;
  /** Plural del módulo Cotizaciones (sidebar); opcional con default. */
  quotes?: string;
  /** Nombre del módulo de compras en el menú y su pantalla; sin valor, «Compras». */
  purchases?: string;
  /** Nombre del módulo de proyectos en el menú; sin valor, «Proyectos». */
  projects?: string;
  /** Texto de la acción «Crear» para un proyecto nuevo; sin valor, «Nuevo proyecto». */
  newProject?: string;
  /** Título de la sección de datos propios del cliente en su ficha; sin valor, el del perfil del rubro. */
  /** Nombre de la pantalla pública del negocio (`/sitio`) si el rubro la usa con otro fin. */
  siteLabel?: string;
  profileTitle?: string;
};

/**
 * Terminología del módulo Cotizaciones / APU por vertical.
 * `getQuoteTerms()` en lib/core/sectors/terms.ts mezcla estos defaults con
 * los overrides por rubro (construcción y carpintería usan "Presupuesto",
 * "Actividad / APU" e "Insumo").
 */
export type QuoteTerms = {
  quote: string;
  quotes: string;
  quoteItem: string;
  quoteItems: string;
  apuActivity: string;
  apuActivities: string;
  apuItem: string;
  apuItems: string;
};

export const QUOTE_TERM_DEFAULTS: QuoteTerms = {
  quote: "Cotización",
  quotes: "Cotizaciones",
  quoteItem: "Ítem",
  quoteItems: "Ítems",
  apuActivity: "Actividad",
  apuActivities: "Actividades",
  apuItem: "Recurso",
  apuItems: "Recursos",
};
