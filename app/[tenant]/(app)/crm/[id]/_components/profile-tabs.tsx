import Link from "next/link";
import { cn } from "@/lib/cn";

export type ProfileTabKey = "resumen" | "pagos" | "membresias" | "notas";

export type ProfileTab = {
  key: ProfileTabKey;
  label: string;
};

/**
 * Pestañas de la ficha 360° (Server Component, sin estado client):
 * la URL es la fuente de verdad (`?tab=`), igual que en el CRM.
 * Links navegan con cliente-side de Next; nada de pestañas falsas.
 */
export default function ProfileTabs({
  baseHref,
  tabs,
  activeTab,
}: {
  baseHref: string;
  tabs: ProfileTab[];
  activeTab: ProfileTabKey;
}) {
  return (
    <nav
      aria-label="Secciones de la ficha"
      className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={`${baseHref}?tab=${tab.key}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}