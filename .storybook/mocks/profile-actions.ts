/** Ficha de cliente en Storybook: respuestas de muestra, sin servidor ni base. */
export type CustomerEdit = {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentId: string;
  birthDate: string;
  city: string;
  tags: string;
  profile: Record<string, string>;
  photoId: string | null;
};
export type CustomerSaveResult = { ok: true; id: string; message: string } | { ok: false; message: string; errors?: Record<string, string> };

export async function customerFormDataAction() {
  return { vertical: "gym", plans: [] as { id: string; name: string; price: number; days: number }[] };
}
export async function getCustomerForEditAction(): Promise<CustomerEdit | null> {
  return null;
}
export async function saveCustomerAction(_form: FormData): Promise<CustomerSaveResult> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true, id: "c-nuevo", message: "Cliente guardado" };
}
