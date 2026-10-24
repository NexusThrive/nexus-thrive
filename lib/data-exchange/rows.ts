import { mapColumns, normalizeHeader, parseBool, parseNumber, type Table } from "./table";

/**
 * Validación fila por fila de lo que se importa: clientes y catálogo. Pura.
 * Cada fila trae su número en el archivo (la fila 1 son los encabezados), así
 * el reporte de errores dice exactamente dónde mirar.
 */
export type RowError = { line: number; message: string };
export type ParsedRows<T> = { rows: { line: number; data: T }[]; errors: RowError[]; missingColumns: string[] };

const UNITS = ["EA", "KGM", "GRM", "LTR", "MTR", "MTK", "HUR", "DAY", "MON", "SET", "BX"] as const;
const UNIT_WORDS: Record<string, (typeof UNITS)[number]> = {
  und: "EA", unidad: "EA", unidades: "EA", u: "EA", kg: "KGM", kilo: "KGM", kilos: "KGM", g: "GRM", gramo: "GRM", gramos: "GRM",
  l: "LTR", lt: "LTR", litro: "LTR", litros: "LTR", m: "MTR", metro: "MTR", metros: "MTR", m2: "MTK", hora: "HUR", horas: "HUR",
  dia: "DAY", dias: "DAY", mes: "MON", meses: "MON", juego: "SET", set: "SET", caja: "BX", cajas: "BX",
};
const TAX = ["GRAVADO", "EXCLUIDO", "EXENTO"] as const;
const KINDS = { producto: "PRODUCT", product: "PRODUCT", servicio: "SERVICE", service: "SERVICE" } as const;

export type ProductRow = {
  name: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  description: string | null;
  kind: "PRODUCT" | "SERVICE";
  price: number;
  cost: number | null;
  trackStock: boolean;
  minStock: number;
  unitCode: (typeof UNITS)[number];
  taxCategory: (typeof TAX)[number];
  taxRatePct: number;
  active: boolean;
};

export const PRODUCT_HEADERS = ["Nombre", "SKU", "Tipo", "Categoría", "Marca", "Descripción", "Precio", "Costo", "Controla existencias", "Stock mínimo", "Unidad", "Impuesto", "IVA %", "Activo"] as const;
export const PRODUCT_EXAMPLE = ["Proteína whey 2 lb", "WHEY-2LB", "Producto", "Suplementos", "NexusFit", "Sabor vainilla", "129900", "78000", "Sí", "5", "Unidad", "Gravado", "19", "Sí"] as const;

const PRODUCT_ALIASES = {
  name: ["nombre", "producto", "articulo", "item", "name", "descripcion del producto"],
  sku: ["sku", "codigo", "referencia", "ref", "code"],
  kind: ["tipo", "kind", "clase"],
  category: ["categoria", "category", "linea", "grupo"],
  brand: ["marca", "brand"],
  description: ["descripcion", "description", "detalle"],
  price: ["precio", "precio venta", "precio de venta", "valor", "price", "pvp"],
  cost: ["costo", "costo unitario", "cost", "precio compra", "precio de compra"],
  trackStock: ["controla existencias", "controla stock", "inventario", "maneja inventario", "track stock"],
  minStock: ["stock minimo", "minimo", "existencia minima", "min stock"],
  unit: ["unidad", "unidad de medida", "um", "unit"],
  tax: ["impuesto", "tipo de impuesto", "categoria de impuesto", "tax"],
  taxRate: ["iva", "iva %", "tarifa iva", "tarifa", "porcentaje iva", "tax rate"],
  active: ["activo", "active", "estado"],
} as const;

const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

function intOrError(raw: string, label: string, errs: string[]): number | null {
  if (!raw) return null;
  const n = parseNumber(raw);
  if (n === null || n < 0 || !Number.isInteger(n)) {
    errs.push(`${label} debe ser un número entero (≥ 0).`);
    return null;
  }
  return n;
}

