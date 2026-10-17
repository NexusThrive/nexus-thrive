/**
 * Checklist de puesta en marcha de un negocio (puro). Cada paso se marca
 * solo con datos reales; nada se tilda a mano.
 */

export type ChecklistFacts = {
  onboardingCompleted: boolean;
  planSelected: boolean;
  hasManager: boolean;
  contacts: number;
  users: number;
  customers: number;
  movements: number;
  extraModules: number;
};

export const CHECKLIST_STEPS = [
  { key: "registro", label: "Registro completo", hint: "Terminó el onboarding", done: (f: ChecklistFacts) => f.onboardingCompleted },
  { key: "plan", label: "Plan elegido", hint: "Eligió plan y módulos", done: (f: ChecklistFacts) => f.planSelected },
  { key: "responsable", label: "Responsable NEXUS", hint: "Alguien del equipo lo acompaña", done: (f: ChecklistFacts) => f.hasManager },
  { key: "contacto", label: "Contacto designado", hint: "Sabemos a quién llamar", done: (f: ChecklistFacts) => f.contacts > 0 },
  { key: "modulos", label: "Módulos activos", hint: "Usa algo más que el Inicio", done: (f: ChecklistFacts) => f.extraModules > 0 },
  { key: "clientes", label: "Primeros clientes", hint: "Cargó al menos 3 clientes", done: (f: ChecklistFacts) => f.customers >= 3 },
  { key: "movimientos", label: "Primer movimiento", hint: "Registró un cobro o un gasto", done: (f: ChecklistFacts) => f.movements > 0 },
  { key: "equipo", label: "Equipo invitado", hint: "Hay más de un usuario", done: (f: ChecklistFacts) => f.users > 1 },
] as const;

export function checklist(f: ChecklistFacts) {
  const steps = CHECKLIST_STEPS.map((s) => ({ key: s.key, label: s.label, hint: s.hint, done: s.done(f) }));
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, pct: Math.round((done / steps.length) * 100), next: steps.find((s) => !s.done) ?? null };
}
