import type { ModuleValue } from "@/lib/admin/catalogs";
import type { CapabilityCategory } from "@/lib/capabilities/registry";
import type { Suggestion } from "./suggestions";

/** Lo que la página «Funciones» necesita de cada función (serializable). */
export type FunctionItem = {
  id: ModuleValue;
  label: string;
  pitch: string;
  /** Función general o especialidad de un oficio (obras, gimnasio, restaurante…). */
  specialty: boolean;
  beta: boolean;
  planned: boolean;
  active: boolean;
  /** Por qué se sugiere (rubro o uso); null si no se sugiere. */
  reason: string | null;
  /** Otra función de la que depende (se avisa, no se oculta). */
  needs: ModuleValue | null;
  /** Categoría (la misma de la barra lateral). */
  category: CapabilityCategory;
  /** Si está encendida pero le falta configuración real (proveedor, ficha, publicación…): dónde terminarla. */
  setup: { configured: boolean; hint: string; href: string } | null;
};

/** `planned`: funciones que aún no existen (se muestran como «Próximamente», sin interruptor). */
export type FunctionGroups = { inUse: FunctionItem[]; suggested: FunctionItem[]; more: FunctionItem[]; planned: FunctionItem[] };

/** Dependencias entre funciones: se explican en pantalla en vez de esconder la función. */
export const NEEDS: Partial<Record<ModuleValue, ModuleValue>> = {
  purchases: "inventory",
  pos: "inventory",
  online_payments: "payments",
  einvoicing: "billing",
  receivables: "billing",
  accounting: "finance",
  taxes: "billing",
  growth: "website",
};

export type FunctionSource = { id: ModuleValue; label: string; pitch: string; kind: "base" | "specialized"; status: "READY" | "BETA" | "PLANNED"; category?: CapabilityCategory };

/**
 * Arma los grupos: «En uso» (encendidas), «Te sugerimos» (por uso o por el
 * perfil del rubro) y «Más funciones» (el resto). El Inicio no se lista (siempre está).
 */
export function groupFunctions(sources: readonly FunctionSource[], active: ReadonlySet<string>, profileSuggested: ReadonlySet<string>, usage: readonly Suggestion[], profileLabel: string): FunctionGroups {
  const usageReason = new Map(usage.map((u) => [u.module, u.reason]));
  const items = sources
    .filter((s) => s.id !== "dashboard")
    .map<FunctionItem>((s) => ({
      id: s.id,
      label: s.label,
      pitch: s.pitch,
      specialty: s.kind === "specialized",
      beta: s.status === "BETA",
      planned: s.status === "PLANNED",
      active: active.has(s.id),
      reason: usageReason.get(s.id) ?? (profileSuggested.has(s.id) ? `Va bien con un negocio de ${profileLabel}.` : null),
      needs: NEEDS[s.id] ?? null,
      category: s.category ?? "Clientes y agenda",
      setup: null,
    }));
  return {
    inUse: items.filter((i) => i.active),
    suggested: items.filter((i) => !i.active && !i.planned && i.reason),
    more: items.filter((i) => !i.active && !i.planned && !i.reason),
    planned: items.filter((i) => !i.active && i.planned),
  };
}

/**
 * ¿Se puede cambiar esta función sin dejar el sistema inconsistente? Encender exige que esté encendida la que necesita;
 * apagar exige que ninguna encendida dependa de ella. Los datos nunca se borran: apagar solo la quita del menú y de las rutas.
 */
export function toggleProblem(id: ModuleValue, next: boolean, active: ReadonlySet<string>, label: (id: string) => string): string | null {
  if (next) {
    const need = NEEDS[id];
    return need && !active.has(need) ? `«${label(id)}» funciona con «${label(need)}»: enciende «${label(need)}» primero.` : null;
  }
  const users = (Object.entries(NEEDS) as [ModuleValue, ModuleValue][]).filter(([fn, need]) => need === id && active.has(fn)).map(([fn]) => `«${label(fn)}»`);
  return users.length ? `No se puede apagar «${label(id)}» porque ${users.join(", ")} ${users.length === 1 ? "la usa" : "la usan"}. Apágala${users.length === 1 ? "" : "s"} primero.` : null;
}

/** Texto que se busca en una función (nombre, descripción y categoría, sin tildes ni mayúsculas). */
export const searchable = (i: Pick<FunctionItem, "label" | "pitch" | "category">) =>
  `${i.label} ${i.pitch} ${i.category}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
