"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Select } from "@/components/atoms/select";

/** Filtros de la auditoría en la URL (acción e integrante). */
export default function AuditFilters({
  action,
  actor,
  actions,
  actors,
}: {
  action: string;
  actor: string;
  actions: { value: string; label: string }[];
  actors: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const set = (key: string, value: string) => {
    const q = new URLSearchParams(sp);
    if (value) q.set(key, value);
    else q.delete(key);
    q.delete("pagina");
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Select aria-label="Filtrar por acción" value={action} onChange={(e) => set("accion", e.target.value)} className="w-auto min-w-52">
        <option value="">Todas las acciones</option>
        {actions.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </Select>
      <Select aria-label="Filtrar por integrante" value={actor} onChange={(e) => set("integrante", e.target.value)} className="w-auto min-w-52">
        <option value="">Todo el equipo</option>
        {actors.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
