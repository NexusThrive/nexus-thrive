import {
  MODULE_LABELS,
  type ModuleValue,
} from "@/lib/admin-catalogs";

/**
 * Badges de los módulos ACTIVOS de un negocio (ya vienen filtrados y en
 * orden del catálogo desde el servidor). Sin módulos → guion.
 */
export default function TenantModuleBadges({
  modules,
}: {
  modules: ModuleValue[];
}) {
  if (modules.length === 0) {
    return <span className="text-slate-300">—</span>;
  }

  return (
    <span className="flex flex-wrap gap-1">
      {modules.map((moduleName) => (
        <span
          key={moduleName}
          className="inline-flex items-center whitespace-nowrap rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20"
        >
          {MODULE_LABELS[moduleName]}
        </span>
      ))}
    </span>
  );
}
