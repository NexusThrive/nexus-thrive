import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BadgePercent,
  Banknote,
  BookOpen,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  FolderOpen,
  HardHat,
  Layers,
  LayoutDashboard,
  MessageCircle,
  Package,
  BookOpenCheck,
  FileCheck2,
  Globe,
  HandCoins,
  CheckSquare,
  MapPin,
  Target,
  Megaphone,
  PackageCheck,
  Link2,
  Percent,
  Receipt,
  Repeat,
  ScanLine,
  ShoppingCart,
  Ticket,
  Truck,
  Warehouse,
  UserRoundPlus,
  Users,
  Wallet,
  BarChart3,
  Settings2,
  SlidersHorizontal,
  Store,
  Tags,
  Landmark,
  Bell,
} from "lucide-react";
import type { VerticalValue } from "@/lib/core/sectors/verticals";
import type { VerticalTerms } from "@/lib/core/sectors/lexicon";

/**
 * Registro de capacidades (ADR-0003): la ÚNICA declaración de cada módulo.
 *
 * De aquí salen la lista de módulos y sus nombres (`lib/core/capabilities/modules.ts`),
 * el menú del negocio y las rutas que el servidor exige
 * (`lib/core/capabilities/route-modules.ts` → `modulesForRoute`), los iconos y textos
 * del onboarding (`lib/experience/onboarding/module-meta.ts`) y el catálogo inicial de
 * precios y estados (`lib/core/entitlements/pricing.ts`, `lib/core/entitlements/catalog.ts`).
 *
 * Agregar un módulo: una entrada aquí + su carpeta en `app/[tenant]/(app)/`
 * (+ opcionalmente la receta del rubro en `catalogs.ts`). La base guarda el id
 * como texto y se valida contra este registro (`isModule`).
 */

/**
 * Un solo sistema (regla de plataforma): TODAS las capacidades están incluidas
 * en todos los planes y cualquier negocio puede encenderlas. Lo que limita al
 * plan es el USO (usuarios, clientes y consumo), nunca una función ni un rubro.
 * El rubro es un perfil: da el vocabulario y sugiere cuáles empiezan
 * encendidas (`VERTICAL_RECIPES`), pero no oculta ni bloquea nada.
 * `kind: "specialized"` solo agrupa las especialidades de un oficio (obras con
 * APU, control de acceso del gimnasio, pedidos del restaurante…): vienen en el
 * sistema, integradas con el resto.
 */
export type CapabilityStatus = "READY" | "BETA" | "PLANNED";

export type CapabilityNav = {
  href: string;
  icon: LucideIcon;
  label: (terms: VerticalTerms, vertical: VerticalValue) => string;
  /** Solo para estos rubros (pantallas propias del rubro). */
  verticals?: readonly VerticalValue[];
  /** Grupo de la barra lateral si no es el de la función (una función puede repartirse entre grupos). */
  category?: CapabilityCategory;
  /** `false`: la ruta existe y da acceso con la función (permiso y módulo), pero no sale en la barra (se llega desde otra pantalla). */
  menu?: false;
};

/** Categoría de la función: la misma en la barra lateral y en la página Funciones. */
export type CapabilityCategory = "Clientes y agenda" | "CRM" | "Ventas y cobros" | "Punto de venta" | "Inventario" | "Facturación" | "Obras y proyectos" | "Compras y gastos" | "Finanzas y contabilidad" | "Presencia en línea" | "Canales";
/** Orden de la barra lateral y de «Funciones»: del trato con el cliente, a vender y cobrar, a gastar y contabilizar, a darse a conocer. */
export const CAPABILITY_CATEGORIES: readonly CapabilityCategory[] = ["Clientes y agenda", "CRM", "Ventas y cobros", "Punto de venta", "Inventario", "Facturación", "Obras y proyectos", "Compras y gastos", "Finanzas y contabilidad", "Presencia en línea", "Canales"];

