/** Acción de funciones en Storybook: responde sin servidor ni base. */
export async function setFunctionAction(_slug: string, moduleName: string, active: boolean) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (moduleName === "whatsapp" && active) return { ok: false as const, message: "No se pudo encender (prueba de error)." };
  return { ok: true as const, message: active ? "Función encendida: ya está en tu menú" : "Función apagada (tus datos se conservan)" };
}
