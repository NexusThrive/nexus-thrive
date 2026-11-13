"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { GroupIcon } from "@/components/atoms/group-icon";
import { useToast } from "@/components/molecules/toast";
import { assignGroupAction } from "@/app/[tenant]/(app)/contactos/search-actions";
import { AssignGroupDialog, type GroupOption } from "../../../_components/customer-group-dialogs";

/** Los grupos propios del cliente en su ficha: se ven con su icono, se quitan con «×» y se agrega a otro con «+ Grupo». */
export default function FichaGroups({
  tenantSlug,
  customerId,
  customerName,
  current,
  options,
  part = "all",
  addClassName,
}: {
  tenantSlug: string;
  customerId: string;
  customerName: string;
  current: { id: string; name: string; icon: string }[];
  options: GroupOption[];
  /** `chips`: solo los grupos del cliente; `add`: solo el botón «Grupo» (con su diálogo); `all`: ambos, como antes. */
  part?: "all" | "chips" | "add";
  /** Clases del botón «Grupo» cuando se pinta solo (`part="add"`). */
  addClassName?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // Para agregar solo se ofrecen los grupos a los que aún no pertenece.
  const available = options.filter((g) => !current.some((c) => c.id === g.id));

  const remove = (groupId: string, name: string) =>
    startTransition(async () => {
      const result = await assignGroupAction(tenantSlug, groupId, [customerId], "remove");
      toast(result.ok ? `${customerName} salió de «${name}».` : result.message, result.ok ? "success" : "error");
      if (result.ok) router.refresh();
    });

  const chips = (
    <>
      {current.map((g) => (
        <span key={g.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted py-1 pe-1.5 ps-3 text-xs text-foreground">
          <span className="text-accent-text"><GroupIcon name={g.icon} className="size-3" /></span>
          {g.name}
          <button
            type="button"
            disabled={pending}
            aria-label={`Quitar de ${g.name}`}
            onClick={() => remove(g.id, g.name)}
            className="grid size-4 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 pointer-coarse:size-6"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        </span>
      ))}
    </>
  );
  const add = (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={addClassName ?? "inline-flex items-center gap-1 text-xs font-medium text-accent-text underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring"}
      >
        <Plus aria-hidden="true" className={addClassName ? "size-4" : "size-3"} /> Grupo
      </button>
      <AssignGroupDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        groups={available}
        customerIds={[customerId]}
        mode="add"
        onDone={() => router.refresh()}
      />
    </>
  );
  if (part === "chips") return current.length ? <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Grupos">{chips}</div> : null;
  if (part === "add") return add;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Grupos">
      {chips}
      {add}
    </div>
  );
}
