"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, Loader2, MapPinned, Search } from "lucide-react";
import { inputClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";
import { loadLeaflet } from "@/lib/maps/leaflet";
import { searchPlaces, type PlaceSuggestion } from "@/lib/maps/photon";

/** Cambio del campo de dirección: texto + coordenadas confirmadas (o null). */
export type AddressChange = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  city?: string;
};

type Coords = { latitude: number; longitude: number };

/** Alto máximo de la lista (max-h-64 = 16rem) y reserva para la barra fija. */
const LIST_MAX_HEIGHT = 256;
const FOOTER_RESERVE = 88;

type Suggestion = {
  id: string;
  primary: string;
  secondary: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
};

/**
 * Campo de dirección con autocompletado de Photon (OpenStreetMap) y confirmación
 * en un mapa Leaflet. Funciona 100 % gratis, sin clave de Google.
 */
export function AddressAutocomplete({
  value,
  location,
  onChange,
  disabled,
  placeholder,
  id,
  ariaDescribedBy,
  ariaInvalid,
}: {
  value: string;
  location: Coords | null;
  onChange: (change: AddressChange) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: true;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mapRefObj = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);

  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Si no hay espacio debajo del campo (barra de acciones fija), la lista
  // se despliega hacia arriba.
  const [dropUp, setDropUp] = useState(false);

  const measurePlacement = () => {
    const element = inputRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropUp(spaceBelow < LIST_MAX_HEIGHT + FOOTER_RESERVE);
  };

  const fetchSuggestions = async (input: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setBusy(true);
      const results = await searchPlaces(input, { signal: controller.signal, limit: 5 });
      const mapped: Suggestion[] = results.map((result: PlaceSuggestion) => ({
        id: result.id,
        primary: result.primary,
        secondary: result.secondary,
        address: result.address,
        city: result.city,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
      setSuggestions(mapped);
      setActiveIndex(-1);
      setOpen(mapped.length > 0);
      if (mapped.length > 0) measurePlacement();
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setSuggestions([]);
      setOpen(false);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  };

  const handleInput = (text: string) => {
    onChange({ address: text, latitude: null, longitude: null, placeId: null });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const trimmed = text.trim();
    if (trimmed.length < 3 || trimmed.toLowerCase() === "remote") {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timerRef.current = window.setTimeout(() => void fetchSuggestions(trimmed), 220);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    setOpen(false);
    setSuggestions([]);
    onChange({
      address: suggestion.address,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      placeId: `osm:${suggestion.id}`,
      city: suggestion.city,
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    // Leaflet listo (sin clave).
  }, []);

  useEffect(() => {
    const element = mapRef.current;
    if (!location || !element) {
      mapRefObj.current?.remove();
      mapRefObj.current = null;
      markerRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      const { L } = await loadLeaflet();
      if (cancelled) return;

      const latlng: [number, number] = [location.latitude, location.longitude];

      if (!mapRefObj.current) {
        mapRefObj.current = L.map(element, {
          center: latlng,
          zoom: 16,
          zoomControl: false,
          attributionControl: true,
          scrollWheelZoom: "center",
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapRefObj.current);
      } else {
        mapRefObj.current.setView(latlng, 16);
      }

      if (markerRef.current) {
        markerRef.current.setLatLng(latlng);
      } else {
        markerRef.current = L.marker(latlng).addTo(mapRefObj.current);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location]);

  const showMap = Boolean(location);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <MapPinned aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={id}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={open ? listId : undefined}
          aria-expanded={open}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
          autoComplete="off"
          onChange={(event) => handleInput(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          className={cn(inputClasses, "pl-9", busy && "pr-9")}
        />
        {busy ? (
          <Loader2 aria-hidden="true" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
        {open ? (
          <ul
            id={listId}
            role="listbox"
            className={cn(
              "absolute inset-x-0 z-10 max-h-64 overflow-auto rounded-md border border-border bg-surface p-1 shadow-lg",
              dropUp ? "bottom-full mb-1" : "top-full mt-1",
            )}
          >
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.id} id={`${listId}-opt-${index}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-sm px-2.5 py-2 text-left transition-colors",
                    index === activeIndex ? "bg-surface-muted" : "hover:bg-surface-muted",
                  )}
                >
                  <Search aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground">{suggestion.primary}</span>
                    {suggestion.secondary ? (
                      <span className="block truncate text-[11.5px] text-muted-foreground">{suggestion.secondary}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {showMap ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div ref={mapRef} className="relative isolate z-0 h-40 w-full" />
          <p className="flex items-center gap-1.5 border-t border-border bg-surface-muted px-3 py-1.5 text-[11.5px] text-muted-foreground">
            <Check aria-hidden="true" className="size-3.5 text-success" />
            Ubicación confirmada.
          </p>
        </div>
      ) : null}
    </div>
  );
}
