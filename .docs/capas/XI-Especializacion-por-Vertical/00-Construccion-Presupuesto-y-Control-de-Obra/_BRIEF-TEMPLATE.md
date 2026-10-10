---
id: XI.00.TEMPLATE
capa: "XI — ESPECIALIZACIÓN POR VERTICAL"
titulo: "Plantilla de brief por capa de dominio (Construcción)"
type: plantilla
created: 2026-10-10
updated: 2026-10-10
tags: [capas, estructura, construccion, plantilla, brief]
---

# Plantilla de brief por capa de dominio

Toda capa del vertical de construcción se documenta con esta estructura de **14 secciones**. Es la plantilla derivada del brief de *Cliente & Receptor* (Capa I), con una sección nueva (**14. Entidades & Campos**) para el diseño concreto del modelo de datos.

> Copiá este archivo al directorio del tab que corresponda, renombrá a `<Roma>-<Nombre>.md` y completá.

---

## Frontmatter

```yaml
---
id: XI.00.<ROMA>            # ej. XI.00.I
capa_padre: XI.00
tab: <n>                    # 1..5
dominio: "<Nombre de la capa>"
rama: "feature/construction-apu-engine"
escalera: "N0 · N1 · N2 · N3 · N4"
estado: borrador | validado
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [capas, construccion, <dominio>]
---
```

---

## 01. Rol, contexto y responsabilidad

Actúa como **Senior Software Architect, Senior Full-Stack Engineer y Domain Architect** especializado en sistemas multi-tenant (Next.js App Router, TypeScript, Prisma, PostgreSQL, SaaS).

Responsabilidad: implementar el dominio **\<Nombre\>** con criterio arquitectónico, sin tratarlo como un formulario plano.

**Reglas fundamentales** (heredadas del brief de referencia):

1. No asumir que modelos/servicios existen como se describen. **Inspeccionar el repo primero.**
2. Reutilizar modelos y servicios existentes cuando sean adecuados.
3. No duplicar entidades del CRM.
4. No introducir abstracciones sin justificar.
5. No sustituir convenciones existentes por preferencias personales.
6. No inventar campos, estados, relaciones ni integraciones ficticias.
7. No marcar una capacidad como lista si solo existe su representación visual.
8. No declarar compilación/prueba/migración exitosa sin haberla ejecutado.

## 02. Dominio, problema y objetivo funcional

- **Problema que resuelve.**
- **Objetivo** (lista de capacidades).
- **Límite funcional** (qué NO absorbe esta capa; relaciones conceptuales con las demás).

## 03. Fase cero — auditoría obligatoria del repositorio

Inspeccionar y reportar: rama/estado Git · rutas relacionadas · contrato Prisma y migraciones · `Customer` y relaciones · `Tenant` y aislamiento · entidades de cotización/proyecto/terceros · servicios de acceso a datos · auth/permisos · server actions/validaciones · componentes UI · sistema visual · pruebas/scripts.

**Entregable:** plan con estado actual, reutilizable, carencias, riesgos, archivos a tocar, entidades nuevas necesarias, dependencias, orden de ejecución y criterios de aceptación.

## 04. Contrato conceptual del dominio

Qué es **maestro**, qué es **contextual**, qué es **histórico**, qué son **asignaciones**.

## 05. Multi-tenant, autorización y seguridad

- Aislamiento por tenant (no confiar en `tenantId` del formulario).
- Autorización por operación (consultar/crear/modificar/asignar/aprobar ≠ autenticarse).
- Protección de información y documentos; validación en servidor; sin datos sensibles en logs.

## 06. Escalamiento N0–N4

- **N0 — Fundamento:** modelo conceptual y relaciones indispensables.
- **N1 — Baseline operativo (V1/BETA):** registrar y operar el flujo esencial sin datos mock.
- **N2 — Gestión integral:** vinculación documental y de equipos.
- **N3 — Control avanzado:** indicadores de desviación y alertas.
- **N4 — Optimización estratégica:** previsión y decisiones de cartera.

Cada nivel con **Criterio de aceptación** verificable.

## 07. Contrato de experiencia de usuario

- Organización del formulario/vista en secciones coherentes.
- **Estados obligatorios:** default · loading · empty · error · success · disabled · partial.
- Comportamiento (búsquedas, permisos, errores, accesibilidad, responsive).

## 08. Lógica de negocio y operaciones

- Operaciones del servidor (crear/consultar/vincular/asignar/actualizar…).
- Validaciones funcionales (pertenencia al tenant, campos por etapa, compatibilidades).
- No imponer nombres de archivos/firmas antes de ver la organización existente.

## 09. Integridad, historial y consistencia documental

Política explícita para cambios posteriores a la formalización de una oferta/acta. Distinguir: 1) maestro actual · 2) contextual · 3) histórico en documentos · 4) asignaciones vigentes vs. anteriores.

## 10. Estrategia de implementación

Fases **A** diagnóstico y diseño · **B** fundamento del dominio · **C** baseline funcional · **D** operaciones y estados · **E** verificación · **F** informe y siguiente nivel.

## 11. Criterios de aceptación

Checklist por: **Dominio · Seguridad · Integridad · Interfaz · Verificación técnica** (tsc, lint, tests, prisma validate/generate, build, migraciones — con los scripts reales del `package.json`).

## 12. Informe final obligatorio

Secciones A–H: diagnóstico · plan ejecutado · archivos modificados · dominio resultante · funcionalidades (completada y verificada / implementada no verificada / parcial / pendiente) · verificación (comando · resultado real) · riesgos y limitaciones · próxima fase.

## 13. Instrucción final de ejecución

Inspeccionar repo/Git → presentar plan → implementar el alcance autorizado por fases, preservando cambios existentes, respetando el multi-tenant y verificando cada incremento. **Priorizar coherencia funcional sobre cantidad de archivos declarados.**

---

## 14. Entidades & Campos ▸ (sección NUEVA)

> Esta sección es la que convierte el brief en un **modelo de datos diseñable**. Una subsección por entidad.

### Entidad: `<Nombre>` (`PrismaModel`)

**Concepto:** qué representa y por qué existe (1–2 líneas).
**Naturaleza:** maestro | contextual | histórico | asignación.
**Capa:** XI.00.\<ROMA\> · **¿Nueva o reutilizada?** (si reutiliza, indicar el modelo existente).

**Campos**

| campo | tipo | req | default | descripción |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ | — | PK |
| tenantId | uuid | ✓ | — | aislamiento multi-tenant |
| … | … | … | … | … |

**Relaciones** (cardinalidad + destino):

- `Entidad` N—1 `Otra` …
- `Entidad` 1—N `Otra` …

**Reglas / validaciones:**

- …

**Estados** (si aplica): `…` → `…`

**Índices / unicidad:** `(tenantId, …) único`

**APIs / acciones:** crear · consultar · asignar · retirar · confirmar …

**Permisos:** quién puede ver/crear/editar/asignar.

**Integraciones:** otras capas / módulos (CRM, VI.03 documental, VII finanzas…).

**Decisiones abiertas:** …
