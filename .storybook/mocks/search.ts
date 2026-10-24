/** Búsqueda de la paleta en Storybook: resultados de muestra, sin servidor. */
export type SearchHit = {
  id: string;
  kind: "customer" | "product";
  title: string;
  subtitle: string;
  href: string;
};

const SAMPLE: SearchHit[] = [
  { id: "c1", kind: "customer", title: "María Fernanda Ríos", subtitle: "maria@ejemplo.co", href: "/crm/c1" },
  { id: "c2", kind: "customer", title: "Mariano Pardo", subtitle: "+57 300 000 0000", href: "/crm/c2" },
  { id: "p1", kind: "product", title: "Plan mensual", subtitle: "PLAN-01", href: "/inventory" },
];

export async function searchEntitiesAction(_slug: string, query: string) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const q = query.trim().toLowerCase();
  if (q === "error") return { ok: false as const };
  return { ok: true as const, hits: SAMPLE.filter((h) => h.title.toLowerCase().includes(q)) };
}
