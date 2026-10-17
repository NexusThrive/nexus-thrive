import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { QuoteDocument } from "@/lib/construction/quote-document";
import QuoteDocumentSheet from "./quote-document-sheet";

/** Dinero y cantidades en micro-unidades (×1.000.000), como en `Quote.snapshot`. */
const M = (n: number) => String(Math.round(n * 1_000_000));

const document: QuoteDocument = {
  version: 2,
  code: "COT-2026-031",
  issuedAt: "2026-10-14T15:00:00.000Z",
  validUntil: "2026-11-13T15:00:00.000Z",
  showApuDetail: true,
  budgetRevision: 7,
  project: {
    code: "OB-2026-014",
    name: "Torre Calle 80",
    siteAddress: "Cl. 80 # 24-15",
    siteCity: "Bogotá",
    siteDepartment: "Cundinamarca",
  },
  client: { name: "Inversiones Sabana S.A.S.", taxId: "901.234.567-8", address: "Cra. 7 # 71-21", city: "Bogotá", email: "compras@sabana.co" },
  issuer: { name: "Constructora Andina S.A.S.", taxId: "900.111.222-3", address: "Av. El Dorado # 68-51", city: "Bogotá", email: "obras@andina.co" },
  aiu: { adminPct: M(10), imprevPct: M(5), utilidadPct: M(5), ivaUtilidadPct: M(19) },
  chapters: [
    {
      order: 1,
      name: "Preliminares",
      subtotal: M(4_850_000),
      items: [
        { code: "1.01", description: "Localización y replanteo", unit: "m²", quantity: M(850), unitCost: M(3_500), total: M(2_975_000) },
        { code: "1.02", description: "Cerramiento provisional en lona", unit: "ml", quantity: M(125), unitCost: M(15_000), total: M(1_875_000) },
      ],
    },
    {
      order: 2,
      name: "Cimentación",
      subtotal: M(38_640_000),
      items: [
        {
          code: "2.01",
          description: "Concreto 3000 psi para zapatas",
          unit: "m³",
          quantity: M(56),
          unitCost: M(690_000),
          total: M(38_640_000),
          resources: [
            { type: "MATERIAL", section: "Materiales", name: "Concreto premezclado 3000 psi", unit: "m³", performance: M(1.05), unitPrice: M(520_000), totalPrice: M(546_000) },
            { type: "MANO_DE_OBRA", section: "Mano de obra", name: "Cuadrilla de concreto", unit: "día", performance: M(0.25), unitPrice: M(480_000), totalPrice: M(120_000) },
            { type: "EQUIPO", section: "Equipo", name: "Vibrador de concreto", unit: "día", performance: M(0.25), unitPrice: M(96_000), totalPrice: M(24_000) },
          ],
        },
      ],
    },
  ],
  totals: {
    direct: M(43_490_000),
    admin: M(4_349_000),
    imprev: M(2_174_500),
    utilidad: M(2_174_500),
    ivaUtilidad: M(413_155),
    grand: M(52_601_155),
  },
};

const meta = {
  title: "Organismos/QuoteDocumentSheet",
  component: QuoteDocumentSheet,
  args: { document, quoteLabel: "Cotización" },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Documento A4 de una versión de cotización: muestra la foto congelada al emitirla (`Quote.snapshot`) y nunca recalcula. Se imprime desde `/quotes/[id]/print`.",
      },
    },
  },
  decorators: [(Story) => <div className="bg-surface-muted p-6"><Story /></div>],
} satisfies Meta<typeof QuoteDocumentSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithApuDetail: Story = {};

export const WithoutApuDetail: Story = {
  args: {
    document: {
      ...document,
      showApuDetail: false,
      chapters: document.chapters.map((c) => ({ ...c, items: c.items.map(({ resources: _r, ...item }) => item) })),
    },
  },
};
