/** Acciones de Configuración en Storybook: validan como el servidor y no guardan nada. */
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export async function updateTenantProfileAction(_prev: unknown, formData: FormData) {
  await wait();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!name) return { status: "error" as const, errors: { name: "El nombre es requerido." } };
  if (slug === "ocupado") return { status: "error" as const, errors: { slug: "Ese slug ya está en uso por otro negocio." } };
  if (String(formData.get("city") ?? "") === "falla") return { status: "error" as const, message: "Error al actualizar el perfil. Inténtalo de nuevo." };
  return { status: "ok" as const, message: "Perfil actualizado correctamente." };
}
