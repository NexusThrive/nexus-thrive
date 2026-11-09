/** Registro en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
export type SlugAvailability = { available: boolean; suggestion?: string };
export async function checkSlugAvailabilityAction(slug: string): Promise<SlugAvailability> {
  await wait(300);
  return slug === "ocupado" ? { available: false, suggestion: "ocupado-2" } : { available: true };
}
export async function completeAdaptiveOnboardingAction() {
  await wait(800);
  return { status: "ok" as const, slug: "demo", plan: "ESSENTIAL" as const };
}
