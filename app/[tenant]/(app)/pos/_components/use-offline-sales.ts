"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sellAction } from "@/app/[tenant]/(app)/pos/actions";
import { dequeue, enqueue, isNetworkFailure, markFailed, readQueue, type QueuedSale } from "@/lib/business/pos/offline-queue";
import type { SaleInput } from "@/lib/business/pos/pos-db";

const store = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

/** Identificador único de una venta (el mismo en cada reintento). */
export const newSaleId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

/**
 * Ventas hechas sin conexión: se guardan en el dispositivo y se envían solas al volver el internet. Cada venta lleva su
 * identificador, así que un reenvío no la registra dos veces. `onSent` avisa de cada venta que sí se registró.
 */
export function useOfflineSales(slug: string, onSent: (result: { number: number; code?: string; total: number }) => void) {
  const [queue, setQueue] = useState<QueuedSale[]>([]);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const sent = useRef(onSent);
  useEffect(() => {
    sent.current = onSent;
  });

  const flush = useCallback(async () => {
    // La cola vive en el dispositivo: se lee aquí (no en el render) para que servidor y navegador pinten lo mismo.
    setQueue(readQueue(store(), slug));
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    try {
      for (const sale of readQueue(store(), slug).filter((s) => !s.error)) {
        try {
          const r = await sellAction(slug, sale.input as SaleInput);
          if (r.ok) {
            setQueue(dequeue(store(), slug, sale.id));
            sent.current({ number: r.number, code: r.code, total: r.total });
          } else setQueue(markFailed(store(), slug, sale.id, r.message));
        } catch (e) {
          if (isNetworkFailure(e)) break; // sigue sin internet: se reintenta luego
          setQueue(markFailed(store(), slug, sale.id, "No se pudo enviar. Revísala o descártala."));
        }
      }
    } finally {
      busy.current = false;
      setSending(false);
    }
  }, [slug]);

  useEffect(() => {
    // Al montar se lee la cola del dispositivo (no durante el render: el servidor no la tiene) y se intenta enviar lo pendiente.
    const first = window.setTimeout(() => void flush(), 0);
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => {
      if (readQueue(store(), slug).some((s) => !s.error)) void flush();
    }, 30_000);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, [slug, flush]);

  /** Guarda la venta para enviarla luego. `false` si la cola está llena. */
  const save = useCallback(
    (sale: QueuedSale) => {
      const next = enqueue(store(), slug, sale);
      if (next) setQueue(next);
      return next !== null;
    },
    [slug],
  );
  const discard = useCallback((id: string) => setQueue(dequeue(store(), slug, id)), [slug]);

  return { queue, sending, save, discard, flush };
}
