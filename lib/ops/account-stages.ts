/** Etapas comerciales de una cuenta (seguro para cliente y servidor). */
export type AccountStageValue = "ONBOARDING" | "ACTIVE" | "CANCELLED" | "ARCHIVED";

export const ACCOUNT_STAGES: { value: AccountStageValue; label: string }[] = [
  { value: "ONBOARDING", label: "En onboarding" },
  { value: "ACTIVE", label: "Activa" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "ARCHIVED", label: "Archivada" },
];
