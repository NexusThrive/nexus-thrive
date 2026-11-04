"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Vuelve a pedir al servidor los datos de la pantalla abierta cuando alguien
 * más los cambia (p. ej. un cliente que se registra desde el enlace público):
 * al volver a la pestaña y cada `everyMs` mientras está visible. No pinta nada
 * ni toca lo que la persona esté escribiendo (solo refresca los datos).
 */
export function LiveRefresh({ everyMs = 20_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, everyMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [router, everyMs]);
  return null;
}
