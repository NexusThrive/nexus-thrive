/**
 * Primera visita al Inicio: AURI crece en su esquina y explica, paso a paso, qué hay en el panel. El recorrido se muestra una sola
 * vez por navegador y negocio (se puede repetir desde el chat). Puras: sin DOM, para probarlas.
 */
export type IntroStep = { text: string; joy?: boolean };

/** Lo que dice AURI, en orden. Frases cortas: cada una se escribe letra a letra y se lee en unos segundos. */
export function homeIntroSteps(name: string | null): IntroStep[] {
  return [
    { text: name ? `Hola ${name}! Este es tu panel de inicio.` : "Hola! Este es tu panel de inicio.", joy: true },
    { text: "Arriba ves el balance de tus últimos 30 días y, debajo, las acciones rápidas: nuevo cliente, registrar un pago o un gasto." },
    { text: "En el centro están tus apps. Cada una abre un área de tu negocio: clientes, ventas, inventario…" },
    { text: "A los lados, «Este mes» te muestra ventas y lo que te deben, y «Hoy» y «Atención» te avisan qué necesita tu mirada." },
    { text: "Si necesitas algo, escribe para buscar o pregúntame a mí. Aquí estaré.", joy: true },
  ];
}

const KEY = (slug: string) => `nx:auri-home-intro:v1:${slug}`;

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };

/** ¿Ya vio este recorrido en este navegador? Sin almacenamiento disponible, no se insiste (no se repite en cada visita). */
export function introSeen(store: Store | null, slug: string): boolean {
  try {
    return !store || store.getItem(KEY(slug)) === "1";
  } catch {
    return true;
  }
}

export function markIntroSeen(store: Store | null, slug: string): void {
  try {
    store?.setItem(KEY(slug), "1");
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

/** ¿La ruta es el Inicio del negocio? («/acme», «/acme/» o la raíz bajo un subdominio). */
export function isHomePath(pathname: string, slug: string): boolean {
  const clean = pathname.replace(/\/+$/, "");
  return clean === "" || clean === `/${slug}`;
}
