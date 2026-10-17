"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { PERMISSION_GROUPS, type PermissionKey } from "@/lib/ops/permissions";
import type { RoleRow } from "@/lib/ops/team";
import { cn } from "@/lib/utils";
import { saveRoleAction } from "../actions";

/**
 * Constructor de roles: permisos agrupados (Comercial, Negocios, Finanzas,
 * Soporte, Administración) con conteo en vivo. Solo se pueden marcar los
 * permisos que tiene quien edita; el servidor lo vuelve a verificar.
 */
export default function RoleBuilder({
  open,
  onOpenChange,
  role,
  editorPermissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleRow | null;
  editorPermissions: PermissionKey[];
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const locked = role?.key === "owner";

  const toggle = (p: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const save = () =>
    start(async () => {
      const r = await saveRoleAction({ id: role?.id, name, description, permissions: [...selected] });
      if (r.ok) {
        toast(role ? "Rol actualizado" : "Rol creado", "success");
        onOpenChange(false);
        router.refresh();
      } else {
        setErrors(r.errors ?? {});
        setMessage(r.message);
      }
    });

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={role ? `Rol · ${role.name}` : "Nuevo rol"}
      description={locked ? "El Propietario siempre tiene todos los permisos." : "Marca lo que este rol puede hacer. Cada permiso se verifica en el servidor."}
      footer={
        locked ? (
          <button type="button" onClick={() => onOpenChange(false)} className={buttonVariants()}>
            Cerrar
          </button>
        ) : (
          <>
            <span className="mr-auto self-center font-mono text-xs text-muted-foreground">{selected.size} permisos</span>
            <button type="button" onClick={() => setSelected(new Set())} className={buttonVariants({ variant: "ghost" })}>
              Limpiar
            </button>
            <button type="button" disabled={pending} onClick={save} className={buttonVariants()}>
              {pending ? "Guardando…" : role ? "Guardar rol" : "Crear rol"}
            </button>
          </>
        )
      }
    >
      <div className="grid grid-cols-1 gap-4">
        {!locked ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre del rol" required error={errors.name}>
              {(c) => <input {...c} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Soporte nivel 2" className={inputClasses} />}
            </Field>
            <Field label="Descripción" error={errors.description}>
              {(c) => <textarea {...c} rows={1} value={description} onChange={(e) => setDescription(e.target.value)} className={cn(textareaClasses, "min-h-[var(--control-h)]")} />}
            </Field>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PERMISSION_GROUPS.map((g) => (
            <fieldset key={g.key} className="min-w-0 rounded-md border border-border p-3.5">
              <legend className="px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{g.label}</legend>
              <div className="grid gap-2">
                {g.permissions.map((p) => {
                  const allowed = editorPermissions.includes(p.key);
                  const id = `perm-${p.key}`;
                  return (
                    <label key={p.key} htmlFor={id} className={cn("flex items-center gap-2.5 text-[13.5px]", (!allowed || locked) && "opacity-50")}>
                      <input
                        id={id}
                        type="checkbox"
                        checked={selected.has(p.key)}
                        disabled={!allowed || locked}
                        onChange={() => toggle(p.key)}
                        className="size-4 accent-[var(--foreground)]"
                      />
                      <span className="min-w-0 flex-1">{p.label}</span>
                      <code className="hidden font-mono text-[10.5px] text-muted-foreground sm:inline">{p.key}</code>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        {errors.permissions ? <Alert tone="danger">{errors.permissions}</Alert> : null}
        {message && !errors.permissions ? <Alert tone="danger">{message}</Alert> : null}
      </div>
    </ResponsiveSheet>
  );
}
