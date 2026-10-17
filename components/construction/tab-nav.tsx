"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Pestañas con la URL como fuente de verdad (`?tab=`): cada pestaña se
 * re-renderiza en el servidor con sus datos. Al cambiar de pestaña se limpian
 * los filtros de la anterior.
 */
export default function TabNav<T extends string>({
  activeTab,
  tabs,
  children,
}: {
  activeTab: T;
  tabs: { value: T; label: string; count?: number }[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const navigate = (next: T) => {
    if (next === activeTab) return;
    const params = new URLSearchParams();
    params.set("tab", next);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => navigate(tab.value)}
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition",
              activeTab === tab.value
                ? "border-accent text-accent-text"
                : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground/80",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
        {isPending ? (
          <span className="ml-2 self-center text-xs text-muted-foreground">Cargando…</span>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
