"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { useToast } from "@/components/molecules/toast";
import { cn } from "@/lib/utils";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Sin conexión (AVI·03): una franja tinta baja desde arriba con rebote y
 * avisa que se ven los últimos datos guardados; al volver la red, se va y
 * sale el aviso "Conexión recuperada". Va dentro de ToastProvider.
 */
export function NetworkBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const { toast } = useToast();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      toast("Conexión recuperada", "success");
    }
  }, [online, toast]);

  return (
    <div
      role="status"
      aria-hidden={online}
      className={cn(
        "fixed left-1/2 top-[calc(8px+env(safe-area-inset-top,0px))] z-(--z-banner) flex items-center gap-2.5 rounded-md bg-foreground px-3.5 py-2 text-[13px] text-background shadow-[var(--nx-shadow-overlay)] transition-transform duration-[420ms] ease-[cubic-bezier(.34,1.3,.64,1)]",
        online ? "-translate-x-1/2 -translate-y-[160%]" : "-translate-x-1/2 translate-y-0",
      )}
    >
      <WifiOff aria-hidden="true" className="size-4" />
      <span>Sin conexión. Mostramos los últimos datos guardados.</span>
    </div>
  );
}
