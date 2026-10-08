"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export type QuotesTab = "quotes" | "activities" | "items";

/**
 * Navegación por pestañas del módulo Construcción & APU. La URL es la
 * fuente de verdad (`?tab=`): cada pestaña re-renderiza en el servidor
 * con los datos frescos de esa sección.
 */
export default function QuotesWorkspace({
  activeTab,
  tabs,
  children,
}: {
  activeTab: QuotesTab;
  tabs: { value: QuotesTab; label: string }[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const navigate = (next: QuotesTab) => {
    if (next === activeTab) {
      return;
    }
    startTransition(() => {
      router.push(`${pathname}?tab=${next}`, { scroll: false });
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => navigate(tab.value)}
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition",
              activeTab === tab.value
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
            )}
          >
            {tab.label}
          </button>
        ))}
        {isPending ? (
          <span className="ml-2 self-center text-xs text-slate-400">
            Cargando…
          </span>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}