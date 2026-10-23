"use client";

import { useActionState, useEffect, useMemo, useState, startTransition } from "react";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { fieldClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { KpiCard } from "@/components/molecules/kpi-card";
import { EmptyState } from "@/components/molecules/empty-state";
import {
  exportBomCsvAction,
  getInformeCeroDataAction,
  getWeeklyReportDataAction,
  type BomExportResult,
  type InformeCeroResult,
  type WeeklyReportResult,
} from "../reports/actions";
import { isoWeekOf, bogotaToday, isoWeekLabel } from "@/lib/construction/lean-engine";

type ReportTab = "informe-cero" | "informe-semanal" | "bom";

// Estado inicial de los useActionState; "idle" no pertenece a los tipos de
// resultado del servidor (que solo devuelve "ok" | "error").
type Idle = { status: "idle" };
const IDLE: Idle = { status: "idle" };

// Las actions ligadas reciben (prevState, formData); se tipan con el estado
// que realmente maneja el hook (resultado del servidor o el Idle inicial).
type BoundAction<R> = (prev: R | Idle, formData: FormData) => Promise<R | Idle>;

function joinPlace(address: string | null, city: string | null): string | null {
  const parts = [address, city].filter((part): part is string => Boolean(part?.trim()));
  return parts.length ? parts.join(", ") : null;
}

/** Bloque de una parte del informe (constructora, cliente, obra). */
function PartyBlock({
  title,
  lines,
  empty,
}: {
  title: string;
  lines: (string | null)[];
  empty: string;
}) {
  const filled = lines.filter((line): line is string => Boolean(line?.trim()));
  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      {filled.length ? (
        <div className="mt-1 space-y-0.5">
          {filled.map((line, index) => (
            <div key={index} className={index === 0 ? "font-medium" : "text-muted-foreground"}>
              {line}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

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
    getInformeCeroDataAction.bind(null, tenantSlug, projectId) as BoundAction<InformeCeroResult>,
    IDLE,
  );
  const [semState, semAction, semPending] = useActionState(
    getWeeklyReportDataAction.bind(null, tenantSlug, projectId, weekNumber, year) as BoundAction<WeeklyReportResult>,
    IDLE,
  );
  const [bomState, bomAction, bomPending] = useActionState(
    exportBomCsvAction.bind(null, tenantSlug, projectId) as BoundAction<BomExportResult>,
    IDLE,
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

  const evm = semanal?.evm ?? null;
  // Un indicador EVM solo muestra valor si es medible; si no, "No medible".
  const evmValue = (m?: { value: string | null; measurable: boolean }): string =>
    m && m.measurable ? (m.value ?? "—") : "No medible";
  const evmHint = (m?: { measurable: boolean; reason?: string }): string | undefined =>
    m && !m.measurable ? m.reason : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          ariaLabel="Tipo de informe"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "informe-cero", label: "Informe Cero" },
            { value: "informe-semanal", label: "Informe semanal" },
            { value: "bom", label: "BOM" },
          ]}
        />
        <div className="flex items-center gap-2 print:hidden">
          <input
            type="number"
            value={weekNumber}
            onChange={(e) => setWeekNumber(Number(e.target.value))}
            aria-label="Semana"
            className={cn(fieldClasses, "h-8 w-20 tabular-nums")}
          />
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Año"
            className={cn(fieldClasses, "h-8 w-24 tabular-nums")}
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
                <h2 className="text-lg font-semibold">{informeCero.projectName}</h2>
                <p className="text-sm text-muted-foreground">
                  {informeCero.projectCode}
                  {informeCero.budgetCode ? ` • Presupuesto ${informeCero.budgetCode}` : ""}
                </p>
              </div>
              <Badge variant="outline">INFORME CERO — LÍNEA BASE</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <PartyBlock
                title="Constructora"
                lines={[
                  informeCero.constructorName,
                  informeCero.constructorNit ? `NIT ${informeCero.constructorNit}` : null,
                  joinPlace(informeCero.constructorAddress, informeCero.constructorCity),
                ]}
                empty="Completa la razón social y el NIT en Configuración."
              />
              <PartyBlock
                title="Cliente"
                lines={[
                  informeCero.clientTaxName || informeCero.clientName,
                  informeCero.clientTaxId
                    ? `NIT ${informeCero.clientTaxId}${informeCero.clientTaxDv ? `-${informeCero.clientTaxDv}` : ""}`
                    : null,
                  joinPlace(informeCero.clientAddress, informeCero.clientCity),
                ]}
                empty="Completa los datos del cliente en la pestaña Ficha."
              />
              <PartyBlock
                title="Obra"
                lines={[
                  joinPlace(informeCero.siteAddress, informeCero.siteCity),
                  informeCero.siteDepartment,
                  informeCero.projectLeaderName ? `Líder: ${informeCero.projectLeaderName}` : null,
                ]}
                empty="Completa la ubicación en la pestaña Ficha."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <KpiCard label="Valor Presupuestado" value={informeCero.grandTotal} hint="COP" />
              <KpiCard label="Costos Directos" value={informeCero.directCostTotal} hint="COP" />
              <KpiCard
                label="A.I.U."
                value={`${informeCero.aiuAdminPct} / ${informeCero.aiuImprevPct} / ${informeCero.aiuUtilidadPct}`}
                hint="Administración / Imprevistos / Utilidad sobre costo directo"
              />
              <KpiCard
                label="IVA sobre utilidad"
                value={informeCero.ivaUtilidadTotal}
                hint={`${informeCero.ivaUtilidadPct} de la utilidad`}
              />
            </div>

            <div className="rounded-md border">
              <div className="p-3 text-sm font-medium">Capítulos del Presupuesto</div>
              <div className="divide-y">
                {informeCero.chapters.length ? (
                  informeCero.chapters.map((c) => (
                    <div key={c.order} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <div className="font-medium">{c.order}. {c.name}</div>
                        {c.description && <div className="text-muted-foreground">{c.description}</div>}
                      </div>
                      <div className="text-right font-medium">{c.subtotal}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">Sin capítulos registrados.</div>
                )}
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
                  {isoWeekLabel(weekNumber, year)} • {semanal?.periodStart ?? ""} → {semanal?.periodEnd ?? ""}
                </p>
              </div>
              <Badge variant="outline">PPC / CNC / EVM (N1)</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <KpiCard label="PPC" value={`${(semanal?.ppc?.ppc ?? 0).toFixed(1)} %`} hint="Cumplimiento de compromisos (no es avance físico)" />
              <KpiCard label="Completados" value={String(semanal?.ppc?.completed ?? 0)} />
              <KpiCard label="Fallidos" value={String(semanal?.ppc?.failed ?? 0)} />
              <KpiCard label="Pendientes" value={String(semanal?.ppc?.pending ?? 0)} />
              <KpiCard label="No conformidades" value={String(semanal?.cnc?.total ?? 0)} />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <KpiCard label="PV (COP)" value={evmValue(evm?.pv)} hint={evmHint(evm?.pv)} />
              <KpiCard label="EV (COP)" value={evmValue(evm?.ev)} hint={evmHint(evm?.ev)} />
              <KpiCard label="AC (COP)" value={evmValue(evm?.ac)} hint={evmHint(evm?.ac)} />
              <KpiCard label="SPI" value={evmValue(evm?.spi)} hint={evmHint(evm?.spi)} />
              <KpiCard label="CPI" value={evmValue(evm?.cpi)} hint={evmHint(evm?.cpi)} />
              <KpiCard label="SV (COP)" value={evmValue(evm?.sv)} hint={evmHint(evm?.sv)} />
              <KpiCard label="CV (COP)" value={evmValue(evm?.cv)} hint={evmHint(evm?.cv)} />
            </div>
            {evm && !evm.available ? (
              <p className="text-xs text-muted-foreground">{evm.reason}</p>
            ) : null}

            <div className="rounded-md border">
              <div className="p-3 text-sm font-medium">Causas de No Conformidad (CNC)</div>
              <div className="divide-y">
                {semanal?.cnc?.entries?.length ? (
                  semanal.cnc.entries.map((entry: { label: string; count: number }, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 text-sm">
                      <div>{entry.label}</div>
                      <div className="font-medium">{entry.count}</div>
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
