/**
 * Presence Thrive — motor de la presencia digital del negocio.
 *
 * Puntaje 0-100 puro y determinista: se calcula desde los datos que el negocio
 * ya tiene (identidad, WhatsApp, ubicación, Google, Instagram, catálogo) y, si
 * hay un escaneo, desde la verificación real del sitio web. Nada sube por el
 * solo hecho de declararlo: los canales sociales y de contacto suman como
 * "declarados" y el sitio solo suma cuando `lib/presence/website.ts` lo
 * confirma. Sin sitio publicado el techo es 60/100.
 */

export type PresenceState = "INVISIBLE" | "VISIBLE" | "CONECTADO" | "DOMINANTE";

/** Pesos por criterio. Los seis primeros suman 60 (techo sin sitio). */
export const PRESENCE_WEIGHTS = {
  identity: 10,
  whatsapp: 10,
  location: 10,
  google: 15,
  instagram: 5,
  catalog: 10,
  webActive: 25,
  webOptimized: 15,
} as const;

export type PresenceCheckKey = keyof typeof PRESENCE_WEIGHTS;

export type PresenceCheck = {
  key: PresenceCheckKey;
  label: string;
  hint: string;
  weight: number;
  earned: number;
  /** true = comprobado por el sistema; false = declarado por el negocio. */
  verified: boolean;
  done: boolean;
};

/** Señales del sitio web, producidas por un escaneo (no por el render). */
export type WebsiteSignal = {
  url: string;
  reachable: boolean;
  https: boolean;
  statusCode: number | null;
  title: string | null;
  description: string | null;
  viewport: boolean;
};

export type PresenceInput = {
  name?: string | null;
  address?: string | null;
  whatsappNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleBusinessUrl?: string | null;
  instagramHandle?: string | null;
  catalogItems?: number;
  websiteUrl?: string | null;
  /** Señales verificadas; null si aún no se escaneó el sitio. */
  website?: WebsiteSignal | null;
};

export type PresenceResult = {
  score: number;
  state: PresenceState;
  checks: PresenceCheck[];
};

/** Dígitos de un teléfono/handle, sin signos ni espacios. */
export function digitsOf(value: string | null | undefined): string {
  return (value ?? "").replace(/\D+/g, "");
}

export function normalizeHandle(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/^@+/, "").toLowerCase();
}

function isHttpUrl(url: string | null | undefined): boolean {
  return /^https?:\/\//i.test((url ?? "").trim());
}

/**
 * Calcula el puntaje de presencia y el detalle por criterio.
 * Puro: mismas entradas → mismo resultado.
 */
export function computePresence(input: PresenceInput): PresenceResult {
  const name = (input.name ?? "").trim();
  const address = (input.address ?? "").trim();
  const wa = digitsOf(input.whatsappNumber);
  const hasLocation = typeof input.latitude === "number" && typeof input.longitude === "number";
  const handle = normalizeHandle(input.instagramHandle);
  const catalogItems = input.catalogItems ?? 0;

  const site = input.website ?? null;
  const hasUrl = isHttpUrl(input.websiteUrl);
  const reachable = Boolean(site?.reachable);

  const identityEarned = (name ? PRESENCE_WEIGHTS.identity / 2 : 0) + (address ? PRESENCE_WEIGHTS.identity / 2 : 0);

  const optimizedEarned = reachable
    ? (site?.https ? 4 : 0) + (site?.title ? 4 : 0) + (site?.description ? 4 : 0) + (site?.viewport ? 3 : 0)
    : 0;

  const checks: PresenceCheck[] = [
    {
      key: "identity",
      label: "Identidad",
      hint: address ? "Nombre y dirección completos." : "Agrega tu dirección en Ajustes.",
      weight: PRESENCE_WEIGHTS.identity,
      earned: identityEarned,
      verified: false,
      done: Boolean(name && address),
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      hint: wa.length >= 10 ? "Tus clientes te escriben directo." : "Registra tu número de WhatsApp.",
      weight: PRESENCE_WEIGHTS.whatsapp,
      earned: wa.length >= 10 ? PRESENCE_WEIGHTS.whatsapp : 0,
      verified: false,
      done: wa.length >= 10,
    },
    {
      key: "location",
      label: "Ubicación",
      hint: hasLocation ? "Apareces en el mapa." : "Confirma tus coordenadas en el onboarding.",
      weight: PRESENCE_WEIGHTS.location,
      earned: hasLocation ? PRESENCE_WEIGHTS.location : 0,
      verified: false,
      done: hasLocation,
    },
    {
      key: "google",
      label: "Ficha de Google",
      hint: isHttpUrl(input.googleBusinessUrl) ? "Tu ficha de Google está vinculada." : "Vincula tu ficha de Google Business.",
      weight: PRESENCE_WEIGHTS.google,
      earned: isHttpUrl(input.googleBusinessUrl) ? PRESENCE_WEIGHTS.google : 0,
      verified: false,
      done: isHttpUrl(input.googleBusinessUrl),
    },
    {
      key: "instagram",
      label: "Instagram",
      hint: handle ? `Te encuentran como @${handle}.` : "Conecta tu Instagram.",
      weight: PRESENCE_WEIGHTS.instagram,
      earned: handle ? PRESENCE_WEIGHTS.instagram : 0,
      verified: false,
      done: Boolean(handle),
    },
    {
      key: "catalog",
      label: "Catálogo",
      hint: catalogItems > 0 ? `${catalogItems} ${catalogItems === 1 ? "producto o servicio" : "productos y servicios"}.` : "Carga tu catálogo para que te conozcan.",
      weight: PRESENCE_WEIGHTS.catalog,
      earned: catalogItems > 0 ? PRESENCE_WEIGHTS.catalog : 0,
      verified: false,
      done: catalogItems > 0,
    },
    {
      key: "webActive",
      label: "Sitio web activo",
      hint: reachable ? "Tu sitio responde." : hasUrl ? "Aún no verificamos tu sitio. Ejecuta el análisis." : "Solicita tu página con Presence Thrive.",
      weight: PRESENCE_WEIGHTS.webActive,
      earned: reachable ? PRESENCE_WEIGHTS.webActive : 0,
      verified: true,
      done: reachable,
    },
    {
      key: "webOptimized",
      label: "Sitio optimizado",
      hint: optimizedEarned >= PRESENCE_WEIGHTS.webOptimized
        ? "HTTPS, título, descripción y móvil, listos."
        : reachable
          ? "Mejora el título, la descripción y la vista móvil."
          : "Sin sitio verificado todavía.",
      weight: PRESENCE_WEIGHTS.webOptimized,
      earned: optimizedEarned,
      verified: true,
      done: optimizedEarned >= PRESENCE_WEIGHTS.webOptimized,
    },
  ];

  const raw = checks.reduce((sum, check) => sum + check.earned, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { score, state: stateOf(score), checks };
}

export function stateOf(score: number): PresenceState {
  if (score <= 25) return "INVISIBLE";
  if (score <= 50) return "VISIBLE";
  if (score <= 75) return "CONECTADO";
  return "DOMINANTE";
}

export const PRESENCE_STATES: Record<
  PresenceState,
  { label: string; tagline: string; tone: "danger" | "warning" | "neutral" | "success"; bar: "ink" | "gold" }
> = {
  INVISIBLE: {
    label: "Invisible",
    tagline: "Casi nadie te encuentra en internet.",
    tone: "danger",
    bar: "ink",
  },
  VISIBLE: {
    label: "Visible",
    tagline: "Ya te encuentran, pero falta presencia.",
    tone: "warning",
    bar: "ink",
  },
  CONECTADO: {
    label: "Conectado",
    tagline: "Tu negocio responde en todos los canales.",
    tone: "neutral",
    bar: "gold",
  },
  DOMINANTE: {
    label: "Dominante",
    tagline: "Presencia completa y optimizada.",
    tone: "success",
    bar: "gold",
  },
};

/** Máximo alcanzable sin sitio verificado (los seis criterios declarados). */
export const PRESENCE_CEILING_WITHOUT_SITE = 60;
