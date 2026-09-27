/**
 * COMPARTIDO — helpers de lectura de FormData para acciones server.
 * Usados por todos los módulos; viven acá porque se repiten en cada
 * módulo real (regla §9: extraer cuando el 2º caso aparece).
 */

export function str(input: FormData, key: string): string {
  return String(input.get(key) || "").trim();
}

export function din(input: FormData, key: string): number {
  const v = Number(String(input.get(key) || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(v) ? v : 0;
}