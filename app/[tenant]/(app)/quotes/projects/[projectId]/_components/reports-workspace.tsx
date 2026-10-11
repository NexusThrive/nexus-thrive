"use client";

import { useActionState, useEffect, useMemo, useState, startTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/brand/kpi-card";
import { EmptyState } from "@/components/brand/empty-state";
import {
  exportBomCsvAction,
  getInformeCeroDataAction,
  getWeeklyReportDataAction,
} from "../reports/actions";
import { isoWeekOf, bogotaToday, isoWeekLabel } from "@/lib/lean-engine";

type ReportTab = "informe-cero" | "informe-semanal" | "bom";

export function ReportsWorkspace() {
  const params = useParams<{ tenant: string; projectId: string }>();
  const router = useRouter();
  const tenantSlug = params.tenant;
  const projectId = params.projectId;

  const today = bogotaToday();
  const [activeTab, setActiveTab] = useState<ReportTab>("informe-cero");
  const iw = isoWeekOf(today);
  const [weekNumber, setWeekNumber] = useState<number>(iw.week);
  const [year, setYear] = useState<number>(iw.year);

  const [infState, infAction, infPending] = useActionState(
    getInformeCeroDataAction.bind(null, tenantSlug, projectId),
    { status: "idle" } as any,
  );
  const [semState, semAction, semPending] = useActionState(
    getWeeklyReportDataAction.bind(null, tenantSlug, projectId, weekNumber, year),
    { status: "idle" } as any,
  );
  const [bomState, bomAction, bomPending] = useActionState(
    exportBomCsvAction.bind(null, tenantSlug, projectId),
    { status: "idle" } as any,
  );

  useEffect(() => {
    startTransition(() => {
      const fd = new FormData();
      infAction(fd);
      const fd2 = new FormData();
      semAction(fd2);
    });
  }, [projectId, tenantSlug, weekNumber, year]);

  useEffect(() => {
    if (bomState.status === "ok" && bomState.csv && bomState.filename) {
      const blob = new Blob(["\ufeff" + bomState.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = bomState.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [bomState]);

  const informeCero = infState.status === "ok" ? infState.data : null;
  const semanal = semState.status === "ok" ? semState.data : null;

  const evm = semanal?.evm;
  const hasEvm = evm?.available;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "informe-cero" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("informe-cero")}
          >
            Informe Cero
          </Button>
          <Button
            variant={activeTab === "informe-semanal" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("informe-semanal")}
          >
            Informe Semanal
          </Button>
          <Button
            variant={activeTab === "bom" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("bom")}
          >
            BOM
          </Button>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <input
            type="number"
            value={weekNumber}
            onChange={(e) => setWeekNumber(Number(e.target.value))}
            className="w-20 rounded-md border px-2 py-1 text-sm"
          />
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 rounded-md border px-2 py-1 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={semPending || infPending}
          >
            Imprimir
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              const fd = new FormData();
              bomAction(fd);
            }}
            disabled={bomPending}
          >
            {bomPending ? "Exportando..." : "Exportar BOM CSV"}
          </Button>
        </div>
      </div>

      <div className="print:block">
        {activeTab === "informe-cero" && informeCero && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{informeCero?.project?.name ?? "Proyecto"}</h2>
                <p className="text-sm text-muted-foreground">{informeCero?.project?.code ?? "-"}</p>
              </div>
              <Badge variant="outline">INFORME CERO — LÍNEA BASE</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <KpiCard label="Valor Presupuestado" value={informeCero.presupuesto?.totales?.presupuestoTotal?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }) ?? "-"} hint="COP" />
              <KpiCard label="A.I.U." value={`${((informeCero.presupuesto?.totales?.aiuPorcentaje ?? 0) / 1_000_000).toFixed(2)} %`} hint="Sobre costo directo" />
              <KpiCard label="Costos Directos" value={informeCero.presupuesto?.totales?.directoTotal?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }) ?? "-"} hint="COP" />
              <KpiCard label="A.I.U. Total" value={informeCero.presupuesto?.totales?.aiuTotal?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }) ?? "-"} hint="COP" />
            </div>

            <div className="rounded-md border">
              <div className="p-3 text-sm font-medium">Capítulos del Presupuesto</div>
              <div className="divide-y">
                {informeCero.presupuesto?.capitulos?.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <div className="font-medium">{c.code} — {c.title}</div>
                      {c.description && <div className="text-muted-foreground">{c.description}</div>}
                    </div>
                    <div className="text-right font-medium">
                      {c.total.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 })}
                    </div>
                  </div>
                )) || <div className="p-3 text-sm text-muted-foreground">Sin capítulos registrados.</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "informe-semanal" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">INFORME SEMANAL DE OBRA</h2>
                <p className="text-sm text-muted-foreground">
                  {isoWeekLabel(weekNumber, year)} • {semanal?.periodo?.startDate ?? ""} → {semanal?.periodo?.endDate ?? ""}
                </p>
              </div>
              <Badge variant="outline">PPC / CNC / EVM (N1)</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <KpiCard label="PPC" value={`${(semanal?.ppc?.value ?? 0).toFixed(1)} %`} hint="Completados/(Completados+Fallidos)" />
              <KpiCard label="Completados" value={String(semanal?.ppc?.completed ?? 0)} />
              <KpiCard label="Fallidos" value={String(semanal?.ppc?.failed ?? 0)} />
              <KpiCard label="Pendientes" value={String(semanal?.ppc?.pending ?? 0)} />
              <KpiCard label="No conformidades" value={String(semanal?.cnc?.total ?? 0)} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <KpiCard label="SPI" value={hasEvm ? semanal!.evm!.spi.toFixed(3) : "N/D"} hint={evm?.available ? undefined : evm?.reason} />
              <KpiCard label="CPI" value={hasEvm ? semanal!.evm!.cpi.toFixed(3) : "N/D"} hint={evm?.available ? undefined : evm?.reason} />
              <KpiCard label="SV (COP)" value={hasEvm ? semanal!.evm!.sv.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }) : "N/D"} />
            </div>

            <div className="rounded-md border">
              <div className="p-3 text-sm font-medium">Causas de No Conformidad (CNC)</div>
              <div className="divide-y">
                {semanal?.cnc?.items?.length ? (
                  semanal.cnc.items.map((i: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 text-sm">
                      <div>{i.causeLabel}</div>
                      <div className="font-medium">{i.count}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">Sin no conformidades registradas esta semana.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "bom" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Explosión de Compras (BOM)</h2>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const fd = new FormData();
                  bomAction(fd);
                }}
                disabled={bomPending}
              >
                {bomPending ? "Exportando..." : "Exportar CSV"}
              </Button>
            </div>
            <EmptyState
              title="Exportación CSV lista"
              description="Haz clic en Exportar BOM CSV para descargar el archivo con formato seguro (UTF-8 BOM + anti-fórmula)."
            />
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
