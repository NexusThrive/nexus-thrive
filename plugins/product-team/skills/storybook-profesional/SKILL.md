---
name: storybook-profesional
description: Crea y mantiene historias de Storybook con estados, variantes, patrones reales, accesibilidad y pruebas de interacción.
---

# Storybook profesional

## Regla base

Storybook es la referencia del equipo: debe mostrar cómo se construye y se comporta un componente real, no una galería de botones aislados.

## Cobertura mínima por componente relevante

- Estado normal, hover, focus-visible, disabled, loading y error cuando existan.
- Variantes y tamaños públicos.
- Composición real (formulario, tabla, navegación) cuando el componente participa en ella.
- Documentación de uso, tokens y límites.

## Procedimiento

1. Localiza las props y estados reales del componente.
2. Añade una historia por estado significativo; evita duplicar historias idénticas.
3. Usa `play` para interacción cuando el estado requiera acción.
4. Verifica accesibilidad con el addon a11y; no silencies violaciones sin justificación.
5. Ejecuta Storybook y las pruebas. Una historia que no renderiza es deuda.
6. Enlaza la historia desde la documentación de diseño cuando aporte.

## Reglas

- No inventes props, datos ni rutas.
- No uses datos que parezcan reales si son ficticios.
- No sustituyas la documentación canónica; enlázala.
- Las capturas de referencia se aprueban antes de usarse como baseline.

## Verificación

- `pnpm storybook` arranca.
- Historias nuevas renderizan en escritorio y móvil.
- Pruebas de interacción y a11y verdes o excepción registrada.
