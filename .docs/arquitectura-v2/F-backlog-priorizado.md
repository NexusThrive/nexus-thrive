---
title: F · Backlog priorizado
tags: [arquitectura, backlog, dependencias]
updated: 2026-10-25
---

# F · Backlog priorizado

El orden refleja **dependencias verificadas**, no el número de capa. Los identificadores originales no cambian; la prioridad vive aquí. Excepciones al orden lógico del encargo: el contrato N0 va primero en todas las subcapas (decisión F01), y los avisos (VI.08) suben antes de GYM-6 porque lo necesita.

| Prio | Bloque | Qué | Depende de | Bloqueo a resolver | Criterio de salida |
|---|---|---|---|---|---|
| 0 | Documentación | Aprobar este PR, retirar los «Técnico» duplicados (E-09), corregir E-07 y E-11 | — | G-01 | Casillas y estados reconciliados |
| 1 | Core | Contrato N0 y pruebas de aislamiento de I.00, I.02, I.03, I.04, I.06 | — | — | Compuerta N0 verde por subcapa |
| 1 | Core | I.07 respaldo y recuperación; X.03 privacidad (Ley 1581) | I.04 | G-05 (proveedor de respaldo) | Restauración probada en una base de pruebas |
| 2 | Compartidas | Contrato N0 de I.01, IV.00, V.00, VII.03, VI.04 y del dinero | Core | — | Contrato publicado; sin duplicar servicios |
| 2 | Compartidas | VI.08 avisos con panel y canales (WhatsApp, correo, push y toast) y III.00 canal único | I.05 | G-07 (proveedor de WhatsApp) | Un aviso sale por el canal elegido con registro |
| 2 | Compartidas | IX.03 exportar/importar en cada formato y envío programado | IX.01 | — | Cada recurso con las mismas columnas que la pantalla |
| 3 | Contratos | I.05/X.02 operaciones de escritura y MCP de escritura con aprobación; IX.04 + n8n | I.03, I.05 | — | Flujo de n8n de ejemplo con prueba de contrato |
| 4 | GYM | GYM-5/6 avisos, GYM-9 informe, resolver E-01 y E-02, prueba en dispositivo físico | Bloque 2 | G-03 | Checklist C sin filas RELLENAR críticas |
| 5 | RESTAURANTE | Decisión G-04; luego RST-4, RST-3, RST-5, RST-6, RST-7 | Bloques 2 y 3 | G-04 | Flujo mesa → comanda → cobro probado de punta a punta |
| 6 | Pruebas | Integración entre funciones, permisos, aislamiento y flujos completos (GYM y RESTAURANTE a la vez en una organización) | Bloques 4 y 5 | — | Una organización con ambas funciones activas, sin fugas |
| 7 | Aplazado | Talento Humano (VIII), II.06, III.03, V.07, VI.06, VI.07; GYM-10, RST-9, RST-10 | — | G-08 | Se retoman por demanda |

**Bloquean el avance hoy:** G-02 (dónde viven las funciones por rubro), G-04 (pedido de restaurante) y G-03 (campos de acceso en `Customer`).