export function parseProducts(table: Table): ParsedRows<ProductRow> {
  const col = mapColumns(table.headers, PRODUCT_ALIASES);
  const missingColumns = [col.name < 0 ? "Nombre" : "", col.price < 0 ? "Precio" : ""].filter(Boolean);
  const out: ParsedRows<ProductRow> = { rows: [], errors: [], missingColumns };
  if (missingColumns.length) return out;
  const seen = new Map<string, number>();
  table.rows.forEach((r, i) => {
    const line = i + 2;
    const errs: string[] = [];
    const name = cell(r, col.name).slice(0, 160);
    if (name.length < 2) errs.push("Falta el nombre (mínimo 2 letras).");
    const priceRaw = cell(r, col.price);
    const price = parseNumber(priceRaw);
    if (price === null || price < 0 || price > 1e11) errs.push(priceRaw ? `Precio inválido: «${priceRaw}».` : "Falta el precio.");
    const costRaw = cell(r, col.cost);
    const cost = costRaw ? parseNumber(costRaw) : null;
    if (costRaw && (cost === null || cost < 0 || cost > 1e11)) errs.push(`Costo inválido: «${costRaw}».`);

    const kindRaw = normalizeHeader(cell(r, col.kind));
    const kind = kindRaw ? KINDS[kindRaw as keyof typeof KINDS] : "PRODUCT";
    if (!kind) errs.push(`Tipo no reconocido: «${cell(r, col.kind)}» (usa Producto o Servicio).`);

    const unitRaw = cell(r, col.unit);
    const unitKey = normalizeHeader(unitRaw);
    const unitCode = !unitRaw ? "EA" : (UNITS.find((u) => u.toLowerCase() === unitKey) ?? UNIT_WORDS[unitKey]);
    if (!unitCode) errs.push(`Unidad no reconocida: «${unitRaw}».`);

    const taxRaw = cell(r, col.tax);
    const taxCategory = !taxRaw ? "GRAVADO" : TAX.find((t) => t.toLowerCase() === normalizeHeader(taxRaw));
    if (!taxCategory) errs.push(`Impuesto no reconocido: «${taxRaw}» (Gravado, Excluido o Exento).`);
    const rateRaw = cell(r, col.taxRate);
    const taxRate = rateRaw ? parseNumber(rateRaw.replace("%", "")) : 0;
    if (taxRate === null || taxRate < 0 || taxRate > 100) errs.push(`IVA % inválido: «${rateRaw}».`);

    const trackRaw = cell(r, col.trackStock);
    const track = trackRaw ? parseBool(trackRaw) : kind === "SERVICE" ? false : true;
    if (track === null) errs.push(`«Controla existencias» debe ser Sí o No.`);
    const activeRaw = cell(r, col.active);
    const active = activeRaw ? parseBool(activeRaw) : true;
    if (active === null) errs.push(`«Activo» debe ser Sí o No.`);
    const minStock = intOrError(cell(r, col.minStock), "El stock mínimo", errs);

    const sku = cell(r, col.sku).slice(0, 60) || null;
    if (sku) {
      const key = sku.toLowerCase();
      const first = seen.get(key);
      if (first) errs.push(`El SKU «${sku}» está repetido (ya aparece en la fila ${first}).`);
      else seen.set(key, line);
    }

    if (errs.length || price === null || !kind || !unitCode || !taxCategory || taxRate === null || track === null || active === null) {
      out.errors.push({ line, message: errs.join(" ") });
      return;
    }
    out.rows.push({
      line,
      data: {
        name,
        sku,
        category: cell(r, col.category).slice(0, 80) || null,
        brand: cell(r, col.brand).slice(0, 80) || null,
        description: cell(r, col.description).slice(0, 500) || null,
        kind,
        price,
        cost,
        trackStock: kind === "SERVICE" ? false : track,
        minStock: minStock ?? 0,
        unitCode,
        taxCategory,
        taxRatePct: taxCategory === "GRAVADO" ? taxRate : 0,
        active,
      },
    });
  });
  return out;
}

/* ------------------------------------------------------------------ */

export type CustomerRow = {
  name: string;
  email: string | null;
  phone: string | null;
  documentId: string | null;
  city: string | null;
  tags: string[];
};

export const CUSTOMER_HEADERS = ["Nombre", "Documento", "Correo", "Teléfono", "Ciudad", "Etiquetas"] as const;
export const CUSTOMER_EXAMPLE = ["María Pérez", "1020304050", "maria@correo.com", "3001234567", "Bogotá", "VIP; referido"] as const;

const CUSTOMER_ALIASES = {
  name: ["nombre", "nombre completo", "cliente", "razon social", "name"],
  documentId: ["documento", "cedula", "nit", "identificacion", "numero de documento", "cc", "document"],
  email: ["correo", "email", "e mail", "correo electronico"],
  phone: ["telefono", "celular", "movil", "phone", "whatsapp"],
  city: ["ciudad", "city", "municipio"],
  tags: ["etiquetas", "tags", "grupos"],
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Solo letras y números en mayúscula: «1.020.304-050» → «1020304050». */
export const documentKey = (raw: string | null | undefined): string | null => (raw ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || null;

export function parseCustomers(table: Table): ParsedRows<CustomerRow> {
  const col = mapColumns(table.headers, CUSTOMER_ALIASES);
  const missingColumns = col.name < 0 ? ["Nombre"] : [];
  const out: ParsedRows<CustomerRow> = { rows: [], errors: [], missingColumns };
  if (missingColumns.length) return out;
  const seenDoc = new Map<string, number>();
  const seenEmail = new Map<string, number>();
  table.rows.forEach((r, i) => {
    const line = i + 2;
    const errs: string[] = [];
    const name = cell(r, col.name).slice(0, 160);
    if (name.length < 2) errs.push("Falta el nombre (mínimo 2 letras).");
    const emailRaw = cell(r, col.email).toLowerCase();
    if (emailRaw && !EMAIL.test(emailRaw)) errs.push(`Correo inválido: «${emailRaw}».`);
    const phoneRaw = cell(r, col.phone);
    if (phoneRaw && phoneRaw.replace(/\D/g, "").length < 7) errs.push(`Teléfono inválido: «${phoneRaw}».`);
    const doc = documentKey(cell(r, col.documentId));
    if (doc) {
      const first = seenDoc.get(doc);
      if (first) errs.push(`El documento ${doc} está repetido (ya aparece en la fila ${first}).`);
      else seenDoc.set(doc, line);
    } else if (emailRaw && EMAIL.test(emailRaw)) {
      const first = seenEmail.get(emailRaw);
      if (first) errs.push(`El correo ${emailRaw} está repetido (ya aparece en la fila ${first}).`);
      else seenEmail.set(emailRaw, line);
    }
    if (errs.length) {
      out.errors.push({ line, message: errs.join(" ") });
      return;
    }
    out.rows.push({
      line,
      data: {
        name,
        email: emailRaw || null,
        phone: phoneRaw.slice(0, 40) || null,
        documentId: doc,
        city: cell(r, col.city).slice(0, 80) || null,
        tags: [...new Set(cell(r, col.tags).split(/[;|,]/).map((t) => t.trim().slice(0, 40)).filter(Boolean))].slice(0, 20),
      },
    });
  });
  return out;
}
