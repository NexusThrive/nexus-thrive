"use client";

import { useEffect, useRef } from "react";
import { THEME_EVENT, THEME_STORAGE_KEY } from "@/components/atoms/theme-toggle";
import { saveThemeAction } from "../_actions/preferences";

/* El tema de la cuenta se aplica una sola vez por carga de página. Al volver
   atrás, Next reutiliza el layout en caché con el `saved` de cuando se renderizó
   (ya viejo) y, sin esto, pisaba el tema recién elegido. */
let accountThemeApplied = false;

/**
 * El tema que elegiste queda en tu cuenta: al entrar desde otro equipo se
 * aplica el tuyo, y cada cambio (botón, Ajustes o paleta de comandos) se guarda.
 */
export default function ThemeSync({ tenantSlug, saved }: { tenantSlug: string; saved: "light" | "dark" | null }) {
  const applying = useRef(false);

  useEffect(() => {
    if (!saved || accountThemeApplied) return;
    accountThemeApplied = true;
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
    if (current === saved) return;
    applying.current = true;
    document.documentElement.classList.toggle("dark", saved === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, saved);
    } catch {
      /* sin almacenamiento: la clase basta */
    }
    window.dispatchEvent(new Event(THEME_EVENT));
    applying.current = false;
  }, [saved]);

  useEffect(() => {
    const onChange = () => {
      if (applying.current) return;
      const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
      void saveThemeAction(tenantSlug, theme);
    };
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, [tenantSlug]);

  return null;
}
