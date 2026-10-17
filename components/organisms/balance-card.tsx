"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CountUp } from "@/components/atoms/count-up";
import { motionOff } from "@/lib/motion";

const cop = (n: number) => `${n < 0 ? "−" : ""}$ ${Math.round(Math.abs(n)).toLocaleString("es-CO")}`;

/**
 * Tarjeta de balance (Finanzas del artefacto): fondo tinta con dos franjas
 * oro inclinadas a 24°, el balance cuenta hasta su cifra, la barra divide
 * ingresos (oro) y gastos (grafito) y crece al aparecer, y abajo las
 * acciones de registrar. Siempre oscura, en ambos temas.
 */
export function BalanceCard({
  label,
  balance,
  income,
  expenses,
  actions,
}: {
  label: string;
  balance: number;
  income: number;
  expenses: number;
  actions?: ReactNode;
}) {
  const total = income + expenses || 1;
  const incomeRef = useRef<HTMLElement>(null);
  const expenseRef = useRef<HTMLElement>(null);
  const incomePct = `${((income / total) * 100).toFixed(1)}%`;
  const expensePct = `${((expenses / total) * 100).toFixed(1)}%`;

  useEffect(() => {
    const bars: [HTMLElement | null, string][] = [
      [incomeRef.current, incomePct],
      [expenseRef.current, expensePct],
    ];
    if (motionOff()) {
      bars.forEach(([el, w]) => el && (el.style.width = w));
      return;
    }
    bars.forEach(([el]) => el && (el.style.width = "0"));
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => bars.forEach(([el, w]) => el && (el.style.width = w))),
    );
    return () => cancelAnimationFrame(frame);
  }, [incomePct, expensePct]);

  return (
    <section className="relative isolate overflow-hidden rounded-lg bg-black p-[22px] text-[#F7F6F3]">
      <i aria-hidden="true" className="absolute -right-[30px] -top-10 -z-10 h-[260px] w-[150px] -skew-x-[24deg] bg-gradient-to-b from-[rgba(212,175,55,.32)] to-transparent" />
      <i aria-hidden="true" className="absolute -top-10 right-[70px] -z-10 h-[260px] w-[22px] -skew-x-[24deg] bg-[rgba(212,175,55,.18)]" />
      <p className="text-[12.5px] text-[#A1A1A8]">{label}</p>
      <p className="mb-3.5 mt-1.5 font-display text-[clamp(28px,6vw,40px)] font-bold leading-[1.1] tracking-[-0.02em] tabular-nums">
        <CountUp value={balance} format={cop} duration={1400} />
      </p>
      <div className="flex h-1.5 gap-[3px]" aria-hidden="true">
        <i ref={incomeRef} className="block h-full bg-[#D4AF37] transition-[width] duration-1000 ease-[var(--nx-ease-out)]" style={{ width: incomePct }} />
        <i ref={expenseRef} className="block h-full bg-[#3A3A40] transition-[width] duration-1000 ease-[var(--nx-ease-out)]" style={{ width: expensePct }} />
      </div>
      <div className="mt-2.5 flex justify-between gap-3 text-[12.5px] text-[#A1A1A8]">
        <span>
          Ingresos <b className="font-semibold text-[#F7F6F3] tabular-nums">{cop(income)}</b>
        </span>
        <span>
          Gastos <b className="font-semibold text-[#F7F6F3] tabular-nums">{cop(expenses)}</b>
        </span>
      </div>
      {actions ? <div className="mt-[18px] flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}
