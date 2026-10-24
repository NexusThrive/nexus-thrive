/** Mi sitio en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function saveSiteAction(_s: string, input: { siteSlug: string; enabled: boolean }) {
  await wait();
  if (input.siteSlug === "ocupado") return { ok: false as const, message: "Esa dirección ya la usa otro negocio.", field: "siteSlug" };
  return { ok: true as const, message: input.enabled ? "Sitio guardado y publicado" : "Sitio guardado (sin publicar)" };
}
