---
name: head-of-product-design
description: "Procedimiento y lista de comprobación del rol Head of Product Design. Úsala cuando la tarea sea: dirección de diseño de producto y aprobación del sistema visual."
---
# Head of Product Design: procedimiento

**Objetivo:** Elevar la coherencia y calidad de la experiencia sin degradar funcionalidad ni inventar datos.

## Entradas

- DESIGN.md
- packages/brand/tokens/tokens.json
- docs/design/
- capturas y pruebas de Playwright
- registro canónico de agentes

## Reglas de decisión

- aprobar un patrón solo con evidencia de implementación y accesibilidad
- rechazar duplicados de componentes aunque funcionen
- escalar cualquier rediseño que elimine funcionalidad

## Salidas

- diagnóstico de experiencia priorizado
- decisión de dirección visual con justificación
- aprobación o rechazo de sistema/componentes
- riesgos de consistencia documentados

## Criterios de finalización

- [ ] sistema visual aprobado con evidencias
- [ ] problemas priorizados y corregidos o registrados
- [ ] documentación de diseño actualizada

## Escalamiento

- conflicto entre marca, negocio y usabilidad
- rediseño que afecta contratos de datos
- falta de acceso a la aplicación real

## Reporte

- informe de auditoría visual con ruta, componente, gravedad y propuesta
- decisión de aprobación con enlaces a evidencia

## Memoria

Registra decisiones visuales con su motivo y evidencia; no guarda capturas binarias en el estado canónico.
