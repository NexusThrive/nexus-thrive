/**
 * Catálogo de datos de los sectores: para cada uno, los módulos que se activan de partida (la receta) y su vocabulario.
 *
 * Aquí viven los sectores que NO tienen código propio y los valores base de los que sí. Un sector con código puede declarar su
 * propia definición en `lib/industry/<sector>/sector.ts` y registrarla desde `lib/runtime/sectors.ts` (`registerSector`); este
 * archivo nunca importa una industria. Las exportaciones estáticas (`VERTICAL_RECIPES`, `DEFAULT_MODULES_BY_VERTICAL`…)
 * son la vista estática del catálogo base y no cambian con los registros en caliente.
 */

import { withChildModules, type ModuleValue } from "@/lib/core/capabilities/modules";
import type { QuoteTerms, VerticalTerms } from "./lexicon";
import { SIGNUP_VERTICALS, VERTICALS, VERTICAL_ICONS, VERTICAL_LABELS, type VerticalValue } from "./verticals";

export const VERTICAL_QUOTE_TERMS: Partial<
  Record<VerticalValue, QuoteTerms>
> = {
  construction: {
    quote: "Presupuesto",
    quotes: "Presupuestos",
    quoteItem: "Actividad / APU",
    quoteItems: "Actividades / APUs",
    apuActivity: "Actividad / APU",
    apuActivities: "Actividades / APUs",
    apuItem: "Insumo",
    apuItems: "Insumos",
  },
  carpentry: {
    quote: "Presupuesto",
    quotes: "Presupuestos",
    quoteItem: "Actividad / APU",
    quoteItems: "Actividades / APUs",
    apuActivity: "Actividad / APU",
    apuActivities: "Actividades / APUs",
    apuItem: "Insumo",
    apuItems: "Insumos",
  },
};

/** Receta por vertical: módulos por defecto + terminología adaptativa. */
export type VerticalRecipe = {
  modules: readonly ModuleValue[];
  terms: VerticalTerms;
  /** El rubro lleva control de acceso de socios (código QR y estado de la membresía en la ficha del cliente). */
  memberAccess?: boolean;
};

