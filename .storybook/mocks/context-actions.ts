/** Perfil del negocio en Storybook: responde sin servidor ni base. */
export async function updateBusinessContextAction(_slug: string, input: { activity: string }) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (input.activity.toLowerCase().includes("error")) return { ok: false as const, message: "No se pudo guardar (prueba de error)." };
  return { ok: true as const, message: "Perfil actualizado. Tus funciones y tus datos siguen igual." };
}
