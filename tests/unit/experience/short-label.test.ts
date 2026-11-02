import { describe, expect, test } from "vitest";
import { SHORT_LABEL_MAX, shortLabel } from "@/lib/experience/navigation/short-label";
import { CAPABILITIES } from "@/lib/core/capabilities/registry";
import { getVerticalTerms } from "@/lib/core/sectors/terms";
import { VERTICALS } from "@/lib/core/sectors/verticals";

describe("etiqueta abreviada del riel", () => {
  test("los nombres cortos se dejan igual", () => {
    expect(shortLabel("Inicio")).toBe("Inicio");
    expect(shortLabel("Contabilidad")).toBe("Contabilidad");
  });

  test("los nombres largos del glosario tienen su forma", () => {
    expect(shortLabel("Punto de venta")).toBe("Punto venta");
    expect(shortLabel("Factura electrónica")).toBe("Fact. elec.");
    expect(shortLabel("Impuestos y numeración")).toBe("Impuestos");
    expect(shortLabel("Pedidos de la tienda")).toBe("Tienda");
  });

  test("lo desconocido usa su primera palabra", () => {
    expect(shortLabel("Visitas guiadas")).toBe("Visitas");
    expect(shortLabel("Compras de insumos")).toBe("Compras");
  });

  test("ninguna etiqueta de la navegación supera el máximo, en ningún rubro", () => {
    for (const vertical of VERTICALS) {
      const terms = getVerticalTerms(vertical);
      for (const c of CAPABILITIES) {
        for (const nav of c.nav) {
          const short = shortLabel(nav.label(terms));
          expect(short.length, `${vertical} · ${c.id} · ${short}`).toBeLessThanOrEqual(SHORT_LABEL_MAX);
        }
      }
    }
  });
});
