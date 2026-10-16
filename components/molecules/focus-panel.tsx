import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NMark } from "@/components/atoms/n-mark";
import { FocusText } from "@/components/atoms/focus-text";

/* --- 5 · Panel que enfoca ------------------------------------------------- */
export function FocusPanel({
  loading,
  label = "Cargando datos",
  children,
  className,
}: {
  loading: boolean;
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("nx-pf relative", loading && "ld", className)}>
      <div className="cont">{children}</div>
      <div className="ov" aria-hidden={!loading}>
        {loading && (
          <>
            <NMark size={40} state="loop" />
            <FocusText text={label} className="text-sm text-muted-foreground" />
          </>
        )}
      </div>
    </div>
  );
}
