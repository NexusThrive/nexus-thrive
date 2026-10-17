"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/* --- 6 · Lista con revelado ---------------------------------------------- */
export function RevealRow({
  index = 0,
  children,
  className,
}: {
  index?: number;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.classList.add("in");
      return;
    }
    el.style.transitionDelay = `${index * 120}ms`;
    const raf = requestAnimationFrame(() => el.classList.add("in"));
    return () => cancelAnimationFrame(raf);
  }, [index, reduce]);

  return (
    <div ref={ref} className={cn("nx-row", className)}>
      {children}
    </div>
  );
}
