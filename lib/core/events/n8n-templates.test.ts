import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Las plantillas de n8n no pueden estar rotas ni a medias: el JSON es válido,
 * las conexiones apuntan a nodos que existen, no llevan llaves ni IDs de chat
 * reales, y la lógica de «ponerse al día» se ejecuta de verdad con n8n simulado.
 */
const DIR = join(process.cwd(), "docs/n8n/plantillas");
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
type Node = { name: string; type: string; parameters: Record<string, unknown> };
type Workflow = { name: string; nodes: Node[]; connections: Record<string, { main: { node: string }[][] }>; active: boolean };
const load = (f: string) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as Workflow;

describe("plantillas de n8n", () => {
  test("hay plantillas", () => expect(files.length).toBeGreaterThanOrEqual(2));

  test.each(files)("%s: estructura válida, conexiones coherentes, inactiva y sin secretos", (f) => {
    const wf = load(f);
    const names = new Set(wf.nodes.map((n) => n.name));
    expect(names.size).toBe(wf.nodes.length);
    for (const [from, outs] of Object.entries(wf.connections)) {
      expect(names.has(from), `origen ${from}`).toBe(true);
      for (const target of outs.main.flat()) expect(names.has(target.node), `destino ${target.node}`).toBe(true);
    }
    expect(wf.active).toBe(false); // se activa a mano, tras poner la llave
    const text = readFileSync(join(DIR, f), "utf8");
    expect(text).not.toMatch(/nx_(live|test)_[0-9a-f]{32}/);
    expect(text).not.toMatch(/whsec_[0-9a-f]{20,}/);
    expect(text).toContain("TU-DOMINIO");
  });

  const run = (wf: Workflow, nodeName: string, ctx: { state: Record<string, unknown>; input?: unknown }) => {
    const js = String(wf.nodes.find((n) => n.name === nodeName)!.parameters.jsCode);
    const fn = new Function("$getWorkflowStaticData", "$input", js);
    return fn(() => ctx.state, { first: () => ({ json: ctx.input }) }) as { json: Record<string, unknown> }[];
  };

  test("avisos de ventas: primera vez no repasa el historial; después avanza el cursor y no repite", () => {
    const wf = load("01-avisos-de-ventas.json");
    const state: Record<string, unknown> = {};
    const first = run(wf, "Leer cursor", { state })[0].json as { params: Record<string, unknown> };
    expect(first.params.since).toBeTruthy();
    expect(first.params.after).toBeUndefined();

    // Hay ventas: avisa y guarda el cursor.
    const feed = { data: { events: [{ type: "sale.completed", data: { receipt: "R-0007", amount: "50000.00", method: "CASH" } }, { type: "provider.event_received", data: {} }], next: "evt_9" } };
    const out = run(wf, "Armar avisos", { state, input: feed });
    expect(out).toHaveLength(1);
    expect(String(out[0].json.text)).toContain("R-0007");
    expect(state.after).toBe("evt_9");
    expect(state.since).toBeUndefined();

    // Siguiente vuelta: pide DESDE el cursor, no desde la fecha.
    const second = run(wf, "Leer cursor", { state })[0].json as { params: Record<string, unknown> };
    expect(second.params.after).toBe("evt_9");
    expect(second.params.since).toBeUndefined();
  });

  test("n8n apagado un rato: al volver el cursor viejo pide todo lo pendiente y avisa de cada venta", () => {
    const wf = load("01-avisos-de-ventas.json");
    const state: Record<string, unknown> = { after: "evt_9" }; // estado de antes del apagón
    expect((run(wf, "Leer cursor", { state })[0].json as { params: Record<string, unknown> }).params.after).toBe("evt_9");
    const pending = { data: { events: [1, 2, 3].map((n) => ({ type: "sale.completed", data: { receipt: `R-${n}`, amount: "1000", method: "CASH" } })), next: "evt_12" } };
    const out = run(wf, "Armar avisos", { state, input: pending });
    expect(String(out[0].json.text).split("\n")).toHaveLength(3);
    expect(state.after).toBe("evt_12");
  });

  test("sin novedades no manda mensajes ni mueve el cursor", () => {
    const wf = load("01-avisos-de-ventas.json");
    const state: Record<string, unknown> = { after: "evt_9" };
    expect(run(wf, "Armar avisos", { state, input: { data: { events: [], next: "evt_9" } } })).toEqual([]);
    expect(state.after).toBe("evt_9");
  });

  test("resumen diario: arma el mensaje con la comparación contra ayer", () => {
    const wf = load("02-resumen-diario.json");
    const input = { data: { days: 1, current: { income: 120000, expenses: 20000, balance: 100000, count: 5 }, previous: { income: 100000, expenses: 0, balance: 100000, count: 4 } } };
    const text = String(run(wf, "Armar mensaje", { state: {}, input })[0].json.text);
    expect(text).toContain("+20%");
    expect(text).toContain("Movimientos: 5");
    const none = String(run(wf, "Armar mensaje", { state: {}, input: { data: { current: { income: 0, expenses: 0, balance: 0, count: 0 }, previous: { income: 0, expenses: 0, balance: 0, count: 0 } } } })[0].json.text);
    expect(none).not.toContain("%");
  });
});
