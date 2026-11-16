---
id: XI.00.T1
capa_padre: XI.00
tab: 1
titulo: "Tab 1 · Ficha, Cliente & Encabezado"
type: tab
capas: "I · II · IV · XIII"
created: 2026-10-10
updated: 2026-10-10
tags: [capas, construccion, tab, cliente]
---

# Tab 1 — Ficha, Cliente & Encabezado

> Identifica las **partes** de la operación, la **ubicación** de la obra, los **roles de obra** y los **datos del emisor**. Es el encabezado de todos los documentos que genera la obra.

## Capas de este tab

| Capa | Nombre | Estado |
| --- | --- | --- |
| **I** | [Cliente & Receptor](I-Cliente-y-Receptor.md) | borrador · con Entidades & Campos |
| II | _por definir_ (inferido: Ubicación/Sitio) | pendiente |
| IV | _por definir_ (inferido: Roles de obra / Equipo) | pendiente |
| XIII | Datos de la Constructora (emisor) | pendiente |

## Contenido del tab (baseline N1)

- **Cliente & Receptor:** vinculación al tercero del CRM (`Customer`), NIT/cédula, ubicación de la obra e interventoría.
- **Datos de la Constructora:** nombre comercial, NIT, logo institucional, profesional elaborador (Ing./Arq. con matrícula) → capa XIII.
- **Roles de Obra:** asignación del Líder de Proyecto / Residente → capa IV.

## Notas

- Capas II, IV y XIII están **inferidas**; falta confirmar su nombre y alcance con el arquitecto.
- Toda la capa I es **contextual**: enlaza al maestro del CRM sin duplicarlo.
