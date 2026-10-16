/** Nombres y títulos de los pasos del onboarding adaptativo (los pinta StepIndicator). */
import type { OnboardingStep } from "@/lib/onboarding/types";

export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  1: "Perfil",
  2: "Información",
  3: "Módulos",
  4: "Finalización",
};

export const ONBOARDING_STEP_TITLES: Record<OnboardingStep, string> = {
  1: "¿Cómo trabajas hoy?",
  2: "Cuéntanos de tu negocio",
  3: "Elige tus módulos",
  4: "Revisa y finaliza",
};
