---
title: E · Registro de inconsistencias
tags: [arquitectura, auditoria, inconsistencias]
updated: 2026-10-25
---

# E · Registro de inconsistencias

Solo se registran; **no se corrigió código**. Evidencia verificada el 2026-10-25 con búsquedas en el repositorio.

| ID | Tipo | Hallazgo | Evidencia | Regla afectada | Propuesta (para aprobar) |
|---|---|---|---|---|---|
| E-01 | Lógica de rubro en la interfaz | La ficha del cliente se comporta distinto si `vertical === "gym"` | `app/[tenant]/(app)/crm/[id]/page.tsx` líneas 102 y 148 | `distribucion-por-rubro.md` §5: «no se agregan condiciones `if (vertical === …)`» | Mover a la configuración de campos por rubro/función |
| E-02 | Campos de rubro en el Core | `Customer` lleva `accessCode` y `nfcUid`, propios del control de acceso | `prisma/contract.prisma` (modelo `Customer`, índices únicos por `tenantId`) | Regla 2: el Core no incorpora campos de GYM | Decidir (G-03): moverlos a una tabla del acceso o aceptarlos como identificadores genéricos de acceso |
| E-03 | Etiqueta por rubro | Textos por rubro en el registro y en una página (`vertical === "restaurant"`, `"construction"`) | `lib/capabilities/registry.ts` 262 y 309; `purchases/page.tsx` 26; `lib/navigation/quick-create.ts` 32 | Aceptado por el doc para etiquetas (§5); se registra por consistencia | Mantener; llevar al diccionario `VerticalTerms` si crece |
| E-04 | Función sin subcapa | Membresías, acceso, asistencia (GYM) y mesas, comandas, recetas (RESTAURANTE) no tienen subcapa propia; el mapa las manda a XI | `.docs/mapa-de-capacidades.md` («De un rubro → XI») | F12/F13: XI contradice «rubro = contexto» | Decisión G-02 |
| E-05 | Mezcla de carpetas | `lib/business/` mezcla Core/compartido (dinero, documentos, clientes) con gimnasio (`gym-db.ts`) y museo (`museum-db.ts`) | `ls lib/business` | Regla 1 y 3 (separación) | Mover a carpetas por función cuando se apruebe; no hay import cruzado entre gym y museo |
| E-06 | Duplicación de pedidos | Existen `orders` (`PLANNED`, sin pantalla real), `StoreOrder` (tienda) y ventas del POS | `registry.ts` 265–279; `StoreOrder`; `lib/pos` | Regla 4 (documentos con significado propio) | Decisión G-04 |
| E-07 | Doc contradictorio | `distribucion-por-rubro.md` §6 lista como «pendiente» al menos el buscador con funciones apagadas, que después se construyó (rama `plataforma/funciones-en-buscador`); el resto de esa tabla debe revisarse | `.docs/distribucion-por-rubro.md` | Trazabilidad | Actualizar el estado de esa tabla |
| E-08 | Falta de pruebas | Con casillas hechas pero sin pruebas halladas por el mapa de asociación (aproximado, a revisar): III.01, III.04, IV.00, IX.01, IX.02, IX.05, V.05, VI.00, VI.01, X.03. El acceso con tarjeta nunca se probó en un teléfono real | `A-checklist-maestro.md`; `docs/gym-acceso-nfc.md` | Criterio «verificable» | Ver F-backlog |
| E-09 | Duplicación de casillas | 528 casillas «Técnico» idénticas en N1–N4; quedan sin tocar para no reescribir los originales | `.docs/capas/**` (`#### Técnico`) | F02 (aceptada) | Retirarlas tras aprobar este PR, sustituidas por el contrato N0 |
| E-10 | Título y decisión no coinciden | X.01 se llama «White-label, dominios e identidad visual»; la decisión de transversales le asigna los portales externos | `X-Plataforma…/01-…/README.md` | Trazabilidad | G-06 |
| E-11 | Dato incorrecto previo | Se afirmó que el reporte semanal «corre por cron»; en el repositorio solo existe la ruta `/api/cron/webhooks` y `vercel.json` no la programa | `app/api/cron/webhooks/route.ts`; `vercel.json` | Honestidad del estado | Programar el cron (Vercel Cron, n8n o `curl`) o marcar la casilla como «no programado» |
| E-12 | Dependencia hacia arriba | La visibilidad (II) depende de lo comercial (IV, V); la bandeja (III.00) depende de IV.00 | `A-checklist-maestro.md`, columna *Dependencias* | F08 (aceptada) | El orden de construcción de F-backlog las corrige sin renumerar |

**Comprobado sin infracción:** ningún archivo de `app/` importa `@/prisma/db`; `lib/business` no importa entre sí gimnasio y museo; los modelos de membresía y asistencia llevan `tenantId` y `@@rls`.