export type CapabilityDefinition = {
  id: string;
  /** Dónde vive la función en el menú y en «Funciones». */
  category: CapabilityCategory;
  /** Función de la que se desprendió: los negocios que ya la tenían reciben también esta (y los nuevos la traen con ella). */
  parent?: string;
  /** Base (cualquier negocio) o especializado (operación de algunos rubros). */
  kind: "base" | "specialized";
  /** Nombre corto (panel, chips). */
  label: string;
  /** Nombre comercial (planes, onboarding). */
  name: string;
  /** Qué hace, en el catálogo de planes. */
  description: string;
  /** Qué hace, en el onboarding. */
  pitch: string;
  icon: LucideIcon;
  /** Estado inicial en el catálogo (el panel lo puede ajustar después). */
  status: CapabilityStatus;
  /** Precio mensual base en USD (antes del factor del rubro); 0 = sin costo. */
  priceUsd: number;
  /** Incluido en todos los planes. */
  included?: boolean;
  /** Útil para cualquier rubro aunque no esté en su receta. */
  general?: boolean;
  /** Entradas del menú del negocio; de sus rutas sale `modulesForRoute`. */
  nav: readonly CapabilityNav[];
};

export const CAPABILITIES = [
  {
    id: "crm",
    category: "Clientes y agenda",
    kind: "base",
    label: "CRM",
    name: "Clientes",
    description: "Clientes, fichas 360° y seguimiento.",
    pitch: "Clientes, fichas 360° y seguimiento.",
    icon: UserRoundPlus,
    status: "READY",
    priceUsd: 0,
    included: true,
    nav: [
      { href: "/contactos", icon: Users, label: (terms) => terms.customers },
      // La app CRM: Pipeline, Informes, Tareas y Configuración («Ventas» se confundía con la app Ventas y cobros). Entregables y Formularios web siguen con su ruta y su
      // acceso, y se abren desde Configuración del CRM (y las actividades del pipeline también son tareas).
      { href: "/crm", icon: Target, label: () => "Pipeline", category: "CRM" },
      { href: "/crm/informes", icon: BarChart3, label: () => "Informes", category: "CRM" },
      { href: "/crm/tareas", icon: CheckSquare, label: () => "Tareas", category: "CRM" },
      { href: "/crm/configuracion", icon: Settings2, label: () => "Configuración", category: "CRM" },
      { href: "/proyectos/entregables", icon: FileCheck2, label: () => "Entregables", category: "CRM", menu: false },
      { href: "/crm/formularios", icon: Link2, label: () => "Formularios web", category: "CRM", menu: false },
    ],
  },
  {
    id: "bookings",
    category: "Clientes y agenda",
    kind: "base",
    label: "Reservas",
    name: "Reservas",
    description: "Reservas, citas y agenda.",
    pitch: "Reservas, citas y agenda.",
    icon: CalendarDays,
    status: "READY",
    priceUsd: 0,
    nav: [
      { href: "/bookings", icon: CalendarDays, label: (terms) => terms.bookings },
      { href: "/tickets", icon: Ticket, label: () => "Taquilla" },
      // "Salidas" (turismo) vuelve cuando exista su pantalla: hoy solo hay tablas (ARCH-02).
    ],
  },
  {
    id: "payments",
    category: "Ventas y cobros",
    kind: "base",
    label: "Pagos",
    name: "Pagos",
    description: "Cobros y control de pagos.",
    pitch: "Cobros y control de pagos.",
    icon: CreditCard,
    status: "READY",
    priceUsd: 0,
    general: true,
    nav: [
      // Cobros tiene su página y vive en el grupo de Finanzas del menú (aunque la función sea «Pagos»).
      { href: "/finanzas/cobros", icon: Banknote, label: () => "Cobros", category: "Finanzas y contabilidad" },
    ],
  },
  {
    id: "billing",
    category: "Facturación",
    kind: "base",
    label: "Facturación",
    name: "Facturación",
    description: "Cuentas de cobro y recibos numerados.",
    pitch: "Facturas para tus clientes.",
    icon: FileText,
    status: "READY",
    priceUsd: 0,
    general: true,
    nav: [
      { href: "/finanzas/facturacion", icon: Receipt, label: () => "Facturación" },
    ],
  },
  {
    id: "inventory",
    category: "Inventario",
    kind: "base",
    label: "Inventario",
    name: "Catálogo e inventario",
    description: "Productos, servicios, planes y stock.",
    pitch: "Productos, stock y reposiciones.",
    icon: Package,
    status: "READY",
    priceUsd: 0,
    general: true,
    nav: [
      { href: "/inventario/productos", icon: Package, label: () => "Catálogo" },
      { href: "/inventario/existencias", icon: Warehouse, label: () => "Existencias" },
      // Pantallas de apoyo: se llega desde el menú Configuración de la app, no desde la barra.
      { href: "/inventario/categorias", icon: Tags, label: () => "Categorías", menu: false },
      { href: "/inventario/atributos", icon: SlidersHorizontal, label: () => "Atributos", menu: false },
      { href: "/ventas/listas-precios", icon: BadgePercent, label: () => "Listas de precios", menu: false },
    ],
  },
  {
    id: "finance",
    category: "Finanzas y contabilidad",
    kind: "base",
    label: "Finanzas",
    name: "Finanzas",
    description: "Cobros, gastos y caja menor.",
    pitch: "Gastos e ingresos en un solo lugar.",
    icon: Wallet,
    status: "READY",
    priceUsd: 0,
    included: true,
    nav: [
      { href: "/finanzas", icon: Wallet, label: () => "Panorama" },
      { href: "/finanzas/caja", icon: Landmark, label: () => "Caja menor" },
      { href: "/finanzas/dinero", icon: Banknote, label: () => "¿Dónde está mi dinero?" },
    ],
  },
  {
    id: "dashboard",
    category: "Clientes y agenda",
    kind: "base",
    label: "Dashboard",
    name: "Inicio",
    description: "Tu tablero con lo esencial del día a día.",
    pitch: "Tu tablero con lo esencial del día a día.",
    icon: Layers,
    status: "READY",
    priceUsd: 0,
    included: true,
    // «Notificaciones» va justo debajo de Resumen y es para todos los roles (cada persona ve su propio buzón).
    nav: [
      { href: "/resumen", icon: LayoutDashboard, label: () => "Resumen" },
      { href: "/notificaciones", icon: Bell, label: () => "Notificaciones" },
    ],
  },
  {
    id: "whatsapp",
    category: "Canales",
    kind: "base",
    label: "WhatsApp",
    name: "WhatsApp",
    description: "Plantillas y envío por WhatsApp.",
    pitch: "Atiende y responde desde WhatsApp.",
    icon: MessageCircle,
    status: "READY",
    priceUsd: 0,
    general: true,
    nav: [
      { href: "/canales/whatsapp", icon: MessageCircle, label: () => "WhatsApp" },
      { href: "/canales/conversaciones", icon: MessageCircle, label: () => "Conversaciones" },
      { href: "/canales/avisos", icon: MessageCircle, label: () => "Plantillas y avisos" },
    ],
  },
  {
    id: "memberships",
    category: "Clientes y agenda",
    kind: "specialized",
    label: "Membresías",
    name: "Membresías",
    description: "Planes y membresías recurrentes.",
    pitch: "Planes y membresías recurrentes.",
    icon: Repeat,
    status: "READY",
    priceUsd: 0,
    nav: [
      { href: "/memberships", icon: CreditCard, label: () => "Membresías" },
      { href: "/checkin", icon: ScanLine, label: () => "Control de acceso" },
    ],
  },
  {
    // Compras a proveedores con recepción de mercancía al inventario. Depende
    // de «Catálogo e inventario» (la mercancía entra por su servicio de stock).
    id: "purchases",
    category: "Compras y gastos",
    kind: "base",
    label: "Compras",
    name: "Compras y proveedores",
    description: "Órdenes de compra, proveedores y recepción de mercancía.",
    pitch: "Compra a tus proveedores y recibe la mercancía en tu inventario.",
    icon: Truck,
    status: "BETA",
    priceUsd: 0,
    general: true,
    // El restaurante compra insumos; el resto, mercancía.
    nav: [{ href: "/compras", icon: Truck, label: (terms) => terms.purchases ?? "Compras" }],
  },
  {
    id: "orders",
    category: "Ventas y cobros",
    kind: "specialized",
    label: "Pedidos",
    name: "Pedidos",
    description: "Pedidos y ventas.",
    pitch: "Pedidos y ventas.",
    icon: ShoppingCart,
    status: "PLANNED",
    priceUsd: 0,
    nav: [{ href: "/ventas/pedidos", icon: ShoppingCart, label: () => "Pedidos" }],
  },
  {
    // Cotización comercial genérica: llega con el documento comercial
    // unificado (Bloque B, paso 2). Hasta entonces no tiene pantallas.
    id: "quotes",
    category: "Ventas y cobros",
    kind: "specialized",
    label: "Cotizaciones",
    name: "Cotizaciones",
    description: "Cotizaciones comerciales con tu catálogo: al aprobarlas nace el pedido con su anticipo.",
    pitch: "Cotizaciones para tus clientes.",
    icon: BadgeCheck,
    status: "READY",
    priceUsd: 0,
    nav: [{ href: "/ventas/cotizaciones", icon: BadgeCheck, label: () => "Cotizaciones" }],
  },
  {
    // Suite de construcción (ARCH-01): obras, presupuestos APU, Lean,
    // bitácora y actas. Solo constructoras y carpinterías.
    id: "construction",
    category: "Obras y proyectos",
    kind: "specialized",
    label: "Construcción",
    name: "Obras y presupuestos",
    description: "Obras, presupuestos y catálogo APU.",
    pitch: "Obras, presupuestos APU y control de obra.",
    icon: HardHat,
    status: "READY",
    priceUsd: 0,
    nav: [
      {
        href: "/proyectos",
        icon: Building2,
        label: (terms) => terms.projects ?? "Proyectos",
      },
      { href: "/ventas/cotizaciones/anteriores", icon: FolderOpen, label: () => "Cotizaciones" },
      { href: "/proyectos/catalogo-apu", icon: BookOpen, label: () => "Catálogo APU" },
    ],
  },
  {
    id: "pos",
    category: "Punto de venta",
    parent: "payments",
    kind: "base",
    label: "Punto de venta",
    name: "Punto de venta",
    description: "Caja, turnos y venta multilínea con devoluciones.",
    pitch: "Vende en mostrador con turnos de caja, varias líneas y devoluciones.",
    icon: ShoppingCart,
    status: "READY",
    priceUsd: 0,
    general: true,
    nav: [{ href: "/pos", icon: Store, label: () => "Punto de venta" }],
  },
  {
    id: "online_payments",
    category: "Ventas y cobros",
    parent: "payments",
    kind: "base",
    label: "Cobros en línea",
    name: "Cobros en línea",
    description: "Enlaces de pago, pasarelas y conciliación.",
    pitch: "Cobra con enlaces de pago y concilia lo que entra.",
    icon: Link2,
    status: "READY",
    priceUsd: 0,
    general: true,
    nav: [{ href: "/ventas/cobros", icon: Link2, label: () => "Cobros en línea" }],
  },
  {
    id: "einvoicing",
    category: "Facturación",
    parent: "billing",
    kind: "base",
    label: "Factura electrónica",
    name: "Factura electrónica",
    description: "Envío de facturas electrónicas por un proveedor autorizado.",
    pitch: "Emite facturas electrónicas con tu proveedor autorizado.",
    icon: FileCheck2,
    status: "BETA",
    priceUsd: 0,
    general: true,
    nav: [{ href: "/finanzas/facturacion-electronica", icon: FileCheck2, label: () => "Factura electrónica" }],
  },
  {
    id: "receivables",
    category: "Finanzas y contabilidad",
    parent: "finance",
    kind: "base",
    label: "Cartera",
    name: "Cartera",
    description: "Cuentas por cobrar y por pagar, con vencimientos.",
    pitch: "Controla lo que te deben y lo que debes.",
    icon: HandCoins,
    status: "READY",
    priceUsd: 0,
    general: true,
    nav: [{ href: "/finanzas/cartera", icon: HandCoins, label: () => "Cartera" }],
  },
  {
    id: "accounting",
    category: "Finanzas y contabilidad",
    parent: "finance",
    kind: "base",
    label: "Contabilidad",
    name: "Contabilidad",
    description: "Plan de cuentas, asientos, períodos y estados financieros.",
    pitch: "Plan de cuentas, asientos y estados financieros para tu contador.",
    icon: BookOpenCheck,
    status: "BETA",
    priceUsd: 0,
    general: true,
    nav: [{ href: "/finanzas/contabilidad", icon: BookOpenCheck, label: () => "Contabilidad" }],
  },
  {
    id: "taxes",
    category: "Finanzas y contabilidad",
    parent: "finance",
    kind: "base",
    label: "Impuestos y numeración",
    name: "Impuestos y numeración",
    description: "Tarifas con vigencia, retenciones y numeración de documentos.",
    pitch: "Impuestos con vigencia y numeración de tus documentos.",
    icon: Percent,
    status: "READY",
    priceUsd: 0,
    general: true,
    nav: [{ href: "/finanzas/impuestos", icon: Percent, label: () => "Impuestos y numeración" }],
  },
  {
    id: "website",
    category: "Presencia en línea",
    parent: "inventory",
    kind: "base",
    label: "Sitio y tienda",
    name: "Sitio web y tienda en línea",
    description: "Mini-sitio público y tienda con pedidos.",
    pitch: "Tu sitio web y tu tienda en línea, con pedidos y cobro.",
    icon: Globe,
    status: "READY",
    priceUsd: 0,
    general: true,
    nav: [
      { href: "/presencia/sitio", icon: Globe, label: (terms) => terms.siteLabel ?? "Mi sitio web" },
      { href: "/ventas/pedidos", icon: PackageCheck, label: () => "Pedidos" },
    ],
  },
  {
    id: "google",
    category: "Presencia en línea",
    parent: "inventory",
    kind: "base",
    label: "Ficha de Google",
    name: "Ficha de Google",
    description: "Compara tu ficha de Google con tus datos y mira tu calificación.",
    pitch: "Que Google muestre tus datos correctos y tu calificación.",
    icon: MapPin,
    status: "BETA",
    priceUsd: 0,
    general: true,
    nav: [{ href: "/presencia/google", icon: MapPin, label: () => "Ficha de Google" }],
  },
  {
    id: "growth",
    category: "Presencia en línea",
    parent: "inventory",
    kind: "base",
    label: "Campañas y reseñas",
    name: "Campañas y reseñas",
    description: "Enlaces con UTM, origen de tus ventas y reseñas.",
    pitch: "Sabe de dónde vienen tus clientes y pide reseñas.",
    icon: Megaphone,
    status: "READY",
    priceUsd: 0,
    general: true,
    nav: [{ href: "/presencia/crecimiento", icon: Megaphone, label: () => "Campañas y reseñas" }],
  },
] as const satisfies readonly CapabilityDefinition[];

export type CapabilityId = (typeof CAPABILITIES)[number]["id"];

/** Definición de una capacidad por id. */
export function capability(id: CapabilityId): CapabilityDefinition {
  return CAPABILITIES.find((c) => c.id === id)!;
}

/** Funciones que se desprendieron de otra: `padre → hijas`. */
export const CHILDREN_OF: Readonly<Record<string, readonly string[]>> = CAPABILITIES.reduce<Record<string, string[]>>((acc, c) => {
  const parent = (c as CapabilityDefinition).parent;
  if (parent) (acc[parent] ??= []).push(c.id);
  return acc;
}, {});

/** Grupo de la barra lateral de cada ruta que lo cambia respecto de su función. */
export const NAV_CATEGORY: ReadonlyMap<string, CapabilityCategory> = new Map(
  CAPABILITIES.flatMap((c) => (c.nav as readonly CapabilityNav[]).filter((n) => n.category).map((n) => [n.href.split("?")[0]!, n.category!] as const)),
);
