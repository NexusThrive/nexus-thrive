---
id: XI.00.00
capa_padre: XI.00
titulo: "Contenedor de obra"
type: contenedor
ruta: "/projects/[projectId]"
tabs: 5
created: 2026-10-10
updated: 2026-10-10
tags: [capas, construccion, contenedor, proyecto, tabs]
---

# 00 — Contenedor de obra

> Una **obra = un proyecto = un contenedor**. Toda la vertical de construcción se navega desde **dentro** del proyecto, no desde módulos sueltos del menú.

## Ruta

```
app/[tenant]/(app)/projects/[projectId]/
```

El contenedor es **project-scoped**: el `projectId` es el contexto de todo lo que se hace (presupuesto, cronograma, bitácora, informes).

### Decisión de ruta (resuelta 2026-10-16)

- La obra es un recurso propio: `app/[tenant]/(app)/projects/[projectId]`.
- Las cotizaciones son versiones emitidas desde el presupuesto de la obra: pestaña **Cotizaciones** del contenedor y directorio `/quotes` con una carpeta por obra.
- El catálogo APU vive en `/catalog` (importador en `/catalog/import`).
- Las rutas anteriores (`/quotes/projects/...`, `/quotes/import`) redirigen.

## Las 5 tabs

| # | Tab | Capas del dominio | Propósito |
| --- | --- | --- | --- |
| 1 | **Ficha, Cliente & Encabezado** | I · II · IV · XIII | identificar partes, ubicación, roles, emisor |
| 2 | **Presupuestador APU & AIU** | III | biblioteca APU, capítulos, cantidades, AIU, snapshot |
| 2b | **Cotizaciones** | III · IV | versiones emitidas, aprobación del cliente, seguimientos |
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

- `Project` existe en Prisma; presupuesto, plan y bitácora nacen con la obra.
- Reutiliza `Customer` (CRM) como maestro de terceros.
