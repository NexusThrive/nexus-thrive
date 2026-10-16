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
    </div>
  );
}
