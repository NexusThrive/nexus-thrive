/**
 * FORMATO — dinero y fechas según la ORGANIZACIÓN activa.
 *
 * POR QUÉ NO ES UN MÓDULO FIJO
 * ----------------------------
 * Antes decíamos "es-CO / COP" en constantes de módulo. La organización YA
 * persiste su moneda y su país (`Organization.moneda` / `Organization.pais`,
 * llenados por el onboarding), así que un negocio fuera de Colombia veía
 * "COP" y fechas con formato colombiano.
 *
 * Ahora la presentación se deriva de la org: `crearFormatos({ moneda, pais })`
 * devuelve los formateadores ya ajustados. Los exports sueltos (`formatMoney`,
 * `formatDate`, `formatCompact`) siguen existiendo como atajo con la
 * presentación por defecto, para que un componente sin contexto de org no
 * rompa — pero toda página de datos debe usar los de su org.
 *
 * EL SIGNO NO SE TOCA
 * -------------------
 * `formatMoney` ya no aplica `Math.abs`: un saldo, un neto o un balance
 * NEGATIVO se muestran con su signo. Antes se perdía (y el código se
 * esquivaba poniendo "+"/"−" a mano, lo que duplicaba el signo en cuanto un
 * valor podía ser negativo). Quien quiera marcar semántica — "esto fue un
 * ingreso" — pone el prefijo sobre un valor que ya es positivo.
 */

/** Datos de presentación de una organización. */
export interface Presentacion {
  /** ISO 4217: "COP", "USD", "MXN"... */
  moneda: string;
  /** ISO 3166-1 alpha-2: "CO", "MX", "US"... `null` = se asume Colombia. */
  pais: string | null;
}

/** Colombia: lo que usa el 100% de los negocios actuales. */
export const PRESENTACION_POR_DEFECTO: Presentacion = { moneda: "COP", pais: "CO" };

/**
 * Locales de los países con los que trabajamos. El idioma NO se deduce del
 * país automáticamente (`new Intl.Locale("US").language` es "en", pero
 * muchos países tienen más de un idioma oficial), así que se declara
 * explícitamente lo que nos interesa y se cae a `es-<PAÍS>`.
 */
const LOCALE_POR_PAIS: Record<string, string> = {
  CO: "es-CO",
  MX: "es-MX",
  AR: "es-AR",
  CL: "es-CL",
  PE: "es-PE",
  EC: "es-EC",
  UY: "es-UY",
  PY: "es-PY",
  BO: "es-BO",
  CR: "es-CR",
  PA: "es-PA",
  DO: "es-DO",
  GT: "es-GT",
  SV: "es-SV",
  HN: "es-HN",
  NI: "es-NI",
  PR: "es-PR",
  US: "en-US",
};

function localeDe(pais: string | null | undefined): string {
  const codigo = pais?.trim().toUpperCase();
  if (!codigo) return "es-CO";
  return LOCALE_POR_PAIS[codigo] ?? `es-${codigo}`;
}

function monedaDe(moneda: string | null | undefined): string {
  return moneda?.trim().toUpperCase() || "COP";
}

export interface Formatos {
  /** $1.234.567 — con signo si el valor es negativo. */
  formatMoney(value: number): string;
  /** $1,2 M — compacto para ejes de gráficas, con signo. */
  formatCompact(value: number): string;
  /** 11 sep 2026 */
  formatDate(input: string | Date): string;
}

/** Formateadores de UNA organización. Es la forma correcta de formatear. */
export function crearFormatos(presentacion: Presentacion): Formatos {
  const locale = localeDe(presentacion.pais);
  const currency = monedaDe(presentacion.moneda);

  const formatMoney = (value: number): string =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      // Sin `maximumFractionDigits`: cada moneda muestra sus decimales por
      // defecto (COP 0, USD 2). Fijarlos a 0 dejaba los centavos fuera de
      // pantalla en negocios que cobran en dólares.
      currency,
    }).format(value);

  const formatCompact = (value: number): string =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  /**
   * Fecha corta localizada: 11 sep 2026.
   * - Si llega un string, se parsea como fecha LOCAL (YYYY-MM-DD) para que el
   *   servidor y el navegador muestren el mismo día en cualquier zona horaria
   *   (evita hydration mismatch).
   * - Si llega un Date (p. ej. desde Prisma), se formatea directo.
   */
  const formatDate = (input: string | Date): string => {
    const opciones: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    if (input instanceof Date) return input.toLocaleDateString(locale, opciones);
    const [y = 0, m = 1, d = 1] = input.split("T")[0]!.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, opciones);
  };

  return { formatMoney, formatCompact, formatDate };
}

/** Atajo con la presentación por defecto (Colombia). Ver `crearFormatos`. */
export function formatMoney(value: number): string {
  return crearFormatos(PRESENTACION_POR_DEFECTO).formatMoney(value);
}

/** Atajo con la presentación por defecto (Colombia). Ver `crearFormatos`. */
export function formatCompact(value: number): string {
  return crearFormatos(PRESENTACION_POR_DEFECTO).formatCompact(value);
}

/** Atajo con la presentación por defecto (Colombia). Ver `crearFormatos`. */
export function formatDate(input: string | Date): string {
  return crearFormatos(PRESENTACION_POR_DEFECTO).formatDate(input);
}
