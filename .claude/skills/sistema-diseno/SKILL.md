---
name: sistema-diseno
description: Gobierna tokens, componentes, variantes y reglas de composición de Nexus para evitar duplicados y valores arbitrarios.
---

# Sistema de diseño

## Fuente de verdad

- Tokens: `packages/brand/tokens/tokens.json` y su espejo CSS `packages/brand/css/tokens.css`.
- Reglas: `DESIGN.md` y `docs/design/`.
- Componentes: `components/atoms`, `components/molecules`, `components/organisms`.
- Referencia visual: Storybook.

## Auditoría

1. Busca valores literales repetidos (colores, radios, sombras, espaciados) fuera de tokens.
2. Busca componentes con la misma responsabilidad y distinta API.
3. Comprueba que el espejo JSON y CSS coincidan.
4. Revisa estados: hover, focus-visible, active, disabled, loading, error.
5. Revisa contraste y foco en tema claro/oscuro si existe.

## Cambios

1. Todo token nuevo necesita: nombre semántico, valor, caso de uso y consumidores.
2. Todo componente nuevo necesita: caso de uso, variantes, estados, accesibilidad y historia.
3. Un cambio incompatible requiere migración y nota en `DESIGN.md`.
4. Actualiza JSON y CSS en el mismo cambio.
5. Ejecuta las pruebas de componentes y Storybook antes de proponer integración.

## Prohibido

- Crear un segundo sistema paralelo.
- Introducir una paleta nueva sin estudiar logotipo, contraste e identidad.
- Duplicar un componente porque es más rápido que extenderlo.
- Dejar una variante sin estado de accesibilidad documentado.

## Criterio de finalización

- Inventario actualizado.
- Duplicados justificados o eliminados.
- Documentación y Storybook coherentes con el código.
