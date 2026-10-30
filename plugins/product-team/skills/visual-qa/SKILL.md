---
name: visual-qa
description: Verifica interfaces reales con Playwright, capturas y comparación de estados; bloquea regresiones sin confundir capturas con una auditoría completa de UX.
---

# QA visual

## Alcance

- Flujos críticos implementados (no rutas inventadas).
- Estados vacío, carga, error, éxito y permisos.
- Breakpoints definidos por el producto.
- Regresiones visuales y de interacción.

## Procedimiento

1. Lista los flujos y rutas reales desde `app/` y confirma cómo se levantan con datos de prueba.
2. Ejecuta Playwright con una resolución y dispositivo declarados.
3. Captura antes y después cuando exista baseline aprobada.
4. Registra cada diferencia con ruta, selector, viewport, severidad y evidencia.
5. Comprueba teclado y foco en los flujos modificados.
6. Repite tras la corrección y emite veredicto independiente.

## Límites

- Una captura correcta no demuestra que el flujo tenga sentido.
- No apruebes porque el build compila.
- No uses servicios externos inestables si se pueden simular de forma segura.
- No modifiques el código que estás evaluando.

## Evidencia

- Comando ejecutado y resultado.
- Capturas o trazas en la ruta acordada.
- Lista de diferencias aceptadas con motivo.
- Veredicto: aprobado, cambios solicitados o bloqueado.
