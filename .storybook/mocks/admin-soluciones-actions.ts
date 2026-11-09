/** Soluciones del Operations Center en Storybook: respuestas de muestra, sin servidor ni base. */
export async function setSolutionAction(_tenantId: string, value: string) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return { ok: true as const, message: value === "auto" ? "Café del Parque: vuelve a la solución de su rubro" : "Café del Parque: Nexus Food" };
}
