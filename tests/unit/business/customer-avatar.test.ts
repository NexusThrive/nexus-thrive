import { describe, expect, it } from "vitest";
import { avatarSeed, customerFace } from "@/lib/business/customers/avatar";

const DATA_URI = /^data:image\/svg\+xml,/;

describe("semilla del avatar de cliente", () => {
  it("normaliza el nombre: recorta, colapsa espacios y pasa a minúsculas", () => {
    expect(avatarSeed({ name: "  María   Pérez  " })).toBe("maría pérez");
  });

  it("usa nombre → correo → teléfono → id y cae en «cliente»", () => {
    expect(avatarSeed({ name: "", email: "MARIA@CORREO.COM" })).toBe("maria@correo.com");
    expect(avatarSeed({ name: " ", phone: "300 123 4567" })).toBe("300 123 4567");
    expect(avatarSeed({ id: "cus_123" })).toBe("cus_123");
    expect(avatarSeed({})).toBe("cliente");
  });

  it("da la misma cara a nombres que solo difieren en mayúsculas o espacios", () => {
    expect(customerFace({ name: "María Pérez" }).src).toBe(customerFace({ name: " maría   pérez " }).src);
  });

  it("da caras distintas a nombres distintos y la misma a homónimos", () => {
    expect(customerFace({ name: "María" }).src).not.toBe(customerFace({ name: "Laura" }).src);
    expect(customerFace({ name: "María" }).src).toBe(customerFace({ name: "María", id: "otro" }).src);
  });

  it("prefiere la foto aunque no haya nombre", () => {
    expect(customerFace({}, "/api/files/foto-1")).toEqual({ kind: "photo", src: "/api/files/foto-1" });
  });

  it("genera un data URI válido sin foto, incluso con nombres largos o vacíos", () => {
    expect(customerFace({ name: "María" }).kind).toBe("blobatar");
    for (const identity of [{}, { name: "x".repeat(500) }, { name: "👩‍🦰 Ana" }]) {
      expect(customerFace(identity).src).toMatch(DATA_URI);
    }
  });
});
