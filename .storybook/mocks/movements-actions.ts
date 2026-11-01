/** Movimientos de un día, semana o mes de la gráfica del Inicio: datos de muestra, sin servidor ni base. */
export type MovementsResult =
  | { ok: true; rows: { id: string; type: "in" | "out"; title: string; subtitle: string; amount: number; at: string }[]; truncated: boolean }
  | { ok: false; message: string };

export async function loadMovementsAction(_slug: string, from: string, _to: string): Promise<MovementsResult> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return {
    ok: true,
    truncated: false,
    rows: [
      { id: "m1", type: "in", title: "Mensualidad · Plan Premium", subtitle: "Tarjeta", amount: 180000, at: `${from}T14:20:00-05:00` },
      { id: "m2", type: "in", title: "Venta en mostrador", subtitle: "Efectivo", amount: 45000, at: `${from}T11:05:00-05:00` },
      { id: "m3", type: "out", title: "Compra de insumos", subtitle: "Caja menor", amount: 62000, at: `${from}T09:40:00-05:00` },
    ],
  };
}
