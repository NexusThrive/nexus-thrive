/**
 * Documento de cotización (función pura): la foto congelada de una revisión
 * del presupuesto de la obra que se le entrega al cliente.
 *
 * La cotización no calcula nada: copia los totales que el servidor ya
 * calculó en el presupuesto. Todo el dinero va en micro-unidades (texto),
 * igual que el presupuesto, para que el documento sea exacto y comparable
 * con la línea base.
 */
import type { ProjectBudgetData, ProjectHeaderData } from "./shared";

export type QuoteParty = {
  name: string | null;
  taxId: string | null;
  address: string | null;
  city: string | null;
  email?: string | null;
};

export type QuoteDocumentResource = {
  type: string;
  section: string | null;
  name: string;
  unit: string;
  performance: string;
  unitPrice: string;
  totalPrice: string;
};

export type QuoteDocumentItem = {
  code: string;
  description: string;
  unit: string;
  quantity: string;
  unitCost: string;
  total: string;
  /** Solo si el documento muestra el detalle APU. */
  resources?: QuoteDocumentResource[];
};

export type QuoteDocument = {
  version: number;
  code: string;
  issuedAt: string;
  validUntil: string | null;
  showApuDetail: boolean;
  budgetRevision: number;
  project: {
    code: string;
    name: string;
    siteAddress: string | null;
    siteCity: string | null;
    siteDepartment: string | null;
  };
  client: QuoteParty;
  issuer: QuoteParty;
  aiu: { adminPct: string; imprevPct: string; utilidadPct: string; ivaUtilidadPct: string };
  chapters: { order: number; name: string; subtotal: string; items: QuoteDocumentItem[] }[];
  totals: {
    direct: string;
    admin: string;
    imprev: string;
    utilidad: string;
    ivaUtilidad: string;
    grand: string;
  };
};

export function buildQuoteDocument(input: {
  version: number;
  code: string;
  issuedAt: string;
  validUntil: string | null;
  showApuDetail: boolean;
  project: { code: string; name: string };
  header: ProjectHeaderData | null;
  customerName: string;
  issuer: QuoteParty;
  budget: ProjectBudgetData;
}): QuoteDocument {
  const { budget, header } = input;
  return {
    version: input.version,
    code: input.code,
    issuedAt: input.issuedAt,
    validUntil: input.validUntil,
    showApuDetail: input.showApuDetail,
    budgetRevision: budget.revision,
    project: {
      code: input.project.code,
      name: input.project.name,
      siteAddress: header?.siteAddress ?? null,
      siteCity: header?.siteCity ?? null,
      siteDepartment: header?.siteDepartment ?? null,
    },
    client: {
      name: header?.clientTaxName?.trim() || input.customerName,
      taxId: header?.clientTaxId
        ? `${header.clientTaxId}${header.clientTaxDv ? `-${header.clientTaxDv}` : ""}`
        : null,
      address: header?.clientAddress ?? null,
      city: header?.clientCity ?? null,
      email: header?.clientBillingEmail ?? null,
    },
    issuer: input.issuer,
    aiu: {
      adminPct: budget.aiuAdminPct,
      imprevPct: budget.aiuImprevPct,
      utilidadPct: budget.aiuUtilidadPct,
      ivaUtilidadPct: budget.ivaUtilidadPct,
    },
    chapters: budget.chapters.map((chapter) => ({
      order: chapter.order,
      name: chapter.name,
      subtotal: chapter.subtotal,
      items: chapter.items.map((item) => ({
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitCost: item.unitCostDirect,
        total: item.totalCostDirect,
        ...(input.showApuDetail
          ? {
              resources: item.resources.map((resource) => ({
                type: resource.type,
                section: resource.section,
                name: resource.name,
                unit: resource.unit,
                performance: resource.performance,
                unitPrice: resource.unitPrice,
                totalPrice: resource.totalPrice,
              })),
            }
          : {}),
      })),
    })),
    totals: {
      direct: budget.directCostTotal,
      admin: budget.adminTotal,
      imprev: budget.imprevTotal,
      utilidad: budget.utilidadTotal,
      ivaUtilidad: budget.ivaUtilidadTotal,
      grand: budget.grandTotal,
    },
  };
}

/** Micro-unidades (texto) → decimal en pesos para columnas `Decimal`. */
export function microToDecimal(micro: string): string {
  const negative = micro.startsWith("-");
  const digits = (negative ? micro.slice(1) : micro).padStart(7, "0");
  const integer = digits.slice(0, -6).replace(/^0+(?=\d)/, "");
  const fraction = digits.slice(-6).replace(/0+$/, "");
  return `${negative ? "-" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
}

/** Fracción en micro (100_000 = 10 %) → porcentaje decimal ("10"). */
export function microFractionToPercent(micro: string): string {
  return microToDecimal((BigInt(micro) * BigInt(100)).toString());
}
