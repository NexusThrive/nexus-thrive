import type { FilterGroupDef, RuleFieldDef, SearchDefs, SearchFieldDef } from "@/lib/foundation/list-search";
import type { PipelineCard } from "./pipeline-db";

/**
 * Definiciones de la búsqueda avanzada del pipeline de oportunidades (CRM). Mismo motor que Clientes
 * (`lib/foundation/list-search.ts`); aquí solo se dice qué filtros, campos y reglas tiene esta sección.
 * El tablero se organiza por etapas, así que esta sección no ofrece «Agrupar por».
 */
export const CRM_SECTION = "crm";

export function crmSearchDefs({
  me,
  owners,
  stages,
  tags,
  now = Date.now(),
}: {
  /** `User.id` de quien mira: define «Mis oportunidades». */
  me: string;
  owners: { id: string; name: string }[];
  stages: { id: string; name: string }[];
  tags: string[];
  now?: number;
}): SearchDefs<PipelineCard> {
  const stageName = new Map(stages.map((s) => [s.id, s.name]));
  const month = new Date(now - 5 * 3_600_000).toISOString().slice(0, 7); // mes en hora de Bogotá (UTC-5)

  const fields: SearchFieldDef<PipelineCard>[] = [
    { id: "nombre", label: "Nombre", defaultOn: true, get: (c) => c.name },
    { id: "cliente", label: "Cliente", defaultOn: true, get: (c) => c.customer?.name ?? "" },
    { id: "etiqueta", label: "Etiqueta", defaultOn: true, get: (c) => c.tags.join(" ") },
    { id: "responsable", label: "Responsable", defaultOn: true, get: (c) => c.owner?.name ?? "" },
  ];

  const filterGroups: FilterGroupDef<PipelineCard>[] = [
    {
      id: "alcance",
      exclusive: true,
      defaultOption: "mis-oportunidades",
      options: [
        { id: "mis-oportunidades", label: "Mis oportunidades", test: (c) => c.owner?.id === me },
        { id: "sin-responsable", label: "Sin responsable", test: (c) => c.owner === null },
        { id: "todas", label: "Todas", test: () => true },
      ],
    },
    {
      id: "estado",
      options: [
        { id: "actividad-vencida", label: "Con actividad vencida", test: (c) => c.next !== null && Date.parse(c.next.dueAt) < now },
        { id: "ganadas", label: "Ganadas", test: (c) => c.won },
      ],
    },
    { id: "cierre", options: [{ id: "cierre-este-mes", label: "Cierre este mes", test: (c) => c.expectedClose?.startsWith(month) ?? false }] },
  ];

  const ruleFields: RuleFieldDef<PipelineCard>[] = [
    { id: "nombre", label: "Nombre", get: (c) => [c.name] },
    { id: "cliente", label: "Cliente", get: (c) => [c.customer?.name ?? ""] },
    { id: "etiqueta", label: "Etiqueta", get: (c) => c.tags, values: tags.map((t) => ({ value: t, label: t })) },
    { id: "responsable", label: "Responsable", get: (c) => [c.owner?.name ?? ""], values: owners.map((o) => ({ value: o.name, label: o.name })) },
    { id: "etapa", label: "Etapa", get: (c) => [stageName.get(c.stageId) ?? ""], values: stages.map((s) => ({ value: s.name, label: s.name })) },
    { id: "prioridad", label: "Prioridad (0 a 3)", kind: "number", get: (c) => [String(c.priority)] },
    { id: "valor", label: "Valor esperado", kind: "number", get: (c) => [String(c.value)] },
    { id: "cierre", label: "Cierre previsto", kind: "date", get: (c) => [c.expectedClose ?? ""] },
  ];

  return { fields, filterGroups, groupings: [], ruleFields };
}
