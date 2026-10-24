import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
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
  MapPin,
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
} from "lucide-react";
import type { VerticalTerms, VerticalValue } from "@/lib/admin/catalogs";

/**
 * Registro de capacidades (ADR-0003): la ÚNICA declaración de cada módulo.
 *
 * De aquí salen la lista de módulos y sus nombres (`lib/admin/catalogs.ts`),
 * el menú del negocio y las rutas que el servidor exige
 * (`lib/navigation/tenant-nav.ts` → `modulesForRoute`), los iconos y textos
 * del onboarding (`lib/onboarding/module-meta.ts`) y el catálogo inicial de
 * precios y estados (`lib/plans/pricing.ts`, `lib/plans/catalog.ts`).
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
};

/** Categoría de la función: la misma en la barra lateral y en la página Funciones. */
export type CapabilityCategory = "Clientes y agenda" | "Productos y pedidos" | "Obras y proyectos" | "Ventas y cobros" | "Compras y gastos" | "Finanzas y contabilidad" | "Presencia en línea" | "Canales";
/** Orden de la barra lateral y de «Funciones»: del trato con el cliente, a vender y cobrar, a gastar y contabilizar, a darse a conocer. */
export const CAPABILITY_CATEGORIES: readonly CapabilityCategory[] = ["Clientes y agenda", "Productos y pedidos", "Obras y proyectos", "Ventas y cobros", "Compras y gastos", "Finanzas y contabilidad", "Presencia en línea", "Canales"];

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
    nav: [{ href: "/crm", icon: Users, label: (terms) => terms.customers }],
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
      { href: "/finance?tab=cobros", icon: Banknote, label: () => "Pagos" },
    ],
  },
  {
    id: "billing",
    category: "Ventas y cobros",
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
      { href: "/billing", icon: Receipt, label: () => "Facturación" },
    ],
  },
  {
    id: "inventory",
    category: "Productos y pedidos",
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
      { href: "/inventory", icon: Package, label: () => "Catálogo" },
      { href: "/stock", icon: Warehouse, label: () => "Existencias" },
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
      { href: "/finance", icon: Wallet, label: () => "Finanzas" },
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
    nav: [{ href: "", icon: LayoutDashboard, label: () => "Inicio" }],
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
    nav: [{ href: "/whatsapp", icon: MessageCircle, label: () => "WhatsApp" }],
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
    nav: [{ href: "/purchases", icon: Truck, label: (_terms, vertical) => (vertical === "restaurant" ? "Compras de insumos" : "Compras") }],
  },
  {
    id: "orders",
    category: "Productos y pedidos",
    kind: "specialized",
    label: "Pedidos",
    name: "Pedidos",
    description: "Pedidos y ventas.",
    pitch: "Pedidos y ventas.",
    icon: ShoppingCart,
    status: "PLANNED",
    priceUsd: 0,
    nav: [{ href: "/orders", icon: ShoppingCart, label: () => "Pedidos" }],
  },
  {
    // Cotización comercial genérica: llega con el documento comercial
    // unificado (Bloque B, paso 2). Hasta entonces no tiene pantallas.
    id: "quotes",
    category: "Obras y proyectos",
    kind: "specialized",
    label: "Cotizaciones",
    name: "Cotizaciones",
    description: "Cotizaciones comerciales con tu catálogo (próximamente).",
    pitch: "Cotizaciones para tus clientes.",
    icon: BadgeCheck,
    status: "PLANNED",
    priceUsd: 0,
    nav: [],
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
        href: "/projects",
        icon: Building2,
        label: (_terms, vertical) => (vertical === "construction" ? "Obras" : "Proyectos"),
      },
      { href: "/quotes", icon: FolderOpen, label: () => "Cotizaciones" },
      { href: "/catalog", icon: BookOpen, label: () => "Catálogo APU" },
    ],
  },
  {
    id: "pos",
    category: "Ventas y cobros",
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
    nav: [{ href: "/pos", icon: ShoppingCart, label: () => "Punto de venta" }],
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
    nav: [{ href: "/cobros", icon: Link2, label: () => "Cobros en línea" }],
  },
  {
    id: "einvoicing",
    category: "Ventas y cobros",
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
    nav: [{ href: "/factura-electronica", icon: FileCheck2, label: () => "Factura electrónica" }],
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
    nav: [{ href: "/cartera", icon: HandCoins, label: () => "Cartera" }],
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
    nav: [{ href: "/contabilidad", icon: BookOpenCheck, label: () => "Contabilidad" }],
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
    nav: [{ href: "/taxes", icon: Percent, label: () => "Impuestos y numeración" }],
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
      { href: "/sitio", icon: Globe, label: () => "Mi sitio web" },
      { href: "/pedidos-tienda", icon: PackageCheck, label: () => "Pedidos de la tienda" },
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
    nav: [{ href: "/google", icon: MapPin, label: () => "Ficha de Google" }],
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
    nav: [{ href: "/crecimiento", icon: Megaphone, label: () => "Campañas y reseñas" }],
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
