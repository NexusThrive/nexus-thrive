import { describe, expect, it, vi } from "vitest";
import { ProviderUnavailable, httpEInvoice } from "./http-provider";
import type { FiscalPayload } from "./port";

vi.mock("@/lib/events/ssrf", async (orig) => ({ ...(await orig<typeof import("@/lib/events/ssrf")>()), resolvesPublic: async (h: string) => h !== "interno.example.com" }));

const payload = { code: "V-000042", total: 119_000 } as FiscalPayload;
const reply = (status: number, body: unknown) => (async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })) as unknown as typeof fetch;
const cfg = { url: "https://proveedor.example.com/api/documents", token: "tok_123456789" };

describe("proveedor tecnológico por HTTP", () => {
  it("envía el documento con llave e idempotencia y entiende aceptado, rechazado y recibido", async () => {
    const spy = vi.fn(reply(200, { status: "ACCEPTED", providerRef: "p-1", cufe: "abc" }));
    expect(await httpEInvoice(cfg, spy).submit(payload)).toEqual({ status: "ACCEPTED", providerRef: "p-1", cufe: "abc" });
    const [, init] = spy.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ authorization: "Bearer tok_123456789", "idempotency-key": "V-000042" });
    expect(await httpEInvoice(cfg, reply(200, { status: "REJECTED", reason: "NIT del adquirente inválido" })).submit(payload)).toEqual({ status: "REJECTED", reason: "NIT del adquirente inválido" });
    expect(await httpEInvoice(cfg, reply(202, { status: "SUBMITTED", providerRef: "p-2" })).submit(payload)).toEqual({ status: "SUBMITTED", providerRef: "p-2" });
    expect(await httpEInvoice(cfg, reply(422, {})).submit(payload)).toMatchObject({ status: "REJECTED", reason: expect.stringContaining("422") });
  });
  it("una falla del proveedor (5xx, red, respuesta rara) no es un rechazo: se reintenta", async () => {
    await expect(httpEInvoice(cfg, reply(503, {})).submit(payload)).rejects.toThrow(ProviderUnavailable);
    await expect(httpEInvoice(cfg, reply(200, "no es json")).submit(payload)).rejects.toThrow(ProviderUnavailable);
    await expect(httpEInvoice(cfg, reply(200, { cualquier: "cosa" })).submit(payload)).rejects.toThrow(ProviderUnavailable);
    await expect(httpEInvoice(cfg, (async () => { throw new Error("ECONNRESET"); }) as unknown as typeof fetch).submit(payload)).rejects.toThrow(ProviderUnavailable);
  });
  it("no sale a direcciones privadas ni a HTTP plano (SSRF)", async () => {
    const never = vi.fn();
    await expect(httpEInvoice({ ...cfg, url: "http://proveedor.example.com/x" }, never as unknown as typeof fetch).submit(payload)).rejects.toThrow(/no válida/);
    await expect(httpEInvoice({ ...cfg, url: "https://10.0.0.5/x" }, never as unknown as typeof fetch).submit(payload)).rejects.toThrow(ProviderUnavailable);
    await expect(httpEInvoice({ ...cfg, url: "https://interno.example.com/x" }, never as unknown as typeof fetch).submit(payload)).rejects.toThrow(/no es pública/);
    expect(never).not.toHaveBeenCalled();
  });
});
