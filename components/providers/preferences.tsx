"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { PREFS_STORAGE_KEY, prefsInitScript } from "@/lib/init-scripts";

/**
 * Preferencias de interfaz por navegador (Ajustes → Apariencia y movimiento).
 * Viven como atributos de <html> —la fuente de verdad que lee el CSS— y se
 * guardan en localStorage. `prefsInitScript` las aplica antes del primer
 * pintado para que no haya salto de layout.
 */
export type Preferences = {
  /** Barra lateral solo con iconos en pantallas grandes. */
  rail: boolean;
  density: "comfortable" | "compact";
  motion: "on" | "off";
};

export { prefsInitScript };

const STORAGE_KEY = PREFS_STORAGE_KEY;
const EVENT = "nx-prefs-change";
const DEFAULTS: Preferences = { rail: false, density: "comfortable", motion: "on" };

function read(): Preferences {
  if (typeof document === "undefined") return DEFAULTS;
  const r = document.documentElement;
  return {
    rail: r.hasAttribute("data-rail"),
    density: r.dataset.density === "compact" ? "compact" : "comfortable",
    motion: r.dataset.motion === "off" ? "off" : "on",
  };
}

let cached = DEFAULTS;
let cachedKey = "";
function snapshot(): Preferences {
  const next = read();
  const key = `${next.rail}|${next.density}|${next.motion}`;
  if (key !== cachedKey) {
    cached = next;
    cachedKey = key;
  }
  return cached;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function apply(prefs: Preferences) {
  const r = document.documentElement;
  r.toggleAttribute("data-rail", prefs.rail);
  if (prefs.density === "compact") r.dataset.density = "compact";
  else delete r.dataset.density;
  if (prefs.motion === "off") r.dataset.motion = "off";
  else delete r.dataset.motion;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* modo privado: se aplica en memoria */
  }
  window.dispatchEvent(new Event(EVENT));
}

type PreferencesContextValue = Preferences & {
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const prefs = useSyncExternalStore(subscribe, snapshot, () => DEFAULTS);
  const setPreference = useCallback<PreferencesContextValue["setPreference"]>((key, value) => {
    apply({ ...read(), [key]: value });
  }, []);
  const value = useMemo(() => ({ ...prefs, setPreference }), [prefs, setPreference]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences debe usarse dentro de <PreferencesProvider>.");
  return ctx;
}
