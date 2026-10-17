"use client";

import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/atoms/switch";
import { setTheme, useTheme } from "@/components/atoms/theme-toggle";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { SettingsRow } from "@/components/molecules/settings-row";
import { usePreferences } from "@/components/providers/preferences";

const card = "overflow-hidden rounded-lg border border-border bg-card";
const cardTitle = "border-b border-border px-[18px] py-4 font-display text-[15px] font-semibold";

/**
 * Apariencia y movimiento de la interfaz. Se guarda en este navegador y se
 * aplica al instante (antes del primer pintado en las próximas visitas).
 */
export function AppearanceSettings() {
  const theme = useTheme();
  const { rail, density, motion, setPreference } = usePreferences();

  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <section className={card} aria-labelledby="appearance-title">
        <h2 id="appearance-title" className={cardTitle}>Apariencia</h2>
        <SettingsRow
          title="Tema"
          description="Claro u oscuro; el cambio barre la pantalla en diagonal."
          control={
            <SegmentedControl
              ariaLabel="Tema"
              value={theme}
              onChange={(next) => setTheme(next)}
              options={[
                { value: "light", label: <Sun aria-hidden="true" />, ariaLabel: "Claro" },
                { value: "dark", label: <Moon aria-hidden="true" />, ariaLabel: "Oscuro" },
              ]}
            />
          }
        />
        <SettingsRow
          title="Densidad"
          description="Compacta muestra más filas en las tablas."
          control={
            <SegmentedControl
              ariaLabel="Densidad"
              value={density}
              onChange={(next) => setPreference("density", next)}
              options={[
                { value: "comfortable", label: "Cómoda" },
                { value: "compact", label: "Compacta" },
              ]}
            />
          }
        />
        <SettingsRow
          title="Barra lateral compacta"
          description="Solo iconos en pantallas grandes."
          htmlFor="pref-rail"
          control={<Switch id="pref-rail" checked={rail} onCheckedChange={(on) => setPreference("rail", on)} />}
        />
      </section>

      <section className={card} aria-labelledby="motion-title">
        <h2 id="motion-title" className={cardTitle}>Movimiento</h2>
        <SettingsRow
          title="Reducir movimiento"
          description="También se activa si tu dispositivo lo pide."
          htmlFor="pref-motion"
          control={
            <Switch
              id="pref-motion"
              checked={motion === "off"}
              onCheckedChange={(on) => setPreference("motion", on ? "off" : "on")}
            />
          }
        />
      </section>

      <section className={card} aria-labelledby="locale-title">
        <div className="flex items-center justify-between border-b border-border px-[18px] py-4">
          <h2 id="locale-title" className="font-display text-[15px] font-semibold">Formato regional</h2>
          <span className="font-mono text-xs text-muted-foreground">es-CO · America/Bogota</span>
        </div>
        {REGIONAL.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3.5 border-b border-border px-[18px] py-3.5 last:border-b-0">
            <span className="text-muted-foreground">{label}</span>
            <b className="text-right font-medium tabular-nums">{value}</b>
          </div>
        ))}
      </section>
    </div>
  );
}

const SAMPLE = new Date(Date.UTC(2026, 9, 20, 15, 30));
const REGIONAL: [string, string][] = [
  ["Moneda", `$ ${(12_400_000).toLocaleString("es-CO")}`],
  ["Número", (1234567.89).toLocaleString("es-CO")],
  ["Fecha", new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeZone: "America/Bogota" }).format(SAMPLE)],
  ["Hora", new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(SAMPLE)],
  ["Semana", "Empieza el lunes"],
];
