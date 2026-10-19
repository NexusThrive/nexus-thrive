/**
 * Indicativos telefónicos (puro). Orden: Colombia primero, luego
 * alfabético en español. `splitPhone` separa "+57 300…" en país y número.
 */

export type Country = { iso: string; name: string; dial: string; flag: string };

const LIST: Country[] = [
  ["AR", "Argentina", "54"], ["BO", "Bolivia", "591"], ["BR", "Brasil", "55"], ["CA", "Canadá", "1"], ["CL", "Chile", "56"],
  ["CN", "China", "86"], ["CR", "Costa Rica", "506"], ["CU", "Cuba", "53"], ["DE", "Alemania", "49"], ["DO", "República Dominicana", "1"],
  ["EC", "Ecuador", "593"], ["SV", "El Salvador", "503"], ["ES", "España", "34"], ["US", "Estados Unidos", "1"], ["FR", "Francia", "33"],
  ["GT", "Guatemala", "502"], ["HN", "Honduras", "504"], ["IT", "Italia", "39"], ["JM", "Jamaica", "1"], ["MX", "México", "52"],
  ["NI", "Nicaragua", "505"], ["NL", "Países Bajos", "31"], ["PA", "Panamá", "507"], ["PY", "Paraguay", "595"], ["PE", "Perú", "51"],
  ["PT", "Portugal", "351"], ["PR", "Puerto Rico", "1"], ["GB", "Reino Unido", "44"], ["CH", "Suiza", "41"], ["TT", "Trinidad y Tobago", "1"],
  ["UY", "Uruguay", "598"], ["VE", "Venezuela", "58"], ["AW", "Aruba", "297"], ["CW", "Curazao", "599"], ["IL", "Israel", "972"],
  ["JP", "Japón", "81"], ["KR", "Corea del Sur", "82"], ["AU", "Australia", "61"], ["IN", "India", "91"], ["BE", "Bélgica", "32"],
].map(([iso, name, dial]) => ({ iso, name, dial, flag: String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) }));

const COLOMBIA: Country = { iso: "CO", name: "Colombia", dial: "57", flag: "🇨🇴" };

/** Colombia primero; el resto por nombre (es). */
export const COUNTRIES: Country[] = [COLOMBIA, ...LIST.sort((a, b) => a.name.localeCompare(b.name, "es"))];

export function searchCountries(q: string): Country[] {
  const t = q.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/^\+/, "");
  if (!t) return COUNTRIES;
  return COUNTRIES.filter((c) => c.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(t) || c.dial.startsWith(t) || c.iso.toLowerCase() === t);
}

/** "+57 300 123 4567" → { country: CO, number: "3001234567" }. Sin indicativo → Colombia. */
export function splitPhone(value: string): { country: Country; number: string } {
  const v = value.trim();
  if (v.startsWith("+")) {
    const digits = v.replace(/\D/g, "");
    // El indicativo más largo que coincida (591 antes que 5…).
    const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => digits.startsWith(c.dial));
    if (match) return { country: match.iso === "US" || match.dial !== "1" ? match : COUNTRIES.find((c) => c.iso === "US")!, number: digits.slice(match.dial.length) };
  }
  return { country: COLOMBIA, number: v.replace(/[^\d]/g, "") };
}

export function joinPhone(country: Country, number: string) {
  const n = number.replace(/\D/g, "");
  return n ? `+${country.dial} ${n}` : "";
}
