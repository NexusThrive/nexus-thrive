/** Notas de la ficha en Storybook: guarda sin servidor. */
export type NoteFormState = { status: "idle" | "error" | "ok"; message?: string; content?: string };
export async function createCustomerNoteAction(_prev: NoteFormState, form: FormData): Promise<NoteFormState> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const content = String(form.get("content") ?? "").trim();
  return content ? { status: "ok" } : { status: "error", message: "Escribe la nota.", content };
}
