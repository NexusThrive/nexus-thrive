"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { createImpersonationAction } from "../actions";

/**
 * Entrar como el negocio (impersonación auditada): pide el ticket al
 * servidor (permiso accounts.impersonate), cambia la sesión de Clerk y
 * navega al panel del negocio.
 */
export function useImpersonate() {
  const { signIn } = useSignIn();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const impersonate = async (tenantId: string) => {
    setPending(true);
    setError(null);
    try {
      const result = await createImpersonationAction(tenantId);
      if (result.status !== "ok" || !result.ticket) {
        setError(result.message ?? "No se pudo entrar como el negocio.");
        return;
      }
      const attempt = await signIn.ticket({ ticket: result.ticket });
      if (attempt.error) {
        setError(attempt.error.longMessage ?? attempt.error.message ?? "No se pudo validar el acceso.");
        return;
      }
      const target = result.url ?? "/";
      const done = await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          window.location.assign(decorateUrl(target));
        },
      });
      if (done.error) setError(done.error.longMessage ?? done.error.message ?? "No se pudo completar el cambio de sesión.");
    } catch (e) {
      console.error("[ops] impersonate:", e);
      setError("No se pudo iniciar el acceso.");
    } finally {
      setPending(false);
    }
  };

  return { impersonate, pending, error };
}
