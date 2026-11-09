/** Nuevo cliente en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function createNewCustomerAction(form: FormData) {
  await wait();
  const data = JSON.parse(String(form.get("data") ?? "{}")) as { name?: string };
  if (!data.name || data.name.trim().length < 2) return { ok: false as const, message: "Revisa los campos marcados.", errors: { name: "Escribe el nombre del cliente" } };
  return { ok: true as const, id: "c-nuevo", message: "Cliente guardado" };
}
export async function checkDuplicateAction(_slug: string, probe: { phone?: string; email?: string }) {
  await wait(80);
  return probe.phone?.replace(/\D/g, "").endsWith("3001234567") ? { id: "c1", name: "María Pérez", field: "phone" as const } : null;
}
