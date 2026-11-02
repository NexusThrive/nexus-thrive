/**
 * Viewports de referencia de Nexus (principio 08, decisiones del Design System §4).
 * Una sola fuente para Storybook (`.storybook/preview.tsx`) y Playwright (`e2e/responsive.spec.ts`).
 */
export type Viewport = {
  /** Clave estable (la usa Storybook en `globals.viewport`). */
  clave: string;
  nombre: string;
  ancho: number;
  alto: number;
  /** Pantalla táctil: se emula y se exigen objetivos táctiles. */
  tactil: boolean;
  /** `referencia`: viewport oficial · `regresion`: se mantiene para detectar regresiones · `limite`: justo en un umbral. */
  rol: "referencia" | "regresion" | "limite";
  proposito: string;
};

export const VIEWPORTS: readonly Viewport[] = [
  { clave: "nxMovilMinimo", nombre: "Móvil mínimo", ancho: 320, alto: 640, tactil: true, rol: "referencia", proposito: "Mínimo de reflow y detección de fallos" },
  { clave: "nxMovil", nombre: "Móvil", ancho: 360, alto: 740, tactil: true, rol: "referencia", proposito: "Referencia principal de diseño móvil" },
  { clave: "nxMovil375", nombre: "Móvil 375", ancho: 375, alto: 812, tactil: true, rol: "regresion", proposito: "Regresiones (antigua referencia)" },
  { clave: "nxMovilGrande", nombre: "Móvil grande", ancho: 412, alto: 915, tactil: true, rol: "referencia", proposito: "Referencia de pruebas automáticas" },
  { clave: "nxIpadMini", nombre: "iPad mini", ancho: 744, alto: 1133, tactil: true, rol: "referencia", proposito: "iPad mini vertical: el ancho que antes caía en el diseño de teléfono (DR-20)" },
  { clave: "nxTabletLimite", nombre: "Tablet 768", ancho: 768, alto: 1024, tactil: true, rol: "limite", proposito: "Umbral entre móvil y tablet" },
  { clave: "nxTabletVertical", nombre: "Tablet vertical", ancho: 820, alto: 1180, tactil: true, rol: "referencia", proposito: "Tablet vertical" },
  { clave: "nxTabletLimite1023", nombre: "Tablet 1023", ancho: 1023, alto: 768, tactil: true, rol: "limite", proposito: "Último ancho antes de la navegación expandida" },
  { clave: "nxTablet1024", nombre: "Tablet 1024", ancho: 1024, alto: 768, tactil: true, rol: "limite", proposito: "Primer ancho con la barra lateral expandida (DR-13)" },
  { clave: "nxTabletHorizontal", nombre: "Tablet horizontal", ancho: 1180, alto: 820, tactil: true, rol: "referencia", proposito: "Tablet horizontal" },
  { clave: "nxEscritorio", nombre: "Escritorio", ancho: 1280, alto: 800, tactil: false, rol: "referencia", proposito: "Escritorio" },
] as const;
