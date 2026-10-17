"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@nexus/brand/BrandLogo";
import { NMark } from "@/components/atoms/n-mark";
import { burst, motionOff } from "@/lib/motion";

export type ReceiptLine = { label: string; value: string };

export type ReceiptData = {
  business: string;
  /** Ciudad u otra línea bajo el nombre del negocio. */
  subtitle?: string;
  /** Quién paga y por qué (pantalla de la máquina). */
  client: string;
  concept: string;
  total: string;
  /** Detalle del papel (concepto, impuestos…), antes del total. */
  lines?: ReceiptLine[];
  /** Pie del papel (recibo, cliente, medio, fecha). */
  meta: ReceiptLine[];
};

/** Borde inferior en dientes de sierra de 6 px (24 dientes). */
const SAWTOOTH = `polygon(0 0,100% 0,100% calc(100% - 6px)${Array.from({ length: 24 }, (_, i) => {
  const x = 100 - ((i + 1) * 100) / 24;
  return `,${(x + 100 / 48).toFixed(2)}% 100%,${x.toFixed(2)}% calc(100% - 6px)`;
}).join("")})`;

/** Duración del papel: 1,6 s en 10 tirones (como una térmica). */
const PRINT_MS = 1600;

/**
 * Impresora de recibos (FLU·01 del artefacto). La máquina negra muestra a
 * quién se cobra; el papel blanco sale por la ranura a tirones (`steps(10)`)
 * con borde dentado. Al terminar, la N se rellena, el estado pasa a "Pago
 * registrado" y saltan cortes dorados desde el papel. Imprime al montar;
 * cambia `printKey` para volver a imprimir.
 */
export function ReceiptPrinter({
  data,
  printKey = 0,
  onPrinted,
  className,
}: {
  data: ReceiptData;
  printKey?: number | string;
  onPrinted?: () => void;
  className?: string;
}) {
  const outRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const onPrintedRef = useRef(onPrinted);
  useEffect(() => {
    onPrintedRef.current = onPrinted;
  });

  useEffect(() => {
    const out = outRef.current;
    const paper = paperRef.current;
    if (!out || !paper) return;
    const instant = motionOff();
    out.style.transition = "none";
    out.style.height = "0px";
    void out.offsetHeight;
    out.style.transition = instant ? "none" : `height ${PRINT_MS}ms steps(10,end)`;
    const frame = requestAnimationFrame(() => {
      out.style.height = `${paper.offsetHeight}px`;
    });
    const timer = window.setTimeout(
      () => {
        setDone(true);
        const r = out.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + 40, 30);
        onPrintedRef.current?.();
      },
      instant ? 50 : PRINT_MS + 150,
    );
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      setDone(false);
    };
  }, [printKey]);

  return (
    <div className={`relative mx-auto flex w-full max-w-[340px] flex-col items-center ${className ?? ""}`}>
      <div className="relative z-[2] w-full rounded-lg border border-[#2A2A2E] bg-black px-3 pb-7 pt-3 text-[#F7F6F3]">
        <p role="status" className="flex h-[22px] items-center gap-2 text-xs text-[#A1A1A8]">
          <NMark size={18} state={done ? "done" : "loop"} className="text-[#F7F6F3]" />
          {done ? "Pago registrado" : "Imprimiendo comprobante"}
        </p>
        <div className="mt-2 flex items-end justify-between gap-2.5 rounded-md border border-[#2A2A2E] bg-[#0A0A0B] p-3">
          <div className="min-w-0 text-xs text-[#A1A1A8]">
            <p className="truncate">{data.client}</p>
            <p className="truncate">{data.concept}</p>
          </div>
          <b className="font-display text-xl font-bold tabular-nums">{data.total}</b>
        </div>
        <i aria-hidden="true" className="absolute inset-x-[22px] bottom-2.5 h-[7px] rounded-[2px] border border-[#3A3A40] bg-black" />
      </div>
      <div ref={outRef} className="relative z-[3] -mt-3.5 h-0 w-[calc(100%-36px)] overflow-hidden">
        <div
          ref={paperRef}
          style={{ clipPath: SAWTOOTH }}
          className="bg-white px-4 pb-6 pt-[18px] font-mono text-[11.5px] leading-[1.55] text-[#0A0A0B]"
        >
          <div className="text-center">
            <BrandLogo variant="lockup" size={48} className="mx-auto text-[#0A0A0B]" />
            <p className="mt-2 font-display text-[13px] font-semibold">Comprobante de pago</p>
            <p className="text-[#6B6B73]">{[data.business, data.subtitle].filter(Boolean).join(" · ")}</p>
          </div>
          <hr className="my-2.5 border-0 border-t border-dashed border-[#A1A1A8]" />
          {(data.lines ?? [{ label: data.concept, value: data.total }]).map((line) => (
            <p key={line.label} className="flex justify-between gap-2.5 tabular-nums">
              <span className="min-w-0 truncate">{line.label}</span>
              <span>{line.value}</span>
            </p>
          ))}
          <p className="mt-1.5 flex items-center justify-between font-display text-[17px] font-bold">
            <span className="flex items-center gap-[7px]">
              <i aria-hidden="true" className="inline-block h-[13px] w-[3px] -skew-x-[24deg] bg-[#D4AF37]" />
              Total
            </span>
            <span className="tabular-nums">{data.total}</span>
          </p>
          <hr className="my-2.5 border-0 border-t border-dashed border-[#A1A1A8]" />
          {data.meta.map((line) => (
            <p key={line.label} className="flex justify-between gap-2.5 tabular-nums">
              <span>{line.label}</span>
              <span className="min-w-0 truncate text-right">{line.value}</span>
            </p>
          ))}
          <hr className="my-2.5 border-0 border-t border-dashed border-[#A1A1A8]" />
          <p className="text-center text-[#6B6B73]">Gracias por tu pago</p>
        </div>
      </div>
    </div>
  );
}
