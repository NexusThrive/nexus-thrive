import type { ReactNode } from "react";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/molecules/card";

/**
 * Tarjeta informativa de la ficha 360°: un título y una lista de pares
 * etiqueta/valor. Las filas sin valor se omiten para no mostrar huecos; si no
 * queda ninguna, se muestra `emptyText`. `footer` sirve para datos discretos
 * (p. ej. el IMC) que no deben competir con las cifras principales.
 */
export default function InfoCard({
  title,
  action,
  rows,
  emptyText,
  footer,
  children,
}: {
  title: string;
  action?: ReactNode;
  rows?: [string, ReactNode][];
  emptyText?: string;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const visible = (rows ?? []).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      {children}
      {visible.length ? (
        <dl className="grid gap-x-4 gap-y-2.5 text-[13.5px] sm:grid-cols-2">
          {visible.map(([label, value]) => (
            <div key={label} className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="whitespace-pre-wrap font-medium text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : emptyText ? (
        <p className="text-[13px] text-muted-foreground">{emptyText}</p>
      ) : null}
      {footer}
    </Card>
  );
}
