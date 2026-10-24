import { describe, expect, test } from "vitest";
import { z } from "zod";
import { describeOperation, isAvailable, runOperation } from "./engine";
import { defineOperation, OperationError, type OperationContext } from "./types";

const ctx = (over: Partial<OperationContext> = {}): OperationContext => ({
  tenantId: "t1",
  role: "OWNER",
  activeModules: ["crm", "finance"],
  actor: { type: "USER", id: "u1" },
  ...over,
});

const echo = defineOperation({
  id: "demo.echo",
  title: "Eco",
  description: "Devuelve lo que recibe.",
  module: "crm",
  permission: null,
  risk: "read",
  input: z.object({ text: z.string().min(2), times: z.number().int().min(1).max(3).default(1) }),
  output: z.object({ text: z.string() }),
  // Devuelve un campo de más a propósito: la salida debe recortarlo.
  handler: async (_ctx, input) => ({ text: input.text.repeat(input.times), secret: "no debe salir" }) as never,
});
const money = defineOperation({
  id: "demo.money",
  title: "Dinero",
  description: "Solo quien maneja dinero.",
  module: "finance",
  permission: "money.handle",
  risk: "read",
  input: z.object({}),
  output: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});
const OPS = [echo, money];

async function code(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (e) {
    return e instanceof OperationError ? e : (e as Error);
  }
}

describe("motor de operaciones", () => {
  test("ejecuta, aplica valores por defecto y recorta la salida a lo declarado", async () => {
    expect(await runOperation(OPS, ctx(), "demo.echo", { text: "ab" })).toEqual({ text: "ab" });
    expect(await runOperation(OPS, ctx(), "demo.echo", { text: "ab", times: 2 })).toEqual({ text: "abab" });
  });

  test("operación desconocida → 404", async () => {
    const err = await code(runOperation(OPS, ctx(), "demo.nada", {}));
    expect(err).toMatchObject({ code: "unknown_operation", status: 404 });
  });

  test("módulo inactivo → 403, antes de mirar la entrada", async () => {
    const err = await code(runOperation(OPS, ctx({ activeModules: ["finance"] }), "demo.echo", { text: "" }));
    expect(err).toMatchObject({ code: "module_inactive", status: 403 });
  });

  test("sin permiso → 403 (recepción no maneja dinero… sí; un rol desconocido no)", async () => {
    const err = await code(runOperation(OPS, ctx({ role: "NO_EXISTE" }), "demo.money", {}));
    expect(err).toMatchObject({ code: "forbidden", status: 403 });
    expect(await runOperation(OPS, ctx({ role: "OWNER" }), "demo.money", {})).toEqual({ ok: true });
  });

  test("entrada inválida → 422 con la ruta de cada problema", async () => {
    const err = (await code(runOperation(OPS, ctx(), "demo.echo", { text: "a", times: 9 }))) as OperationError;
    expect(err).toMatchObject({ code: "invalid_input", status: 422 });
    expect(err.issues?.map((i) => i.path).sort()).toEqual(["text", "times"]);
  });

  test("entrada ausente se trata como objeto vacío", async () => {
    const err = (await code(runOperation(OPS, ctx(), "demo.echo", undefined))) as OperationError;
    expect(err.code).toBe("invalid_input");
  });

  test("isAvailable respeta módulo y permiso (lo que ve una llave)", () => {
    expect(isAvailable(echo, ctx())).toBe(true);
    expect(isAvailable(money, ctx({ activeModules: ["crm"] }))).toBe(false);
    expect(isAvailable(money, ctx({ role: "NO_EXISTE" }))).toBe(false);
  });

  test("describeOperation entrega JSON Schema de entrada y salida", () => {
    const d = describeOperation(echo);
    expect(d.id).toBe("demo.echo");
    expect(d.inputSchema).toMatchObject({ type: "object", required: ["text"] });
    expect(d.outputSchema).toMatchObject({ type: "object" });
  });
});
