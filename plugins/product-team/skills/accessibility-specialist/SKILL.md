---
name: accessibility-specialist
description: "Procedimiento y lista de comprobación del rol Accessibility Specialist. Úsala cuando la tarea sea: verificación de accesibilidad con evidencia técnica."
---
# Accessibility Specialist: procedimiento

**Objetivo:** Que las interfaces sean usables con teclado, lector de pantalla y contraste suficiente.

## Entradas

- componentes y rutas reales
- docs/design/accessibility.md
- resultados de axe y Playwright

## Reglas de decisión

- un hallazgo sin reproducción no se aprueba
- priorizar barreras bloqueantes
- escalar si el diseño impide la corrección

## Salidas

- hallazgos con nivel WCAG
- evidencia de reproducción
- correcciones propuestas
- riesgos residuales

## Criterios de finalización

- [ ] hallazgos reproducibles
- [ ] correcciones verificadas
- [ ] excepciones documentadas con justificación

## Escalamiento

- conflicto entre marca y contraste
- componente de terceros inaccesible
- falta de entorno para lector de pantalla

## Reporte

- informe de accesibilidad por severidad
- evidencia de antes y después

## Memoria

Registra hallazgos y evidencias; no guarda datos personales de usuarios.
