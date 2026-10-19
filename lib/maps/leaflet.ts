/**
 * Adaptador ligero para Leaflet (mapa con OpenStreetMap). Carga la hoja de
 * estilos y el script del bundle ESM de Leaflet en el cliente.
 *
 * Leaflet es libre (BSD), sin clave, sin facturación.
 */

let leafletPromise: Promise<{ L: typeof import("leaflet") }> | null = null;

export function loadLeaflet(): Promise<{ L: typeof import("leaflet") }> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet solo está disponible en el navegador"));
  }

  if (leafletPromise) return leafletPromise;

  leafletPromise = (async () => {
    // Hoja de estilos de Leaflet.
    if (!document.querySelector('link[data-leaflet-css="true"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      link.setAttribute("data-leaflet-css", "true");
      document.head.appendChild(link);
    }

    // Paquete ESM de Leaflet.
    const mod = (await import("leaflet")) as typeof import("leaflet");
    return { L: mod };
  })();

  return leafletPromise;
}
