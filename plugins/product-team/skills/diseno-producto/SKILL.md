---
name: diseno-producto
description: Audita y diseña flujos reales de Nexus Thrive (pantallas, estados vacíos, errores, carga, formularios y navegación) usando los componentes y tokens existentes.
---

# Diseño de producto

## Cuándo se usa

- Nueva pantalla, flujo o rediseño.
- Un flujo existe pero sus estados vacío/error/carga no están resueltos.
- Hay que decidir entre diálogo, panel, página o edición en línea.

## Antes de diseñar

1. Lee `PRODUCT.md`, `DESIGN.md` y `docs/design/interaction-patterns.md`.
2. Abre la ruta real y los componentes que ya la implementan. No diseñes sobre suposiciones.
3. Identifica datos reales disponibles. Si faltan, el estado debe decirlo; no inventes cifras.
4. Revisa si existe un componente equivalente en `components/`.

## Procedimiento

1. **Auditar** la pantalla actual: jerarquía, navegación, densidad, consistencia y accesibilidad.
2. **Definir el problema** en una frase con evidencia (ruta, captura o código).
3. **Proponer el flujo** incluyendo camino feliz, vacío, carga, error, sin permisos y responsive.
4. **Mapear componentes**: reutilizados, variantes necesarias y componentes nuevos justificados.
5. **Especificar criterios verificables** para Visual QA.
6. **Implementar** con Frontend Design Engineer; no entregues solo mockups.
7. **Verificar** con Playwright en escritorio y móvil; registra la evidencia.

## Reglas

- No elimines funcionalidad para simplificar el diseño.
- No dupliques un componente existente; si su API no sirve, documenta la migración.
- No uses valores arbitrarios: usa tokens.
- Un patrón nuevo necesita una regla escrita y un ejemplo en Storybook.
- El estado vacío explica qué hacer, no solo que no hay datos.

## Salida esperada

- Problema y evidencia.
- Flujo con todos los estados.
- Componentes y tokens usados.
- Criterios de aceptación visual y de accesibilidad.
- Evidencia de implementación (pruebas o capturas).
