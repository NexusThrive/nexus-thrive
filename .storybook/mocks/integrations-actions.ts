/** Integraciones en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function connectWompiAction(_s: string, input: { publicKey: string; integritySecret: string; eventsSecret: string }) {
  await wait();
  if (!/^pub_(prod|test)_[A-Za-z0-9]+$/.test(input.publicKey.trim())) return { ok: false as const, field: "publicKey" as const, message: "La llave pública de Wompi empieza por pub_prod_ o pub_test_." };
  if (!input.integritySecret.trim()) return { ok: false as const, field: "integritySecret" as const, message: "Escribe el secreto de integridad." };
  if (!input.eventsSecret.trim()) return { ok: false as const, field: "eventsSecret" as const, message: "Escribe el secreto de eventos." };
  if (!input.integritySecret.trim().startsWith("test_integrity_")) return { ok: false as const, field: "integritySecret" as const, message: "El secreto de integridad de pruebas empieza por test_integrity_." };
  return { ok: true as const, message: "Wompi conectado en pruebas: los cobros no mueven dinero real" };
}
export async function disconnectPaymentAction() { await wait(); return { ok: true as const, message: "Pasarela desconectada" }; }
export async function saveWompiTariffAction(_s: string, t: { feePct: number; feeFixed: number; feeVatPct: number }) {
  await wait();
  return t.feePct > 30 ? { ok: false as const, message: "Los porcentajes no pueden pasar de 30 %." } : { ok: true as const, message: "Tarifa guardada: los cobros nuevos muestran su comisión estimada" };
}
