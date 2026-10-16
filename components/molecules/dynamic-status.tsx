"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { NMark } from "@/components/atoms/n-mark";
import { FocusText } from "@/components/atoms/focus-text";

/* --- 9 · Estado con texto dinámico --------------------------------------- */
export function DynamicStatus({
  messages,
  intervalMs = 1600,
  className,
}: {
  messages: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(
      () => setIndex((value) => (value + 1) % messages.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [messages.length, intervalMs]);

  return (
    <div
      className={cn("flex items-center gap-3", className)}
      role="status"
      aria-live="polite"
    >
      <NMark size={26} state="loop" />
      <FocusText
        text={messages[index] ?? messages[0] ?? ""}
        className="text-sm text-muted-foreground"
      />
    </div>
  );
}
