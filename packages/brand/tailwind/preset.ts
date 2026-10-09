import type { Config } from "tailwindcss";

/**
 * Preset NEXUS THRIVE para Tailwind v3.
 * En cada app: presets: [require("@nexus/brand/tailwind-preset").default]
 * Los colores semánticos (bg-background, text-muted, bg-accent...) cambian solos
 * entre modo claro y oscuro; no hace falta repetir `dark:` en cada clase.
 */
const preset: Partial<Config> = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: { DEFAULT: "var(--surface)", muted: "var(--surface-muted)", inverse: "var(--surface-inverse)" },
        border: { DEFAULT: "var(--border)", strong: "var(--border-strong)" },
        foreground: { DEFAULT: "var(--foreground)", muted: "var(--foreground-muted)", inverse: "var(--foreground-inverse)" },
        muted: "var(--foreground-muted)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)", hover: "var(--primary-hover)" },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          foreground: "var(--accent-foreground)",
          text: "var(--accent-text)",
          subtle: "var(--accent-subtle)",
        },
        ring: "var(--ring)",
        success: "var(--success)",
        danger: "var(--danger)",
        ink: "#000000",
        paper: "#F7F6F3",
        sidebar: {
          DEFAULT: "var(--sidebar-bg)",
          fg: "var(--sidebar-fg)",
          "fg-muted": "var(--sidebar-fg-muted)",
          border: "var(--sidebar-border)",
          hover: "var(--sidebar-hover)",
          active: "var(--sidebar-active)",
          accent: "var(--sidebar-accent)",
        },
        gold: { 100: "#F6EBC4", 300: "#E6CB74", 500: "#D4AF37", 600: "#B8921F", 700: "#7F6210" },
        graphite: {
          950: "#0A0A0B", 900: "#141416", 800: "#1E1E21", 700: "#2A2A2E",
          500: "#6B6B73", 400: "#A1A1A8", 200: "#E8E6E1", 100: "#F2F1EE",
        },
      },
      fontFamily: {
        display: ["var(--font-montserrat)", "Segoe UI", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", "1rem"],
        sm: ["0.875rem", "1.25rem"],
        base: ["1rem", "1.5rem"],
        lg: ["1.125rem", "1.75rem"],
        xl: ["1.25rem", "1.75rem"],
        "2xl": ["1.5rem", "2rem"],
        "3xl": ["1.875rem", "2.25rem"],
        "4xl": ["2.5rem", "2.75rem"],
        "5xl": ["3.25rem", "3.5rem"],
      },
      borderRadius: { none: "0", sm: "2px", DEFAULT: "4px", md: "4px", lg: "6px", xl: "8px" },
      boxShadow: { popover: "var(--shadow-popover)" },
      transitionDuration: { fast: "120ms", base: "200ms" },
      transitionTimingFunction: { brand: "cubic-bezier(0.2, 0, 0, 1)" },
      width: { sidebar: "248px", "sidebar-collapsed": "64px" },
      height: { topbar: "56px" },
      maxWidth: { content: "1280px" },
    },
  },
};

export default preset;
