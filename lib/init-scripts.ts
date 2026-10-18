/**
 * Scripts de inicialización anti-parpadeo para <html>.
 * Vive en un módulo sin "use client" para que el root layout (Server
 * Component) pueda leer los strings y emiterlos como <script> inline
 * en el <head> — los exports de archivos "use client" no están
 * disponibles en el server.
 */

export const THEME_STORAGE_KEY = "nx-theme";

export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="dark"){t="light"}if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export const PREFS_STORAGE_KEY = "nx-prefs";

export const prefsInitScript = `(function(){try{var p=JSON.parse(localStorage.getItem("${PREFS_STORAGE_KEY}")||"{}"),r=document.documentElement;if(p.rail)r.setAttribute("data-rail","");if(p.density==="compact")r.setAttribute("data-density","compact");if(p.motion==="off")r.setAttribute("data-motion","off")}catch(e){}})();`;
