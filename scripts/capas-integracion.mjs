// Escribe la «Superficie de integración (API · MCP · Webhooks)» en el README de
// cada subcapa de .docs/capas, entre <!-- integracion:inicio --> y
// <!-- integracion:fin -->. Es idempotente: conserva las casillas ya marcadas.
// Los datos viven en scripts/capas-integracion.data.mjs; las reglas, en
// .docs/integracion-api-mcp-webhooks.md.
//
//   node scripts/capas-integracion.mjs            muestra qué cambiaría (no escribe)
//   node scripts/capas-integracion.mjs --write    escribe los README

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPERFICIE } from "./capas-integracion.data.mjs";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const capasDir = join(root, ".docs/capas");
const START = "<!-- integracion:inicio -->";
const END = "<!-- integracion:fin -->";
const code = (list) => (list.length ? list.map((x) => `\`${x}\``).join(", ") : "—");

function section(id, s, previous) {
  const was = (label) => (previous.get(label) ? "x" : " ");
  const items = [
    [`API REST de lectura: ${s.api.join(", ")} (N1–N2)`, "api-lectura"],
    [`API de escritura con idempotencia y permisos (N2)`, "api-escritura"],
    [`Eventos de dominio al outbox y webhooks firmados: ${s.events.join(", ")} (N3)`, "eventos"],
    [`Herramientas MCP de lectura: ${s.read.join(", ")} (N2)`, "mcp-lectura"],
    ...(s.write.length ? [[`Herramientas MCP de escritura con aprobación: ${s.write.join(", ")} (N3–N4)`, "mcp-escritura"]] : []),
    [`Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3)`, "docs"],
  ];
  return [
    START,
    "## 🔌 Superficie de integración (API · MCP · Webhooks)",
    "",
    "> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).",
    "",
    "| Superficie | Detalle |",
    "| --- | --- |",
    `| API REST (\`/api/v1\`) | ${code(s.api)} |`,
    `| Eventos (outbox → webhooks) | ${code(s.events)} |`,
    `| MCP · lectura | ${code(s.read)} |`,
    `| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | ${code(s.write)} |`,
    `| Sistemas externos (puertos y adaptadores) | ${s.ext.length ? s.ext.join("; ") : "—"} |`,
    "",
    "#### Integración",
    "",
    ...items.map(([text, key]) => `- [${was(key)}] ${text} <!-- ${key} -->`),
    END,
    "",
  ].join("\n");
}

const write = process.argv.includes("--write");
let touched = 0;
const missing = new Set(Object.keys(SUPERFICIE));

for (const capa of readdirSync(capasDir, { withFileTypes: true })) {
  if (!capa.isDirectory()) continue;
  for (const sub of readdirSync(join(capasDir, capa.name), { withFileTypes: true })) {
    const file = join(capasDir, capa.name, sub.name, "README.md");
    if (!sub.isDirectory() || !existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    const id = text.match(/^id: (.+)$/m)?.[1]?.trim();
    const data = SUPERFICIE[id];
    if (!data) {
      console.warn(`Sin datos de integración para ${id ?? file}`);
      continue;
    }
    missing.delete(id);

    // Casillas ya marcadas (clave en el comentario final de cada línea).
    const previous = new Map();
    const i0 = text.indexOf(START);
    const i1 = text.indexOf(END);
    if (i0 >= 0 && i1 > i0) {
      for (const m of text.slice(i0, i1).matchAll(/^- \[(x| )\] .* <!-- ([\w-]+) -->$/gm)) previous.set(m[2], m[1] === "x");
    }

    const block = section(id, data, previous);
    let next;
    if (i0 >= 0 && i1 > i0) {
      next = text.slice(0, i0) + block + text.slice(i1 + END.length).replace(/^\n/, "");
    } else {
      const heading = text.search(/^## /m);
      if (heading < 0) throw new Error(`${file}: no tiene secciones ##`);
      next = text.slice(0, heading) + block + "\n" + text.slice(heading);
    }
    if (next !== text) {
      touched++;
      if (write) writeFileSync(file, next);
    }
  }
}
if (missing.size) console.warn(`Datos sin README: ${[...missing].join(", ")}`);
console.log(`${write ? "Escritas" : "Por escribir"}: ${touched} subcapas`);
