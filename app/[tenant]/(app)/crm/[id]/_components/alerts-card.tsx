import { StatusDot, type StatusTone } from "@/components/atoms/badge";
import { Card, CardHeader, CardTitle } from "@/components/molecules/card";

export type SummaryAlert = { tone: StatusTone; text: string };

/**
 * Alertas reales de la cuenta del cliente (estado de cuenta, pagos pendientes,
 * membresía por vencer, códigos sin asignar…). Sin inventos: si no hay nada
 * que avisar, lo dice.
 */
export default function AlertsCard({ alerts }: { alerts: SummaryAlert[] }) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Alertas</CardTitle>
      </CardHeader>
      {alerts.length ? (
        <ul className="grid gap-2.5">
          {alerts.map((alert, index) => (
            <li
              key={`${alert.tone}-${index}`}
              className="flex items-start gap-2.5 text-[13.5px] text-foreground"
            >
              <StatusDot tone={alert.tone} className="mt-1.5" />
              <span>{alert.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Sin alertas. La cuenta está en orden.
        </p>
      )}
    </Card>
  );
}
