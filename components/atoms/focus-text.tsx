"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/* --- FocusText: el texto entra letra por letra --------------------------- */
export function FocusText({
  text,
  className,
  delayMs = 14,
  as = "span",
}: {
  text: string;
  className?: string;
  delayMs?: number;
  as?: React.ElementType;
}) {
  const Tag = as as React.ElementType;
  const hostRef = useRef<HTMLElement>(null);
  const lastRef = useRef<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (lastRef.current === text) return;

    if (lastRef.current === null || reduce) {
      host.textContent = "";
      const line = document.createElement("span");
      line.className = cn("line", "in");
      text.split("").forEach((char, i) => {
        const span = document.createElement("span");
        span.className = "ch";
        span.textContent = char;
        if (!reduce) span.style.transitionDelay = `${i * delayMs}ms`;
        line.appendChild(span);
      });
      host.appendChild(line);
      lastRef.current = text;
      return;
    }

    lastRef.current = text;
    host.querySelectorAll(".line").forEach((old) => {
      old.classList.add("out");
      setTimeout(() => old.remove(), 320);
    });
    const line = document.createElement("span");
    line.className = "line";
    text.split("").forEach((char, i) => {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = char;
      span.style.transitionDelay = `${i * delayMs}ms`;
      line.appendChild(span);
    });
    host.appendChild(line);
    void line.offsetWidth;
    line.classList.add("in");
  }, [text, delayMs, reduce]);

  return (
    <Tag
      ref={hostRef}
      className={cn("nx-fx", className)}
    >
      <span className="sr-only">{text}</span>
    </Tag>
  );
}
