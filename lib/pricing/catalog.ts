/**
 * Catálogo de precios de NEXUS THRIVE (USD). Datos editables en un solo
 * lugar; la lógica vive en `calc.ts` y la interfaz en components/…/pricing.
 * Los iconos son claves: la UI las traduce a lucide (los datos no importan
 * componentes de React).
 */

export const PRICING = {
  essentialClients: 10,
  elite: { base: 29, includedClients: 50, perClient: 0.2, max: 150, perClientOver: 0.12 },
  /** Más de 150 clientes con 4 módulos o menos en Elite = Pre Signature. */
  preSignatureMaxModules: 4,
  signature: { base: 79, moduleFactor: 0.6 },
  annualDiscount: 0.2,
  minClients: 1,
  maxClients: 5000,
} as const;

export type TierKey = "essential" | "elite" | "signature";
/** El nivel que realmente aplica (Elite puede convertirse en Pre Signature). */
export type EffectiveTier = TierKey | "pre";
export type Billing = "monthly" | "annual";

export type ModuleDef = {
  key: string;
  icon: string;
  name: string;
  description: string;
  /** Precio mensual base en USD (antes del factor del rubro). */
  price: number;
};

export type IndustryKey = "gym" | "salon" | "clinic" | "restaurant" | "store" | "construction" | "services";

export type Industry = {
  name: string;
  /** Multiplicador de precio del rubro. */
  factor: number;
  modules: ModuleDef[];
};

/** Incluidos en todos los niveles, sin costo. */
export const BASE_MODULES: Omit<ModuleDef, "price">[] = [
  { key: "clientes", icon: "user", name: "Clientes", description: "Fichas, historial y etiquetas" },
  { key: "agenda", icon: "calendar", name: "Agenda", description: "Citas, turnos y recordatorio manual" },
  { key: "finanzas", icon: "coins", name: "Finanzas básicas", description: "Ingresos, gastos y saldo del día" },
  { key: "panel", icon: "home", name: "Panel de inicio", description: "Resumen diario del negocio" },
];

export const GENERAL_MODULES: ModuleDef[] = [
  { key: "whatsapp", icon: "message", name: "WhatsApp Business", description: "Bandeja, plantillas y respuestas rápidas", price: 9 },
  { key: "factura", icon: "file", name: "Facturación electrónica", description: "Facturas válidas ante la DIAN", price: 8 },
  { key: "inventario", icon: "box", name: "Inventario", description: "Stock, alertas de mínimo y movimientos", price: 6 },
  { key: "caja", icon: "cash", name: "Caja menor", description: "Arqueos, vales y cierres por turno", price: 4 },
  { key: "reportes", icon: "chart", name: "Reportes avanzados", description: "Tendencias, cohortes y exportación", price: 7 },
  { key: "equipo", icon: "team", name: "Equipo y permisos", description: "Usuarios, roles y comisiones", price: 6 },
  { key: "recordatorios", icon: "bell", name: "Recordatorios automáticos", description: "Mensajes antes de cada cita o pago", price: 5 },
  { key: "pagos", icon: "card", name: "Pagos en línea", description: "Links de pago y cobros recurrentes", price: 6 },
];

export const INDUSTRIES: Record<IndustryKey, Industry> = {
  gym: {
    name: "Gimnasio",
    factor: 1,
    modules: [
      { key: "membresias", icon: "key", name: "Membresías y accesos", description: "Planes, congelamientos y control de entrada", price: 8 },
      { key: "rutinas", icon: "dumbbell", name: "Rutinas y progreso", description: "Plan de entrenamiento por cliente", price: 6 },
      { key: "clases", icon: "grid", name: "Clases grupales", description: "Cupos, reservas y lista de espera", price: 6 },
    ],
  },
  salon: {
    name: "Salón de belleza",
    factor: 0.9,
    modules: [
      { key: "comisiones", icon: "scissors", name: "Comisiones por profesional", description: "Liquidación automática por servicio", price: 6 },
      { key: "paquetes", icon: "package", name: "Paquetes y bonos", description: "Sesiones prepagadas y vencimientos", price: 5 },
      { key: "galeria", icon: "image", name: "Galería de trabajos", description: "Antes y después por cliente", price: 4 },
    ],
  },
  clinic: {
    name: "Consultorio",
    factor: 1.25,
    modules: [
      { key: "historia", icon: "heart", name: "Historia clínica", description: "Evoluciones, antecedentes y adjuntos", price: 12 },
      { key: "consent", icon: "pen", name: "Consentimientos firmados", description: "Firma digital desde el celular", price: 6 },
      { key: "recetas", icon: "prescription", name: "Recetas y órdenes", description: "Fórmulas imprimibles y en PDF", price: 6 },
    ],
  },
  restaurant: {
    name: "Restaurante",
    factor: 1.1,
    modules: [
      { key: "mesas", icon: "table", name: "Mesas y comandas", description: "Pedidos por mesa directo a cocina", price: 10 },
      { key: "menu", icon: "qr", name: "Menú digital QR", description: "Carta con precios siempre al día", price: 5 },
      { key: "domicilios", icon: "bike", name: "Domicilios", description: "Pedidos, rutas y estado de entrega", price: 7 },
    ],
  },
  store: {
    name: "Tienda",
    factor: 1,
    modules: [
      { key: "pos", icon: "pos", name: "Punto de venta", description: "Venta rápida con lector de códigos", price: 9 },
      { key: "catalogo", icon: "globe", name: "Catálogo en línea", description: "Tu tienda con pedido por WhatsApp", price: 7 },
      { key: "proveedores", icon: "truck", name: "Proveedores y compras", description: "Órdenes de compra y cuentas por pagar", price: 6 },
    ],
  },
  construction: {
    name: "Construcción",
    factor: 1.35,
    modules: [
      { key: "apu", icon: "crane", name: "APU y Biblioteca Maestra", description: "Análisis de precios unitarios por insumo", price: 14 },
      { key: "proyectos", icon: "layers", name: "Proyectos y fases", description: "Presupuesto, cronograma y avance", price: 10 },
      { key: "control", icon: "helmet", name: "Control de obra", description: "Bitácora, cuadrillas y consumos", price: 8 },
    ],
  },
  services: {
    name: "Servicios profesionales",
    factor: 0.95,
    modules: [
      { key: "proyectosp", icon: "briefcase", name: "Proyectos y entregables", description: "Tareas, hitos y aprobación del cliente", price: 8 },
      { key: "horas", icon: "clock", name: "Horas facturables", description: "Registro de tiempo por cliente", price: 6 },
      { key: "contratos", icon: "signature", name: "Contratos y propuestas", description: "Plantillas con firma digital", price: 6 },
    ],
  },
};

export const TIERS: Record<EffectiveTier, { name: string; description: string; level: number }> = {
  essential: { name: "Essential", description: "Prueba sin costo para conocer NEXUS con datos de ejemplo.", level: 1 },
  elite: { name: "Elite", description: "Arma tu sistema con los módulos que tu negocio necesita.", level: 2 },
  pre: { name: "Pre Signature", description: "Una base de clientes grande con un sistema liviano.", level: 2 },
  signature: { name: "Signature", description: "Todo NEXUS, sin límite de clientes y con acompañamiento.", level: 3 },
};
