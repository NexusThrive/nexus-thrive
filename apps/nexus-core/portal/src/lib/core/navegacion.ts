/**
 * NÚCLEO — definición ÚNICA de las secciones de cada módulo.
 *
 * La NAVBAR las muestra cuando estás dentro de un módulo; el layout del
 * módulo deja de tener subnav propio (decisión 2026-09-16): un solo
 * lugar de verdad para "a dónde puedo ir dentro de este negocio".
 */
export interface SeccionModulo {
  href: string;
  label: string;
}

/** Secciones de la PLANTILLA Gym — compartidas por sus módulos. */
const SECCIONES_GYM: SeccionModulo[] = [
  { href: "/plantillas/gym", label: "Dashboard" },
  { href: "/plantillas/gym/clientes", label: "Clientes" },
  { href: "/plantillas/gym/pagos", label: "Pagos" },
  { href: "/plantillas/gym/gastos", label: "Gastos" },
];

export const SECCIONES_MODULOS: Record<string, SeccionModulo[]> = {
  // Cada módulo de la plantilla gym comparte las secciones de la plantilla.
  gym: SECCIONES_GYM,
  clientes: SECCIONES_GYM,
  planes: SECCIONES_GYM,
  pagos: SECCIONES_GYM,
  gastos: SECCIONES_GYM,
  "caja-menor": [
    { href: "/modulos/caja-menor", label: "Dashboard" },
    { href: "/modulos/caja-menor/movimientos", label: "Movimientos" },
    { href: "/modulos/caja-menor/categorias", label: "Categorías" },
  ],
};

export function getSeccionesModulo(slug: string): SeccionModulo[] {
  return SECCIONES_MODULOS[slug] ?? [];
}