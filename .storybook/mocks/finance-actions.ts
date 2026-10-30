/** Cobro y gasto de Finanzas en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createPaymentAction(_state: unknown, _form: FormData) {
  await wait();
  return { status: "ok" as const, receipt: { reference: "REC-1158", createdAt: new Date().toISOString() } };
}

export async function createExpenseAction(_state: unknown, _form: FormData) {
  await wait();
  return { status: "ok" as const };
}

export async function registerScannedPaymentAction() {
  await wait();
  return { status: "ok" as const };
}
