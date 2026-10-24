import { describe, expect, test } from "vitest";
import { MAX_ACTIVITY, parseBusinessContext } from "./business-context";

describe("perfil del negocio como contexto", () => {
  test("acepta el perfil general, modelos combinados y una actividad libre", () => {
    expect(parseBusinessContext({ vertical: "general", businessModels: ["B2B", "B2C"], activity: "  Agencia   de marketing  " })).toEqual({ ok: true, value: { vertical: "general", businessModels: ["B2B", "B2C"], activity: "Agencia de marketing" } });
  });
  test("el modelo comercial y la actividad son opcionales", () => {
    expect(parseBusinessContext({ vertical: "gym", businessModels: [], activity: "" })).toMatchObject({ ok: true, value: { businessModels: [], activity: "" } });
    expect(parseBusinessContext({ vertical: "gym", businessModels: undefined, activity: undefined })).toMatchObject({ ok: true });
  });
  test("quita modelos repetidos y rechaza lo desconocido", () => {
    expect(parseBusinessContext({ vertical: "retail", businessModels: ["B2C", "B2C"], activity: "" })).toMatchObject({ ok: true, value: { businessModels: ["B2C"] } });
    expect(parseBusinessContext({ vertical: "nada", businessModels: [], activity: "" })).toMatchObject({ ok: false, field: "vertical" });
    expect(parseBusinessContext({ vertical: "gym", businessModels: ["B2X"], activity: "" })).toMatchObject({ ok: false, field: "businessModels" });
    expect(parseBusinessContext({ vertical: "gym", businessModels: [], activity: "x".repeat(MAX_ACTIVITY + 1) })).toMatchObject({ ok: false, field: "activity" });
  });
});
