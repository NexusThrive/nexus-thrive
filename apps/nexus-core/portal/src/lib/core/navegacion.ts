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

export const SECCIONES_MODULOS: Record<string, SeccionModulo[]> = {
  gym: [
    { href: "/plantillas/gym", label: "Dashboard" },
    { href: "/plantillas/gym/clientes", label: "Clientes" },
    { href: "/plantillas/gym/pagos", label: "Pagos" },
    { href: "/plantillas/gym/gastos", label: "Gastos" },
  ],
  "caja-menor": [
    { href: "/modulos/caja-menor", label: "Dashboard" },
    { href: "/modulos/caja-menor/movimientos", label: "Movimientos" },
    { href: "/modulos/caja-menor/categorias", label: "Categorías" },
  ],
};

export function getSeccionesModulo(slug: string): SeccionModulo[] {
  return SECCIONES_MODULOS[slug] ?? [];
}

/**
 * Base de ruta por slug, según el NIVEL del catálogo:
 * las PLANTILLAS viven bajo /plantillas/<slug>/ y los MÓDULOS sueltos
 * bajo /modulos/<slug>/ (orden mental: NEXUS → CAPA → PLANTILLA → MÓDULO → COMPONENTE).
 * Cuando exista Plantilla en el catálogo, este mapa sale de la DB.
 */
export const RUTA_POR_SLUG: Record<string, string> = {
  gym: "/plantillas/gym",
  "caja-menor": "/modulos/caja-menor",
};