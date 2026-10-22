"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { useToast } from "@/components/molecules/toast";
import { DeleteBusinessDialog } from "@/components/organisms/delete-business-dialog";
import { deleteBusinessAction } from "../../../negocios/actions";

/**
 * Botón de borrado de raíz en la ficha del negocio (Operations Center).
 * Pide confirmar escribiendo "eliminar"; el servidor lo comprueba.
 */
export function DeleteBusinessControl({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  return (
    <>
      <p className="text-[13px] font-medium text-foreground">Zona de peligro</p>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        Borrar el negocio y todo lo que tiene dentro (clientes, membresías, dinero, asistencia,
        proyectos, tickets). No se puede deshacer.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3 border-rose-300 text-rose-700 hover:bg-rose-50`}
      >
        <Trash2 aria-hidden="true" className="size-3.5" /> Eliminar negocio
      </button>

      <DeleteBusinessDialog
        open={open}
        onClose={() => setOpen(false)}
        businessName={tenantName}
        onConfirm={(confirm) =>
          new Promise((resolve) => {
            start(async () => {
              const r = await deleteBusinessAction(tenantId, confirm);
              if (!r.ok) {
                toast({ title: "No se pudo eliminar", description: r.message, variant: "error" });
                resolve({ ok: false, message: r.message });
                return;
              }
              toast("Negocio eliminado", "success");
              resolve({ ok: true, total: r.total });
              router.push("/admin/negocios");
            });
          })
        }
      />
    </>
  );
}
