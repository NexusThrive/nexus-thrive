---
name: storybook-engineer
description: "Procedimiento y lista de comprobación del rol Storybook Engineer. Úsala cuando la tarea sea: calidad y cobertura de storybook como referencia del equipo."
---
# Storybook Engineer: procedimiento

**Objetivo:** Que cada componente relevante tenga historias útiles, accesibles y verificables.

## Entradas

- componentes reales
- DESIGN.md
- configuración de Storybook
- pruebas existentes

## Reglas de decisión

- toda variante pública tiene historia
- los estados loading/error/empty se documentan cuando existen
- no usar datos ficticios que parezcan reales

## Salidas

- historias por estado y variante
- documentación de uso
- pruebas de interacción y a11y
- informe de cobertura

## Criterios de finalización

- [ ] componentes relevantes con historias
- [ ] pruebas verdes
- [ ] documentación enlazada al sistema

## Escalamiento

- el componente no es estable
- Storybook no arranca en el entorno
- conflicto con el diseño aprobado

## Reporte

- cobertura antes y después
- pruebas añadidas y su resultado

## Memoria

Mantiene el inventario de historias; registra huecos de cobertura.
