import Link from "next/link";
import { cn } from "@/lib/cn";

export type ProfileTabKey = "resumen" | "pagos" | "membresias" | "notas";

export type ProfileTab = {
  key: ProfileTabKey;
  label: string;
};

/**
 * Pestañas de la ficha 360° (Server Component): la URL es la fuente de verdad
 * (`?tab=`). Mismo estilo que las pestañas de la obra: subrayado oro en la
 * activa y desplazamiento horizontal en el celular.
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
    <nav aria-label="Secciones de la ficha" className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={`${baseHref}?tab=${tab.key}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
