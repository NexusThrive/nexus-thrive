/**
 * Pasarle una pregunta a AURI AI desde cualquier parte (la paleta de búsqueda cuando no encuentra nada, por ejemplo). Es un
 * evento del navegador: quien monta el chat (`AuriAssistant`) lo escucha, abre la ventana y envía el texto. Sin dependencias, para
 * poder llamarlo desde donde sea.
 */
export const AURI_ASK_EVENT = "nexus:auri-ask";

export function askAuri(text: string): void {
  const clean = text.trim();
  if (!clean || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ text: string }>(AURI_ASK_EVENT, { detail: { text: clean } }));
}
