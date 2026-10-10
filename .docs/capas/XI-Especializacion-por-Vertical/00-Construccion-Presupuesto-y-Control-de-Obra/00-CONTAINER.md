---
id: XI.00.00
capa_padre: XI.00
titulo: "Contenedor de obra"
type: contenedor
ruta: "/quotes/projects/[projectId]"
tabs: 5
created: 2026-10-10
updated: 2026-10-10
tags: [capas, construccion, contenedor, proyecto, tabs]
---

# 00 — Contenedor de obra

> Una **obra = un proyecto = un contenedor**. Toda la vertical de construcción se navega desde **dentro** del proyecto, no desde módulos sueltos del menú.

## Ruta

```
app/[tenant]/(app)/quotes/projects/[projectId]/
```

El contenedor es **project-scoped**: el `projectId` es el contexto de todo lo que se hace (presupuesto, cronograma, bitácora, informes).

### Decisión de ruta abierta

- Coexisten hoy `app/[tenant]/(app)/quotes` (presupuestador actual) y `app/[tenant]/quotes/[id]/print`.
- **Por definir:** si el contenedor se anida bajo `quotes/projects/[projectId]` (como dice el brief) o si `Project` se promueve a recurso propio (`projects/[projectId]`) y `quotes` pasa a ser una de sus tabs. Ver capa III y el contrato con la capa VI.00 (Proyectos).
- Mientras se decide, **el brief manda**: `quotes/projects/[projectId]`.

## Las 5 tabs

| # | Tab | Capas del dominio | Propósito |
| --- | --- | --- | --- |
| 1 | **Ficha, Cliente & Encabezado** | I · II · IV · XIII | identificar partes, ubicación, roles, emisor |
| 2 | **Presupuestador APU & AIU** | III | biblioteca APU, capítulos, cantidades, AIU, snapshot |
| 3 | **Planificador Lean** | V | hitos, lookahead 6 sem, WWP, PPC |
| 4 | **Bitácora & Campo** | VII · VIII | diario de campo, evidencia fotográfica |
| 5 | **Informes & Exportación** | IX · XI · XII | Informe Cero/Semanal, explosión BOM, PDF |

## Persistencia y contexto

- Toda entidad del dominio lleva `tenantId` (aislamiento) y `projectId` (contexto), salvo las de catálogo global del tenant.
- La ficha base del contenedor (nombre de obra, cliente principal, estado) es el punto de entrada; el resto de tabs se habilitan según **madurez** (N0–N4) y **roles**.
- Los datos de la capa I (cliente, ubicación, roles) son **contextuales**: enlazan al maestro del CRM sin duplicarlo.

## Estados del contenedor (obra)

```
Borrador → Cotización → Contratada → En ejecución → Cerrada
                       (baseline)     (control)      (histórico)
```

- **Borrador / Cotización:** permiten datos incompletos (ubicación aproximada, sin interventoría).
- **Contratada:** exige baseline (Informe Cero) y datos mínimos completos.
- **En ejecución:** habilita cronograma, bitácora, informes semanales.
- **Cerrada:** congela lo histórico.

## Permisos por proyecto

- El rol de acceso lo define la **capa IV (Roles de obra)**: Líder de Proyecto / Residente, entre otros.
- La autorización es **por operación** (ver/crear/editar/asignar/aprobar), no solo por autenticación.

## Dependencias

- Requiere el modelo `Project` (aún **no existe** en Prisma). Es el prerrequisito estructural del contenedor. Ver plan en capa III / relación con VI.00.
- Reutiliza `Customer` (CRM) como maestro de terceros.
