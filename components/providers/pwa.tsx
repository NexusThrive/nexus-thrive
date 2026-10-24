"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/atoms/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaContextValue = {
  /** El navegador ofrece instalar (Chromium). Safari/iOS no emite este evento. */
  canInstall: boolean;
  install: () => Promise<void>;
};

const PwaContext = createContext<PwaContextValue>({ canInstall: false, install: async () => {} });

/** Instalar NEXUS: `canInstall` es falso donde el navegador no lo permite. */
export function usePwa(): PwaContextValue {
  return useContext(PwaContext);
}

/**
 * Registra el service worker (solo en producción y con HTTPS o localhost),
 * guarda el evento de instalación para ofrecerlo cuando la persona lo pida y
 * avisa cuando hay una versión nueva. La actualización nunca se aplica sola:
 * recargar a mitad de un formulario perdería lo escrito.
 */
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const installEvent = useRef<InstallPromptEvent | null>(null);
  const updateRequested = useRef(false);
  const [canInstall, setCanInstall] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      installEvent.current = event as InstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      installEvent.current = null;
      setCanInstall(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // Solo recarga si la persona pidió actualizar (hubo un worker en espera).
    const onControllerChange = () => {
      if (!updateRequested.current) return;
      updateRequested.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
          });
        });
      })
      .catch(() => {
        /* sin service worker la app funciona igual; solo no se instala */
      });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  const install = useCallback(async () => {
    const event = installEvent.current;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    installEvent.current = null;
    setCanInstall(false);
  }, []);

  const applyUpdate = () => {
    updateRequested.current = true;
    waiting?.postMessage({ type: "SKIP_WAITING" });
  };

  const value = useMemo(() => ({ canInstall, install }), [canInstall, install]);

  return (
    <PwaContext.Provider value={value}>
      {children}
      {waiting ? <UpdateNotice onUpdate={applyUpdate} onDismiss={() => setWaiting(null)} /> : null}
    </PwaContext.Provider>
  );
}

/** Aviso persistente (no se va solo): hay una versión nueva. */
export function UpdateNotice({ onUpdate, onDismiss }: { onUpdate: () => void; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-(--z-banner) mx-auto flex max-w-md items-center gap-3 rounded-md border border-border bg-surface px-3.5 py-3 text-[13px] shadow-[var(--nx-shadow-overlay)] md:bottom-5 md:left-auto md:right-5 md:mx-0"
    >
      <RefreshCw aria-hidden="true" className="size-4 shrink-0 text-accent-text" />
      <span className="flex-1">Hay una versión nueva de NEXUS.</span>
      <Button size="sm" onClick={onUpdate}>Actualizar</Button>
      <Button size="sm" variant="ghost" onClick={onDismiss}>Luego</Button>
    </div>
  );
}
