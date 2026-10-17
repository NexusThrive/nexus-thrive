/**
 * Pasos del onboarding auto-servicio. `intro` es la presentación (sin
 * progreso); los otros cuatro son los que ve el indicador.
 */
export const FLOW_STEPS = ["intro", "profile", "business", "plan", "confirm"] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];

/** Pasos con progreso visible (todo menos la presentación). */
export const PROGRESS_STEPS = FLOW_STEPS.slice(1) as readonly Exclude<FlowStep, "intro">[];

export const FLOW_META: Record<FlowStep, { label: string; title: string; description: string }> = {
  intro: { label: "Presentación", title: "Antes de empezar", description: "" },
  profile: {
    label: "Perfil",
    title: "¿Cómo trabajas hoy?",
    description: "Así ajustamos los datos que te pedimos: nada de más.",
  },
  business: {
    label: "Tu negocio",
    title: "Cuéntanos de tu negocio",
    description: "Con esto armamos tu espacio y tu enlace en NEXUS.",
  },
  plan: {
    label: "Plan y módulos",
    title: "Elige cómo empezar",
    description: "Solo ves los módulos que sirven a tu rubro. Empieza gratis o elige un plan; aún no se cobra nada.",
  },
  confirm: {
    label: "Confirmación",
    title: "Confirma tus datos",
    description: "Revisa que todo esté correcto. Puedes cambiarlo después desde Ajustes.",
  },
};

export function nextStep(step: FlowStep): FlowStep {
  const i = FLOW_STEPS.indexOf(step);
  return FLOW_STEPS[Math.min(FLOW_STEPS.length - 1, i + 1)];
}

export function previousStep(step: FlowStep, firstStep: FlowStep = "intro"): FlowStep {
  const i = FLOW_STEPS.indexOf(step);
  return FLOW_STEPS[Math.max(FLOW_STEPS.indexOf(firstStep), i - 1)];
}

/** Posición 1..4 en el indicador (0 en la presentación). */
export function progressIndex(step: FlowStep): number {
  return FLOW_STEPS.indexOf(step);
}
