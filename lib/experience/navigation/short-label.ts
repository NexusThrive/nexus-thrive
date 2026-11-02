/**
 * Etiqueta abreviada del riel de tablet (768–1023 px, DR-14). El nombre completo sigue siendo el nombre accesible del
 * enlace; esto es solo lo que se ve bajo el icono. Regla (glosario, `06` §4): derivada del nombre completo, ≤ 12 caracteres,
 * sin inventar términos. Los nombres largos del glosario aprobado tienen su forma; el resto usa su primera palabra.
 */
export const SHORT_LABEL_MAX = 12;

const SHORT_LABELS: Readonly<Record<string, string>> = {
  "Punto de venta": "Punto venta",
  "Factura electrónica": "Fact. elec.",
  "Impuestos y numeración": "Impuestos",
  "Cobros en línea": "Cobros web",
  "Campañas y reseñas": "Campañas",
  "Control de acceso": "Acceso",
  "Pedidos de la tienda": "Tienda",
  "Importar y exportar": "Datos",
  Integraciones: "Integrac.",
  "Ficha de Google": "Google",
  "Mi sitio web": "Sitio web",
  "Catálogo APU": "Cat. APU",
};

export function shortLabel(label: string): string {
  if (label.length <= SHORT_LABEL_MAX) return label;
  const known = SHORT_LABELS[label];
  if (known) return known;
  const first = label.split(/\s+/)[0] ?? label;
  return first.length <= SHORT_LABEL_MAX ? first : `${first.slice(0, SHORT_LABEL_MAX - 1)}.`;
}
