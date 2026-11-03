"use client";

import { useEffect, useState } from "react";
import { Clock, MapPin } from "lucide-react";

const ZONE = "America/Bogota";

/**
 * Hora y país del negocio: reloj en la zona horaria de Colombia (UTC−5, sin horario de verano) con la fecha, el país
 * y la ciudad del negocio. Se pinta al montar para no desajustar la hidratación; el reloj avanza cada segundo.
 */
export default function ClockCard({ city }: { city?: string | null }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const time = now?.toLocaleTimeString("es-CO", { timeZone: ZONE, hour: "numeric", minute: "2-digit", hour12: true });
  const date = now?.toLocaleDateString("es-CO", { timeZone: ZONE, weekday: "long", day: "numeric", month: "long" });

  return (
    <section aria-label="Hora y país" className="flex h-full flex-col justify-between gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-ui font-medium text-muted-foreground">
        <Clock aria-hidden="true" className="size-4" />
        Hora local
      </div>
      <div>
        <p className="font-display text-[clamp(28px,4vw,40px)] font-bold leading-none tracking-[-0.02em] tabular-nums text-foreground" aria-live="off">
          {time ?? "--:--"}
        </p>
        <p className="mt-2 min-h-5 text-sm capitalize text-muted-foreground">{date ?? ""}</p>
      </div>
      <p className="flex items-center gap-2 text-ui text-foreground">
        <MapPin aria-hidden="true" className="size-4 shrink-0 text-accent-text" />
        <span className="min-w-0 truncate">
          Colombia{city ? ` · ${city}` : ""} <span className="text-muted-foreground">· UTC−5</span>
        </span>
      </p>
    </section>
  );
}
