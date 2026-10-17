"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Power } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { NMark } from "@/components/atoms/n-mark";
import { Alert } from "@/components/molecules/alert";
import { useToast } from "@/components/molecules/toast";
import { activateTenantAction } from "../../../actions";
import SuspendDialog from "../../../_components/suspend-dialog";
import { useImpersonate } from "../../../_components/use-impersonate";

/**
 * Estado del servicio y acceso: suspender con motivo o reactivar
 * (accounts.suspend) y entrar como el negocio (accounts.impersonate). Las
 * dos acciones quedan en la auditoría.
 */
export default function ServiceControls({
  tenantId,
  tenantName,
  active,
  canSuspend,
  canImpersonate,
  hasUsers,
}: {
  tenantId: string;
  tenantName: string;
  active: boolean;
  canSuspend: boolean;
  canImpersonate: boolean;
  hasUsers: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const { impersonate, pending: entering, error } = useImpersonate();

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {canSuspend ? (
          active ? (
            <SuspendDialog tenantId={tenantId} tenantName={tenantName} onSuspended={() => router.refresh()} />
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const fd = new FormData();
                  fd.set("tenantId", tenantId);
                  const r = await activateTenantAction({ status: "idle" }, fd);
                  if (r.status === "ok") {
                    toast("Negocio reactivado", "success");
                    router.refresh();
                  } else toast({ title: "No se pudo reactivar", description: r.message, variant: "error" });
                })
              }
              className={buttonVariants({ variant: "primary" })}
            >
              {pending ? <NMark size={16} state="loop" className="text-current" /> : <Power aria-hidden="true" className="size-4" />}
              Reactivar negocio
            </button>
          )
        ) : null}
        {canImpersonate ? (
          <button type="button" disabled={entering || !hasUsers} onClick={() => impersonate(tenantId)} className={buttonVariants({ variant: "outline" })}>
            {entering ? <NMark size={16} state="loop" className="text-current" /> : <LogIn aria-hidden="true" className="size-4" />}
            Entrar como el negocio
          </button>
        ) : null}
      </div>
      {!hasUsers && canImpersonate ? <p className="text-xs text-muted-foreground">El negocio aún no tiene usuarios para entrar como él.</p> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
