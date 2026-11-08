import type { FilterGroupDef, GroupingDef, RuleFieldDef, SearchDefs, SearchFieldDef } from "@/lib/foundation/list-search";

/**
 * Definiciones de la búsqueda avanzada de Clientes: qué filtros, agrupaciones, campos de búsqueda y reglas ofrece la sección.
 * Las filas ya vienen armadas (`customer-search-db.ts`); aquí solo se decide cómo se comparan. Puro: no toca la base.
 */
export type CustomerSearchRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentId: string;
  notes: string;
  city: string;
  source: string;
  ownerId: string;
  ownerName: string;
  tags: string[];
  /** Milisegundos desde 1970. */
  createdAt: number;
  active: boolean;
  kind: "PERSON" | "COMPANY";
  groupIds: string[];
  nextAppointment: number | null;
  lastVisit: number | null;
  owed: number;
};

export type CustomerGroupInfo = { id: string; name: string; icon: string };
export type OwnerInfo = { id: string; name: string };

export const CUSTOMER_SECTION = "customers";

const DAY = 86_400_000;
const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Registro manual",
  WEB: "Sitio web",
  STORE: "Tienda",
  REGISTRATION: "Autorregistro",
  IMPORT: "Importación",
  WHATSAPP: "WhatsApp",
};
const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "America/Bogota" });
const monthKeyFormatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "America/Bogota" });

const monthKey = (ms: number) => monthKeyFormatter.format(ms);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
export const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? source;

export function customerSearchDefs({
  groups,
  owners,
  rows,
  now = Date.now(),
}: {
  groups: CustomerGroupInfo[];
  owners: OwnerInfo[];
  /** Para ofrecer las ciudades, etiquetas y orígenes que de verdad existen en las reglas. */
  rows: CustomerSearchRow[];
  now?: number;
}): SearchDefs<CustomerSearchRow> {
  const fields: SearchFieldDef<CustomerSearchRow>[] = [
    { id: "nombre", label: "Nombre", defaultOn: true, get: (r) => r.name },
    { id: "correo", label: "Correo", defaultOn: true, get: (r) => r.email },
    { id: "telefono", label: "Teléfono", defaultOn: true, get: (r) => r.phone },
    { id: "documento", label: "Documento", defaultOn: true, get: (r) => r.documentId },
    { id: "notas", label: "Notas", defaultOn: false, get: (r) => r.notes },
  ];

  const thisMonth = monthKey(now);
  const filterGroups: FilterGroupDef<CustomerSearchRow>[] = [
    {
      id: "estado",
      exclusive: true,
      defaultOption: "activos",
      options: [
        { id: "activos", label: "Activos", test: (r) => r.active },
        { id: "archivados", label: "Archivados", test: (r) => !r.active },
      ],
    },
    {
      id: "agenda",
      options: [
        { id: "cita-proxima", label: "Con cita próxima", test: (r) => r.nextAppointment !== null },
        { id: "saldo", label: "Con saldo por cobrar", test: (r) => r.owed > 0 },
        { id: "sin-visitas-90", label: "Sin visitas en 90 días", test: (r) => r.lastVisit === null || now - r.lastVisit > 90 * DAY },
      ],
    },
    {
      id: "tipo",
      options: [
        { id: "personas", label: "Personas", test: (r) => r.kind === "PERSON" },
        { id: "empresas", label: "Empresas", test: (r) => r.kind === "COMPANY" },
      ],
    },
    { id: "registro", options: [{ id: "este-mes", label: "Registrados este mes", test: (r) => monthKey(r.createdAt) === thisMonth }] },
  ];

  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const groupIcon = new Map(groups.map((g) => [g.id, g.icon]));
  const groupings: GroupingDef<CustomerSearchRow>[] = [
    { id: "ciudad", label: "Ciudad", icon: "map-pin", system: true, keys: (r) => (r.city ? [{ key: r.city, label: r.city }] : []) },
    { id: "origen", label: "Origen", icon: "route", system: true, keys: (r) => (r.source ? [{ key: r.source, label: sourceLabel(r.source) }] : []) },
    { id: "etiqueta", label: "Etiqueta", icon: "tag", system: true, keys: (r) => r.tags.map((tag) => ({ key: tag, label: tag })) },
    { id: "responsable", label: "Responsable", icon: "user-round", system: true, keys: (r) => (r.ownerId ? [{ key: r.ownerId, label: r.ownerName || "Sin nombre" }] : []) },
    { id: "mes", label: "Mes de registro", icon: "calendar", system: true, keys: (r) => [{ key: monthKey(r.createdAt), label: capitalize(monthFormatter.format(r.createdAt)) }] },
    { id: "tipo", label: "Tipo", icon: "building-2", system: true, quick: false, keys: (r) => [{ key: r.kind, label: r.kind === "COMPANY" ? "Empresas" : "Personas" }] },
    {
      id: "grupo",
      label: "Mis grupos",
      icon: "users",
      system: false,
      quick: false,
      keys: (r) => r.groupIds.flatMap((id) => (groupName.has(id) ? [{ key: id, label: groupName.get(id)!, icon: groupIcon.get(id) }] : [])),
    },
  ];

  const distinct = (pick: (r: CustomerSearchRow) => string[]) =>
    [...new Set(rows.flatMap(pick).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")).slice(0, 200).map((value) => ({ value, label: value }));
  const ruleFields: RuleFieldDef<CustomerSearchRow>[] = [
    { id: "nombre", label: "Nombre", get: (r) => [r.name] },
    { id: "correo", label: "Correo", get: (r) => [r.email] },
    { id: "telefono", label: "Teléfono", get: (r) => [r.phone] },
    { id: "documento", label: "Documento", get: (r) => [r.documentId] },
    { id: "ciudad", label: "Ciudad", get: (r) => [r.city], values: distinct((r) => [r.city]) },
    { id: "origen", label: "Origen", get: (r) => [r.source ? sourceLabel(r.source) : ""], values: [...new Set(rows.map((r) => r.source).filter(Boolean))].map((s) => ({ value: sourceLabel(s), label: sourceLabel(s) })) },
    { id: "etiqueta", label: "Etiqueta", get: (r) => r.tags, values: distinct((r) => r.tags) },
    { id: "responsable", label: "Responsable", get: (r) => [r.ownerName], values: owners.map((o) => ({ value: o.name, label: o.name })) },
    { id: "grupo", label: "Grupo", get: (r) => r.groupIds.flatMap((id) => (groupName.has(id) ? [groupName.get(id)!] : [])), values: groups.map((g) => ({ value: g.name, label: g.name })) },
    { id: "tipo", label: "Tipo", get: (r) => [r.kind === "COMPANY" ? "Empresa" : "Persona"], values: [{ value: "Persona", label: "Persona" }, { value: "Empresa", label: "Empresa" }] },
    { id: "mes", label: "Mes de registro", get: (r) => [capitalize(monthFormatter.format(r.createdAt))], values: distinct((r) => [capitalize(monthFormatter.format(r.createdAt))]) },
  ];

  return { fields, filterGroups, groupings, ruleFields };
}
