"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { useToast } from "@/components/molecules/toast";
import { DeleteBusinessDialog } from "@/components/organisms/delete-business-dialog";
import { deleteOwnBusinessAction } from "../actions";

/**
 * Zona de peligro del negocio: eliminar el negocio y todos sus datos.
 * Solo el dueño puede hacerlo y hay que confirmar escribiendo "eliminar".
 */
export default function DangerTab({ slug, canManage }: { slug: string; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  if (!canManage) {
    return (
      <p className="rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground">
        Solo el dueño del negocio puede eliminarlo.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-rose-200 bg-surface p-5">
        <h2 className="font-display text-[15px] font-semibold text-rose-800">Eliminar este negocio</h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Se borra el negocio y todo lo que tiene dentro: clientes, membresías, dinero (caja, pagos,
          facturas), asistencia, agenda, proyectos, tickets y tu equipo. No se puede deshacer.
        </p>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Las cuentas de tu equipo quedan libres: pueden entrar de nuevo y crear otro negocio.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(true)}
          className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-4 border-rose-300 text-rose-700 hover:bg-rose-50`}
        >
          <Trash2 aria-hidden="true" className="size-3.5" /> Eliminar negocio
        </button>
      </section>

      <DeleteBusinessDialog
        open={open}
        onClose={() => setOpen(false)}
        businessName="este negocio"
        onConfirm={(confirm) =>
          new Promise((resolve) => {
            start(async () => {
              const r = await deleteOwnBusinessAction(slug, confirm);
              if (r.status === "error") {
                toast({ title: "No se pudo eliminar", description: r.message, variant: "error" });
                resolve({ ok: false, message: r.message });
                return;
              }
              toast("Negocio eliminado", "success");
              resolve({ ok: true, total: r.total });
              router.push("/");
            });
          })
        }
      />
    </div>
  );
}