export const VERTICAL_RECIPES: Record<VerticalValue, VerticalRecipe> = {
  gym: {
    // Gimnasio [11]: clientes, pagos, membresías (con tarjeta NFC), WhatsApp, agenda de clases y catálogo.
    modules: ["dashboard", "crm", "memberships", "finance", "payments", "whatsapp", "bookings", "inventory"],
    terms: {
      customer: "Socio",
      customers: "Socios",
      booking: "Clase",
      bookings: "Clases",
      item: "Membresía",
      items: "Membresías",
      profileTitle: "Datos físicos y objetivo",
    },
    memberAccess: true,
  },
  tourism_agency: {
    modules: ["dashboard", "crm", "bookings", "payments", "finance", "whatsapp", "inventory", "billing"],
    terms: {
      customer: "Turista",
      customers: "Turistas",
      booking: "Reserva",
      bookings: "Reservas",
      item: "Tour",
      items: "Tours",
    },
  },
  hospitality: {
    modules: ["dashboard", "crm", "bookings", "inventory", "finance"],
    terms: {
      customer: "Huésped",
      customers: "Huéspedes",
      booking: "Reserva",
      bookings: "Reservas",
      item: "Servicio",
      items: "Servicios",
    },
  },
  construction: {
    modules: ["dashboard", "crm", "construction", "billing", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Proyecto",
      bookings: "Proyectos",
      item: "Servicio",
      items: "Servicios",
      quotes: "Presupuestos",
      projects: "Obras",
      newProject: "Nueva obra",
    },
  },
  carpentry: {
    modules: ["dashboard", "crm", "construction", "inventory", "purchases", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Encargo",
      bookings: "Encargos",
      item: "Producto",
      items: "Productos",
      quotes: "Presupuestos",
    },
  },
  restaurant: {
    modules: ["dashboard", "crm", "orders", "inventory", "purchases", "payments", "finance"],
    terms: {
      customer: "Comensal",
      customers: "Comensales",
      booking: "Mesa",
      bookings: "Mesas",
      item: "Plato",
      items: "Platos",
      purchases: "Compras de insumos",
    },
  },
  retail: {
    modules: ["dashboard", "crm", "orders", "inventory", "purchases", "payments", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Pedido",
      bookings: "Pedidos",
      item: "Producto",
      items: "Productos",
    },
  },
  beauty: {
    modules: ["dashboard", "crm", "bookings", "inventory", "finance", "whatsapp"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Cita",
      bookings: "Citas",
      item: "Servicio",
      items: "Servicios",
    },
  },
  healthcare: {
    modules: ["dashboard", "crm", "bookings", "finance", "whatsapp"],
    terms: {
      customer: "Paciente",
      customers: "Pacientes",
      booking: "Cita",
      bookings: "Citas",
      item: "Servicio",
      items: "Servicios",
    },
  },
  mechanic: {
    modules: ["dashboard", "crm", "bookings", "inventory", "purchases", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Cita",
      bookings: "Citas",
      item: "Servicio",
      items: "Servicios",
    },
  },
  education: {
    modules: ["dashboard", "crm", "bookings", "memberships", "finance"],
    terms: {
      customer: "Estudiante",
      customers: "Estudiantes",
      booking: "Clase",
      bookings: "Clases",
      item: "Curso",
      items: "Cursos",
    },
  },
  real_estate: {
    modules: ["dashboard", "crm", "bookings", "billing", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Visita",
      bookings: "Visitas",
      item: "Propiedad",
      items: "Propiedades",
    },
  },
  hardware_store: {
    modules: ["dashboard", "crm", "orders", "inventory", "purchases", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Pedido",
      bookings: "Pedidos",
      item: "Producto",
      items: "Productos",
    },
  },
  nautical_transport: {
    modules: ["dashboard", "crm", "bookings", "payments", "finance"],
    terms: {
      customer: "Pasajero",
      customers: "Pasajeros",
      booking: "Reserva",
      bookings: "Reservas",
      item: "Excursión",
      items: "Excursiones",
    },
  },
  tour_guides: {
    modules: ["dashboard", "crm", "bookings", "finance", "whatsapp"],
    terms: {
      customer: "Turista",
      customers: "Turistas",
      booking: "Reserva",
      bookings: "Reservas",
      item: "Tour",
      items: "Tours",
    },
  },
  events: {
    modules: ["dashboard", "crm", "bookings", "billing", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Evento",
      bookings: "Eventos",
      item: "Paquete",
      items: "Paquetes",
    },
  },
  museum: {
    // Taquilla (entradas por franja con aforo), visitas guiadas y colegios en agenda, tienda.
    modules: ["dashboard", "crm", "bookings", "inventory", "finance", "payments", "billing", "whatsapp"],
    terms: {
      customer: "Visitante",
      customers: "Visitantes",
      booking: "Visita guiada",
      bookings: "Visitas guiadas",
      item: "Entrada",
      items: "Entradas",
    },
  },
  general: {
    // Perfil general (agencia, consultora, empresa B2B, emprendimiento o negocio mixto): sin rubro cerrado.
    // Parte con lo esencial; el resto se enciende en Funciones según lo que haga el negocio.
    modules: ["dashboard", "crm", "finance", "billing", "payments"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Cita",
      bookings: "Citas",
      item: "Servicio",
      items: "Servicios",
    },
  },
};
// Las funciones que se desprendieron de otra (Cartera, Punto de venta…) llegan con ella en cada receta.
for (const vertical of VERTICALS) (VERTICAL_RECIPES[vertical] as { modules: readonly ModuleValue[] }).modules = withChildModules(VERTICAL_RECIPES[vertical].modules);

/**
 * Módulos que NEXUS activa automáticamente por vertical (derivado de las
 * recetas; el onboarding y el Panel CEO usan este mismo catálogo).
 */
export const DEFAULT_MODULES_BY_VERTICAL: Record<
  VerticalValue,
  readonly ModuleValue[]
> = Object.fromEntries(
  VERTICALS.map((vertical) => [vertical, VERTICAL_RECIPES[vertical].modules]),
) as Record<VerticalValue, readonly ModuleValue[]>;

/**
 * Definición completa de un sector: lo que el registro (`registry.ts`) guarda y lo que un sector con código puede aportar.
 * `modules` ya incluye las funciones que se desprendieron de otra (Cartera con Finanzas, Punto de venta con Pagos…).
 */
export type SectorDefinition = {
  id: string;
  label: string;
  /** Emoji para insignias y selección. */
  icon: string;
  /** ¿Se ofrece al registrarse? */
  signup: boolean;
  modules: readonly ModuleValue[];
  terms: VerticalTerms;
  /** Términos de cotizaciones/APU que difieren de los de partida. */
  quoteTerms?: QuoteTerms;
  /** El rubro lleva control de acceso de socios (QR y estado de la membresía en la ficha del cliente). */
  memberAccess?: boolean;
};

/** Los sectores del catálogo base como definiciones, en el orden de `VERTICALS`. */
export const SECTOR_CATALOG: readonly SectorDefinition[] = Object.freeze(
  VERTICALS.map((id): SectorDefinition => {
    const recipe = VERTICAL_RECIPES[id];
    return {
      id,
      label: VERTICAL_LABELS[id],
      icon: VERTICAL_ICONS[id],
      signup: (SIGNUP_VERTICALS as readonly string[]).includes(id),
      modules: recipe.modules,
      terms: recipe.terms,
      ...(VERTICAL_QUOTE_TERMS[id] ? { quoteTerms: VERTICAL_QUOTE_TERMS[id] } : {}),
      ...(recipe.memberAccess ? { memberAccess: true } : {}),
    };
  }),
);
