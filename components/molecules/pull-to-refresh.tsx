"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { NMark } from "@/components/atoms/n-mark";
import { useToast } from "@/components/molecules/toast";
import { motionOff } from "@/lib/motion";

/** Arrastre necesario para actualizar (px). */
const THRESHOLD = 170;

/**
 * Deslizar para actualizar (CAR·09), solo táctil y con la página arriba del
 * todo: la N se dibuja según la distancia (resistencia 0,45) y, al soltar
 * pasado el umbral, gira mientras el servidor vuelve a calcular la página
 * (router.refresh). Termina con el aviso "Datos actualizados".
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pull, setPull] = useState(0);
  const [pending, startTransition] = useTransition();
  const [waiting, setWaiting] = useState(false);
  // El server no conoce `motionOff()` (sin window): tras montar recién se
  // habilita la transición real para que el primer render coincida con el HTML.
  const [ready, setReady] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (waiting || window.scrollY > 0 || e.touches.length > 1) return;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      if (window.scrollY <= 0 && e.cancelable) e.preventDefault();
      pullRef.current = dy;
      setPull(dy);
    };
    const onEnd = () => {
      if (startY.current == null) return;
      startY.current = null;
      const reached = pullRef.current >= THRESHOLD;
      pullRef.current = 0;
      setPull(0);
      if (!reached) return;
      setWaiting(true);
      startTransition(() => router.refresh());
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [router, waiting]);

  // Terminó la actualización: se cierra y avisa.
  const wasPending = useRef(false);
  useEffect(() => {
    if (pending) wasPending.current = true;
    else if (wasPending.current && waiting) {
      wasPending.current = false;
      const t = window.setTimeout(() => {
        setWaiting(false);
        toast({ title: "Datos actualizados", description: "Hace un momento", variant: "success" });
      }, 350);
      return () => window.clearTimeout(t);
    }
  }, [pending, waiting, toast]);

  const progress = Math.min(1, pull / THRESHOLD);
  const height = waiting ? 56 : Math.min(84, pull * 0.45);

  return (
    <>
      <div
        aria-hidden={!waiting}
        className="flex items-center justify-center gap-2.5 overflow-hidden text-[12.5px] text-muted-foreground md:hidden"
        style={{
          height: `${height}px`,
          transition: !ready || pull || motionOff() ? "none" : "height .3s var(--nx-ease-out)",
        }}
      >
        {waiting ? (
          <>
            <NMark size={26} state="loop" />
            <span role="status">Actualizando…</span>
          </>
        ) : pull > 0 ? (
          <>
            <NMark size={26} state="prog" progress={progress} />
            <span>{progress >= 1 ? "Suelta para actualizar" : "Desliza para actualizar"}</span>
          </>
        ) : null}
      </div>
      {children}
    </>
  );
}
