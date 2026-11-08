"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { GROUP_ICON_NAMES, GroupIcon, groupIconLabel } from "@/components/atoms/group-icon";
import { Input } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { cn } from "@/lib/utils";
import { assignGroupAction, createGroupAction, deleteGroupAction, updateGroupAction } from "../search-actions";

export type GroupOption = { id: string; name: string; icon: string; members: number };
const NEW = "__new";

/** Elige un icono del conjunto para el grupo (botones con nombre, operables con teclado). */
function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div role="group" aria-label="Icono del grupo" className="flex flex-wrap gap-1.5">
      {GROUP_ICON_NAMES.map((icon) => (
        <button
          key={icon}
          type="button"
          aria-pressed={value === icon}
          aria-label={groupIconLabel(icon)}
          onClick={() => onChange(icon)}
          className={cn(
            "grid size-9 place-items-center rounded-md border outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:size-11",
            value === icon ? "border-accent bg-accent-subtle text-accent-text" : "border-border text-muted-foreground hover:bg-surface-muted",
          )}
        >
          <GroupIcon name={icon} className="size-4" />
        </button>
      ))}
    </div>
  );
}

/** Agregar los clientes seleccionados a un grupo (o crear uno nuevo con ellos), o sacarlos de un grupo. */
export function AssignGroupDialog({
  open,
  onOpenChange,
  tenantSlug,
  groups,
  customerIds,
  mode,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  groups: GroupOption[];
  customerIds: string[];
  mode: "add" | "remove";
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [choice, setChoice] = useState(groups[0]?.id ?? NEW);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>("users");
  const creating = mode === "add" && (choice === NEW || groups.length === 0);
  const count = customerIds.length;
  const noun = count === 1 ? "cliente" : "clientes";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "add" ? "Agregar a un grupo" : "Quitar de un grupo"}
      description={`${count} ${noun} ${count === 1 ? "seleccionado" : "seleccionados"}.`}
      submitLabel={creating ? "Crear grupo" : mode === "add" ? "Agregar" : "Quitar"}
      onSubmit={async () => {
        if (creating) {
          const result = await createGroupAction(tenantSlug, name, icon, customerIds);
          if (!result.ok) return { ok: false, message: result.message, fieldErrors: { nombre: result.message } };
          toast(`Grupo «${name.trim()}» creado con ${count} ${noun}.`, "success");
        } else {
          const group = groups.find((g) => g.id === choice) ?? groups[0];
          if (!group) return { ok: false, message: "Elige un grupo." };
          const result = await assignGroupAction(tenantSlug, group.id, customerIds, mode);
          if (!result.ok) return { ok: false, message: result.message };
          toast(mode === "add" ? `${count} ${noun} en «${group.name}».` : `${count} ${noun} fuera de «${group.name}».`, "success");
        }
        onDone();
        setName("");
      }}
    >
      {({ fieldErrors }) => (
        <>
          {groups.length > 0 ? (
            <Field label="Grupo">
              {(c) => (
                <Select {...c} value={creating ? NEW : choice} onChange={(e) => setChoice(e.target.value)}>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{`${g.name} (${g.members})`}</option>
                  ))}
                  {mode === "add" ? <option value={NEW}>Crear grupo nuevo…</option> : null}
                </Select>
              )}
            </Field>
          ) : mode === "remove" ? (
            <Alert tone="info">Aún no hay grupos propios. Crea uno desde «Agregar a un grupo».</Alert>
          ) : null}
          {creating ? (
            <>
              <Field label="Nombre del grupo" required error={fieldErrors.nombre}>
                {(c) => <Input {...c} name="nombre" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}
              </Field>
              <div>
                <p className="mb-2 text-ui font-medium text-foreground">Icono</p>
                <IconPicker value={icon} onChange={setIcon} />
              </div>
            </>
          ) : null}
        </>
      )}
    </FormDialog>
  );
}

/** Ver, renombrar, cambiar el icono y eliminar los grupos propios. Eliminar un grupo no elimina a sus clientes. */
export function ManageGroupsSheet({
  open,
  onOpenChange,
  tenantSlug,
  groups,
  canDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  groups: GroupOption[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<GroupOption | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("users");
  const [error, setError] = useState<string | null>(null);

  const begin = (group: GroupOption) => {
    setEditing(group);
    setName(group.name);
    setIcon(group.icon);
    setError(null);
  };
  const save = () =>
    startTransition(async () => {
      if (!editing) return;
      const result = await updateGroupAction(tenantSlug, editing.id, name, icon);
      if (!result.ok) return setError(result.message);
      toast("Grupo actualizado.", "success");
      setEditing(null);
      router.refresh();
    });
  const remove = async (group: GroupOption) => {
    const yes = await confirm({
      title: "Eliminar grupo",
      description: `«${group.name}» dejará de existir. Sus ${group.members} clientes no se eliminan, solo salen del grupo.`,
      confirmLabel: "Eliminar grupo",
      tone: "danger",
    });
    if (!yes) return;
    const result = await deleteGroupAction(tenantSlug, group.id);
    toast(result.ok ? "Grupo eliminado." : result.message, result.ok ? "success" : "error");
    if (result.ok) router.refresh();
  };

  return (
    <>
      <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Mis grupos" description="Grupos que armas a mano para agrupar y filtrar a tus clientes.">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no tienes grupos. Selecciona clientes y elige «Agregar a un grupo» para crear el primero.</p>
        ) : (
          <ul className="divide-y divide-border">
            {groups.map((group) =>
              editing?.id === group.id ? (
                <li key={group.id} className="grid gap-3 py-3">
                  {error ? <Alert tone="danger">{error}</Alert> : null}
                  <Field label="Nombre">{(c) => <Input {...c} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}</Field>
                  <IconPicker value={icon} onChange={setIcon} />
                  <div className="flex gap-2">
                    <Button type="button" loading={pending} loadingText="Guardando…" onClick={save}>Guardar</Button>
                    <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                  </div>
                </li>
              ) : (
                <li key={group.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-8 place-items-center rounded-md bg-accent-subtle text-accent-text"><GroupIcon name={group.icon} className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm font-medium">{group.name}</b>
                    <small className="text-xs text-muted-foreground">{group.members} {group.members === 1 ? "cliente" : "clientes"}</small>
                  </span>
                  <button type="button" aria-label={`Editar ${group.name}`} onClick={() => begin(group)} className="grid size-9 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11">
                    <Pencil aria-hidden="true" className="size-4" />
                  </button>
                  {canDelete ? (
                    <button type="button" aria-label={`Eliminar ${group.name}`} onClick={() => void remove(group)} className="grid size-9 place-items-center rounded-md text-danger outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11">
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        )}
      </ResponsiveSheet>
      {confirmDialog}
    </>
  );
}
