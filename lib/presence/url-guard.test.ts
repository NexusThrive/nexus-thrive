import { afterEach, describe, expect, test, vi } from "vitest";
import { checkPublicUrl, isPrivateAddress, type Resolver } from "./url-guard";
import { analyzeWebsite } from "./website";

/** SEC-09: el análisis de presencia no puede consultar la red interna. */

const publicDns: Resolver = async () => ["93.184.216.34"];
const dnsTo = (address: string): Resolver => async () => [address];

describe("isPrivateAddress", () => {
  test.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.10",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "no-es-una-ip",
  ])("%s no es pública", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  test.each(["93.184.216.34", "8.8.8.8", "172.32.0.1", "2606:4700:4700::1111"])("%s es pública", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("checkPublicUrl", () => {
  test.each([
    ["http://127.0.0.1/", "dirección privada"],
    ["http://169.254.169.254/latest/meta-data/", "dirección privada"],
    ["http://[::1]/", "dirección privada"],
    ["http://localhost:3000/", "puerto no permitido"],
    ["http://localhost/", "host interno"],
    ["http://servicio.internal/", "host interno"],
    ["ftp://ejemplo.com/", "protocolo no permitido"],
    ["file:///etc/passwd", "protocolo no permitido"],
    ["https://ejemplo.com:22/", "puerto no permitido"],
    ["https://usuario:clave@ejemplo.com/", "credenciales en la URL"],
  ])("%s → %s", async (url, reason) => {
    expect(await checkPublicUrl(url, publicDns)).toEqual({ ok: false, reason });
  });

  test("un dominio que resuelve a una IP interna se rechaza", async () => {
    expect(await checkPublicUrl("https://trampa.ejemplo.com/", dnsTo("10.0.0.5"))).toEqual({
      ok: false,
      reason: "dirección privada",
    });
  });

  test("un sitio público pasa", async () => {
    const check = await checkPublicUrl("https://ejemplo.com/", publicDns);
    expect(check.ok).toBe(true);
  });
});

describe("analyzeWebsite con la guardia", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test.each(["http://127.0.0.1", "http://169.254.169.254"])("%s queda sin verificar y sin consultar", async (url) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const signal = await analyzeWebsite(url, publicDns);
    expect(signal.reachable).toBe(false);
    expect(signal.title).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("una redirección hacia la red interna se corta", async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data/" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const signal = await analyzeWebsite("https://ejemplo.com", publicDns);
    expect(signal.reachable).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("un sitio público que redirige a https se analiza", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "https://ejemplo.com/" } }))
      .mockResolvedValueOnce(
        new Response("<html><head><title>Mi Negocio</title></head></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );
    vi.stubGlobal("fetch", fetchSpy);
    const signal = await analyzeWebsite("http://ejemplo.com", publicDns);
    expect(signal.reachable).toBe(true);
    expect(signal.https).toBe(true);
    expect(signal.title).toBe("Mi Negocio");
  });
});
