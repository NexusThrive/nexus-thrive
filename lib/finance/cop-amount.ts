/**
 * Montos en pesos colombianos escritos a mano en formularios.
 *
 * Normaliza a un decimal canónico ("1234567.89") sin pasar por `number`, para
 * que el valor llegue intacto a las columnas `Decimal`. Acepta los formatos que
 * la gente realmente escribe:
 *
 * - "150000", "150000,5", "150000.50"         → sin separador de miles
 * - "150.000", "1.234.567,89"                 → miles con punto (es-CO)
 * - "150,000", "1,234,567.89"                 → miles con coma (en-US)
 * - "$ 150.000"                               → con símbolo y espacios
 *
 * Un único separador seguido de exactamente 3 dígitos se interpreta como miles
 * ("150.000" = 150000), porque el peso no usa milésimas. Hasta 2 decimales.
 * Devuelve `null` si el texto no es un monto válido mayor que cero.
 */
export function parseCopAmount(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s$]/g, "");
  if (!cleaned) {
    return null;
  }

  const match =
    /^(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/.exec(cleaned) ??
    /^(\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/.exec(cleaned) ??
    /^(\d+)(?:[.,](\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    return null;
  }

  const integer = match[1].replace(/[.,]/g, "").replace(/^0+(?=\d)/, "");
  const fraction = (match[2] ?? "").replace(/0+$/, "");
  if (/^0+$/.test(integer) && fraction === "") {
    return null;
  }

  return fraction ? `${integer}.${fraction}` : integer;
}

/**
 * Compara un monto canónico (salida de `parseCopAmount`) con un tope entero en
 * pesos, sin `number`: la parte entera decide y, si empata, cualquier decimal
 * lo supera.
 */
export function copAmountExceeds(amount: string, maxPesos: bigint): boolean {
  const [integer, fraction = ""] = amount.split(".");
  const whole = BigInt(integer);
  return whole > maxPesos || (whole === maxPesos && fraction !== "");
}
