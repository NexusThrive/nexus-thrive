import { Fragment } from "react";

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Texto con la coincidencia de la búsqueda resaltada (sin importar tildes ni mayúsculas). Sin términos devuelve el texto
 * tal cual. Usa `<mark>` para que un lector de pantalla sepa que es una coincidencia.
 */
export function HighlightText({ text, terms }: { text: string; terms?: string[] }) {
  const words = [...new Set((terms ?? []).flatMap((t) => fold(t).split(/\s+/)).filter(Boolean))];
  if (words.length === 0 || !text) return <>{text}</>;
  // Se busca sobre el texto sin tildes: NFD conserva la longitud solo si cada letra con tilde se compone de una base y una marca,
  // así que se recorre carácter a carácter para alinear los índices.
  const chars = [...text];
  const folded = chars.map((c) => fold(c));
  const flat = folded.join("");
  const owner: number[] = [];
  folded.forEach((f, i) => { for (let k = 0; k < f.length; k++) owner.push(i); });
  const marks = new Array<boolean>(chars.length).fill(false);
  for (const word of words) {
    let from = 0;
    for (;;) {
      const at = flat.indexOf(word, from);
      if (at < 0) break;
      for (let k = at; k < at + word.length; k++) marks[owner[k]!] = true;
      from = at + word.length;
    }
  }
  const parts: { text: string; on: boolean }[] = [];
  chars.forEach((c, i) => {
    const last = parts[parts.length - 1];
    if (last && last.on === marks[i]) last.text += c;
    else parts.push({ text: c, on: marks[i]! });
  });
  return (
    <>
      {parts.map((part, i) =>
        part.on ? (
          <mark key={i} className="rounded-xs bg-accent-subtle px-px text-inherit">{part.text}</mark>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
