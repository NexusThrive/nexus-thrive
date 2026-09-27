/** Moneda de la demo (COP / es-CO). En el módulo real, la org trae su moneda/locale. */
const LOCALE = "es-CO";
const CURRENCY = "COP";

/** Formato de dinero en la moneda de la organización (COP por defecto). */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
}

/** Formato compacto para ejes de gráficas: $5.4M, $3.2M, $800K. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1).replace(".0", "")}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000)}K`;
  }
  return `${sign}$${abs}`;
}

/**
 * Fecha corta localizada: 11 sep 2026.
 * - Si llega un string, se parsea como fecha LOCAL (YYYY-MM-DD) para que el
 *   servidor y el navegador muestren el mismo día en cualquier zona horaria
 *   (evita hydration mismatch).
 * - Si llega un Date (p. ej. desde Prisma), se formatea directo.
 */
export function formatDate(input: string | Date): string {
  if (input instanceof Date) {
    return input.toLocaleDateString(LOCALE, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  const [y = 0, m = 1, d = 1] = input.split("T")[0]!.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}