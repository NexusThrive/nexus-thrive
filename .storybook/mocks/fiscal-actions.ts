/** Factura electrónica en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function setEnabledAction(_s: string, enabled: boolean) { await wait(); return { ok: true as const, message: enabled ? "Factura electrónica activada: cada venta deja su documento en cola" : "Factura electrónica desactivada" }; }
export async function connectSandboxAction() { await wait(); return { ok: true as const, message: "Proveedor de prueba conectado" }; }
export async function submitAction() { await wait(); return { ok: true as const, message: "3 enviados · 2 aceptados · 1 rechazados" }; }
export async function retryAction() { await wait(); return { ok: true as const, message: "Vuelve a la cola con los datos al día" }; }
export async function connectHttpAction(_s: string, url: string) { await wait(); return url.startsWith("https://") ? { ok: true as const, message: "Proveedor conectado" } : { ok: false as const, message: "La dirección debe ser HTTPS." }; }
