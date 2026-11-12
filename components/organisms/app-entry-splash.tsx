"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { clearSections } from "@/lib/experience/hooks/section-cache";
import { SplashIntro } from "./splash-intro";

/** Cookie de sesión del navegador: existe mientras ya se vio la intro de esta sesión. */
export const SPLASH_COOKIE = "nx-splash";

/**
 * Intro de la N, solo para la entrada a la app tras iniciar sesión. El servidor decide si se monta (no hay cookie). La cookie se escribe
 * **al montar**, no al terminar: así recargar en mitad de la animación (puede durar hasta 9 s) no la repite. `show` se fija en el primer
 * render: un `router.refresh()` que vuelva a leer la cookie ya escrita no la retira a medias; se va sola al terminar. No vuelve a salir al
 * navegar, recargar ni abrir recibos o enlaces públicos. Cualquier otra espera usa su propio estado de carga (`PageSkeleton`,
 * `SkeletonRows`, `LoadingState`).
 */
export function AppEntrySplash({ show }: { show: boolean }) {
  const [active] = useState(show);
  useLayoutEffect(() => {
    if (active) document.cookie = `${SPLASH_COOKIE}=1; path=/; SameSite=Lax`;
  }, [active]);
  return active ? <SplashIntro /> : null;
}

/**
 * En inicio y registro: la próxima entrada a la app vuelve a mostrar la intro, y se vacía la caché de secciones de la sesión anterior para
 * que otra persona en el mismo navegador nunca vea datos ajenos. No llama a `router.refresh()`: en estas pantallas Clerk redirige a quien
 * ya tiene sesión y un refresco aquí puede encadenarse con esa redirección y dejar la página recargando.
 */
export function SplashReset() {
  useEffect(() => {
    document.cookie = `${SPLASH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    clearSections();
  }, []);
  return null;
}
