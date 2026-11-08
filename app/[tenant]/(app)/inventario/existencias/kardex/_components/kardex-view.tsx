"use client";

import { useRouter } from "next/navigation";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { formatCurrency } from "@/lib/foundation/format";
import type { KardexLine } from "@/lib/business/inventory/stock-service";

const KIND: Record<string, string> = { IN: "Entrada", OUT: "Salida", SALE: "Venta", ADJUST: "Ajuste" };

/** Kardex: se elige el producto y se ven sus movimientos del más reciente al más antiguo. */
export default function KardexView({ slug, products, selectedId, lines, warehouses }: { slug: string; products: { id: string; name: string }[]; selectedId: string | null; lines: KardexLine[]; warehouses: { id: string; name: string }[] }) {
  const router = useRouter();
  const wn = new Map(warehouses.map((w) => [w.id, w.name]));
  return (
    <div className="grid gap-4">
      <div className="max-w-sm">
        <Select aria-label="Producto" value={selectedId ?? ""} onChange={(e) => router.push(`/${slug}/inventario/existencias/kardex${e.target.value ? `?producto=${e.target.value}` : ""}`)}>
          <option value="">Elige un producto</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>
      {!selectedId ? (
        <EmptyState mark="page" remember={false} headingLevel={2} title="Elige un producto" description={products.length ? "Verás cada movimiento con su costo, su valor y el saldo que dejó." : "Aún no tienes productos con control de existencias."} icon={<ScrollText />} />
      ) : lines.length === 0 ? (
        <EmptyState mark="page" remember={false} headingLevel={2} title="Sin movimientos" description="Este producto todavía no tiene entradas, salidas ni ajustes." icon={<ScrollText />} />
      ) : (
        <AdaptiveTable<KardexLine>
          caption="Kardex del producto"
          rows={lines}
          getRowId={(l) => l.id}
          columns={[
            { key: "date", header: "Fecha", role: "primary", cell: (l) => <span className="tabular-nums">{l.date.slice(0, 16).replace("T", " ")}</span> },
            { key: "kind", header: "Tipo", role: "status", cell: (l) => <Badge tone={l.kind === "IN" ? "success" : l.kind === "ADJUST" ? "warning" : "muted"}>{KIND[l.kind] ?? l.kind}</Badge> },
            { key: "qty", header: "Cantidad", role: "detail", align: "right", cell: (l) => <span className="font-mono tabular-nums">{l.quantity}</span> },
            { key: "cost", header: "Costo unitario", role: "detail", align: "right", cell: (l) => (l.unitCost == null ? "" : <span className="font-mono tabular-nums">{formatCurrency(l.unitCost)}</span>) },
            { key: "value", header: "Valor", role: "detail", align: "right", cell: (l) => (l.value == null ? "" : <span className="font-mono tabular-nums">{formatCurrency(l.value)}</span>) },
            { key: "bal", header: "Saldo", role: "figure", cell: (l) => (l.balance == null ? "" : <span className="font-mono">{l.balance}</span>) },
            { key: "wh", header: "Bodega", role: "secondary", cell: (l) => (l.warehouseId ? (wn.get(l.warehouseId) ?? "") : "") },
            { key: "note", header: "Motivo", role: "detail", cell: (l) => <span className="text-muted-foreground">{l.note ?? ""}</span> },
          ]}
        />
      )}
    </div>
  );
}
