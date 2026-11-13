"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AppNotification } from "./notifications";

/**
 * Avisos de escritorio: cuando llega una notificación y la pestaña no está a la vista, el sistema operativo la muestra (esquina de la
 * pantalla, centro de notificaciones) aunque la ventana esté minimizada o en otra pestaña. Usa la API estándar del navegador:
 * pide permiso una vez (con un gesto de la persona), se puede apagar por negocio y al tocarla lleva a la pantalla de esa notificación.
 *
 * Límite honesto: funciona mientras NEXUS esté abierto en alguna pestaña (aunque sea de fondo). Con el navegador cerrado hace falta
 * Web Push (llaves VAPID y guardar la suscripción de cada dispositivo), que es otra fase. Solo se guarda una preferencia (sí/no), nunca
 * datos del negocio.
 */
export type DesktopPermission = "unsupported" | "default" | "granted" | "denied";

const EVENT = "nx:desktop-notifs";
const prefKey = (slug: string) => `nx:desktop-notifs:${slug}`;

function permission(): DesktopPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as DesktopPermission;
}

function preference(slug: string): boolean {
  try {
    return window.localStorage.getItem(prefKey(slug)) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** Estado del permiso y de la preferencia, con las acciones para encender y apagar. */
export function useDesktopNotifications(slug: string) {
  const perm = useSyncExternalStore(subscribe, permission, () => "default" as DesktopPermission);
  const wanted = useSyncExternalStore(subscribe, () => preference(slug), () => false);

  /** Pide permiso (debe llamarse desde un clic) y lo enciende si lo dan. */
  const enable = useCallback(async (): Promise<DesktopPermission> => {
    if (permission() === "unsupported") return "unsupported";
    const result = permission() === "granted" ? "granted" : ((await Notification.requestPermission()) as DesktopPermission);
    if (result === "granted") {
      try {
        window.localStorage.setItem(prefKey(slug), "1");
      } catch {
        /* sin almacenamiento: queda activo solo en esta sesión del navegador */
      }
    }
    window.dispatchEvent(new Event(EVENT));
    return result;
  }, [slug]);

  const disable = useCallback(() => {
    try {
      window.localStorage.removeItem(prefKey(slug));
    } catch {
      /* nada */
    }
    window.dispatchEvent(new Event(EVENT));
  }, [slug]);

  return { permission: perm, enabled: perm === "granted" && wanted, enable, disable };
}

/** ¿Hay que sacar el aviso de escritorio? Solo si la pestaña no está a la vista (si lo está, la campana ya lo muestra). */
export function shouldShowDesktop(): boolean {
  return typeof document !== "undefined" && (document.hidden || !document.hasFocus());
}

/** Texto de un grupo de avisos: una sola notificación habla por sí sola; varias se resumen. */
export function desktopPayload(items: readonly AppNotification[], hrefFor: (path: string) => string): { title: string; body: string; href: string; tag: string } | null {
  if (items.length === 0) return null;
  if (items.length === 1) {
    const n = items[0]!;
    return { title: n.title, body: n.detail, href: hrefFor(n.href), tag: n.id };
  }
  return { title: `${items.length} notificaciones nuevas`, body: items.slice(0, 3).map((n) => n.title).join(" · "), href: hrefFor("/notificaciones"), tag: "nx-varias" };
}

/** Muestra el aviso del sistema (por el service worker si está; si no, directo desde la página). */
export async function showDesktopNotification(payload: { title: string; body: string; href: string; tag: string }): Promise<void> {
  if (permission() !== "granted") return;
  const options: NotificationOptions = { body: payload.body, tag: payload.tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { href: payload.href } };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) return await registration.showNotification(payload.title, options);
  } catch {
    /* sin service worker: se usa la página */
  }
  const notification = new Notification(payload.title, options);
  notification.onclick = () => {
    window.focus();
    window.location.assign(payload.href);
    notification.close();
  };
}
