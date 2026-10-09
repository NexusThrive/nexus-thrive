---
id: XI.00
capa: "XI — ESPECIALIZACIÓN POR VERTICAL"
titulo: "Construcción: presupuesto y control de obra"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# XI.00 — Construcción: presupuesto y control de obra

> Escalera de madurez de la subcapa **XI.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

## N0 — Fundamento de proyectos, catálogos y presupuestos de obra

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Presupuesto simple por capítulos, APU y AIU

#### Funcionalidad

- [x] Proyectos / obras
- [x] Presupuesto por capítulos y actividades
- [x] Catálogo de insumos
- [x] APU básico
- [x] Importar desde Excel
- [x] AIU
- [x] Exportar presupuesto a PDF / Excel

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Biblioteca de APU, versiones y memorias de cálculo

#### Funcionalidad

- [x] Biblioteca de APU reutilizable
- [ ] Insumos con precios por fecha y por ciudad/proveedor
- [ ] Actualización masiva de precios
- [ ] APU compuestos
- [x] Desperdicios y rendimientos
- [ ] Mano de obra con prestaciones
- [x] Importador inteligente
- [ ] Versiones del presupuesto
- [ ] Cantidades de obra
- [x] Análisis de insumos
- [ ] Cotización al cliente

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Control de obra: ejecutado, avance, requisiciones y subcontratos

#### Funcionalidad

- [ ] Presupuesto vs. ejecutado
- [ ] Cronograma
- [ ] Avance de obra
- [ ] Requisiciones y compras por obra
- [ ] Subcontratos
- [ ] Inventario por obra
- [ ] Control de personal de obra
- [ ] Bitácora de obra
- [ ] Caja menor por obra
- [ ] Órdenes de cambio / adicionales
- [ ] Control de pagos del cliente

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Máximo: valor ganado, portafolio multiobra y SG-SST

#### Funcionalidad

- [ ] Control de costos con valor ganado (EVM)
- [ ] Portafolio multiobra
- [ ] Licitaciones
- [ ] Pólizas y garantías
- [ ] Seguridad y salud (SG-SST)
- [ ] Calidad
- [ ] Maquinaria y equipos
- [ ] Integración con planos
- [ ] IA
- [ ] App móvil de obra
- [ ] Portal del cliente / interventoría
- [ ] Integración con contabilidad

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio
