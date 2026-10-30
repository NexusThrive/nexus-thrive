"use client";

import { useEffect } from "react";
import { SplashIntro } from "./splash-intro";

/** Cookie de sesión del navegador: existe mientras ya se vio la intro de esta sesión. */
export const SPLASH_COOKIE = "nx-splash";

/**
 * Intro de la N, solo para la entrada a la app tras iniciar sesión. El servidor
 * decide si se monta (no hay cookie); al terminar, marca la sesión como vista
 * y no vuelve a salir al navegar, recargar ni abrir recibos o enlaces públicos.
 * Cualquier otra espera usa su propio estado de carga (`PageSkeleton`,
 * `SkeletonRows`, `LoadingState`).
 */
export function AppEntrySplash() {
  return <SplashIntro onDone={() => void (document.cookie = `${SPLASH_COOKIE}=1; path=/; SameSite=Lax`)} />;
}

/** En inicio y registro: la próxima entrada a la app vuelve a mostrar la intro. */
export function SplashReset() {
  useEffect(() => {
    document.cookie = `${SPLASH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }, []);
  return null;
}
