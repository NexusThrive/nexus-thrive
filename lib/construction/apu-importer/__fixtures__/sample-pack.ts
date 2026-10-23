import type { MasterPackParse } from "../master-pack";

/** Pack APU mínimo con un APU, un auxiliar, una línea porcentual y una foto. */
export function samplePack(overrides: Partial<MasterPackParse> = {}): MasterPackParse {
  const image = { sha256: "a".repeat(64), mimeType: "image/png", data: new Uint8Array([1, 2, 3]) };
  return {
    chapters: [{ code: "1", parentCode: null, name: "PRELIMINARES", order: 0 }],
    activityRows: [
      { code: "1.01", chapterCode: "1", description: "Acarreo", unit: "m3", unitPrice: "15171" },
    ],
    apus: [
      {
        code: "1.01",
        name: "Acarreo",
        unit: "m3",
        totalCost: "17105.44",
        extraTotals: [],
        lines: [
          { order: 0, section: "MATERIALES:", description: "CEMENTO GRIS", unit: "Kg", quantity: "2", unitPrice: "500", partial: "1000" },
          { order: 1, section: "MANO de OBRA:", description: "CUADRILLA 2 Ay", unit: "Día", quantity: "0.0665", unitPrice: "220170", partial: "14641.31" },
          { order: 2, section: "EQUIPO y HERRAMIENTAS:", description: "HERRAMIENTA MENOR %", unit: "%MO", quantity: "10", unitPrice: "14641.31", partial: "1464.13" },
        ],
      },
    ],
    auxiliaries: [
      {
        code: null,
        name: "CUADRILLA 2 Ay",
        unit: "Día",
        totalCost: "220170",
        extraTotals: [{ label: "TOTAL % P", value: "0.88" }],
        lines: [
          { order: 0, section: "MANO de OBRA:", description: "AYUDANTE", unit: "Día", quantity: "2", unitPrice: "110085", partial: "220170" },
        ],
      },
    ],
    materials: [
      { row: 7, description: "CEMENTO GRIS", unit: "Kg", unitPrice: "500", imageSha256: image.sha256 },
    ],
    images: new Map([[image.sha256, image]]),
    unassignedImages: 0,
    warnings: [],
    ...overrides,
  };
}
