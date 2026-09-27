/**
 * NÚCLEO — rangos de tiempo y buckets para gráficas (semana/mes/año).
 *
 * Extraído de lib/gym.ts cuando CAJA MENOR (2º módulo) necesitó el mismo
 * filtro — regla §9 PLAN-BASE-NEXUS: no abstraer antes de 2 casos reales.
 * Hoy lo usan: módulo Gym y módulo Caja Menor.
 */
export type RangoKey = "semana" | "mes" | "anio";

export const RANGOS: { key: RangoKey; label: string }[] = [
  { key: "semana", label: "Última semana" },
  { key: "mes", label: "Último mes" },
  { key: "anio", label: "Último año" },
];

export function isRango(v: string | undefined): v is RangoKey {
  return v === "semana" || v === "mes" || v === "anio";
}

export function rangoFechas(rango: RangoKey): { desde: Date; hasta: Date } {
  const hasta = new Date();
  hasta.setHours(23, 59, 59, 999);
  const desde = new Date(hasta);
  if (rango === "semana") desde.setDate(hasta.getDate() - 6);
  else if (rango === "mes") desde.setMonth(hasta.getMonth() - 1);
  else desde.setFullYear(hasta.getFullYear() - 1);
  desde.setHours(0, 0, 0, 0);
  return { desde, hasta };
}

const DIA_LABEL = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MES_LABEL = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

interface Bucket {
  desde: Date;
  hasta: Date;
  label: string;
}

/** Buckets para la gráfica según rango (semana: 7 días · mes: 5 semanas · año: 12 meses). */
export function buckets(rango: RangoKey, desde: Date, hasta: Date): Bucket[] {
  const out: Bucket[] = [];
  if (rango === "semana") {
    for (let i = 0; i < 7; i++) {
      const d = new Date(desde);
      d.setDate(desde.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const fin = new Date(d);
      fin.setHours(23, 59, 59, 999);
      out.push({ desde: d, hasta: fin, label: DIA_LABEL[d.getDay()] ?? "" });
    }
  } else if (rango === "mes") {
    // 5 ventanas semanales de 7 días terminando hoy.
    for (let i = 4; i >= 0; i--) {
      const fin = new Date(hasta);
      fin.setDate(hasta.getDate() - i * 7);
      fin.setHours(23, 59, 59, 999);
      const d = new Date(fin);
      d.setDate(fin.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      out.push({ desde: d, hasta: fin, label: `S${5 - i}` });
    }
  } else {
    // 12 meses terminando hoy.
    for (let i = 11; i >= 0; i--) {
      const fin = new Date(hasta.getFullYear(), hasta.getMonth() - i + 1, 1);
      fin.setDate(0); // último día del mes
      fin.setHours(23, 59, 59, 999);
      const d = new Date(hasta.getFullYear(), hasta.getMonth() - i, 1);
      d.setHours(0, 0, 0, 0);
      out.push({ desde: d, hasta: fin, label: MES_LABEL[d.getMonth()] ?? "" });
    }
  }
  return out;
}

export function inRange(fecha: Date, b: Bucket) {
  return fecha >= b.desde && fecha <= b.hasta;
}