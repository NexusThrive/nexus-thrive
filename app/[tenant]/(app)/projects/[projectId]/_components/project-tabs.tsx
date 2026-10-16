"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { PROJECT_TABS, type ProjectTab } from "@/lib/projects";

/**
 * Navegación por pestañas del contenedor de proyecto (XI.00). La URL es la
 * fuente de verdad (`?tab=`): cada pestaña re-renderiza en el servidor con
 * los datos frescos. FASE 1: solo `ficha` tiene contenido.
 */
export default function ProjectTabs({
  activeTab,
  children,
}: {
  activeTab: ProjectTab;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigate = (next: ProjectTab) => {
    if (next === activeTab) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {PROJECT_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => navigate(tab.value)}
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition",
              activeTab === tab.value
                ? "border-accent text-accent-text"
                : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground/80",
            )}
          >
            {tab.label}
          </button>
        ))}
        {isPending ? (
          <span className="ml-2 self-center text-xs text-muted-foreground">
            Cargando…
          </span>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}