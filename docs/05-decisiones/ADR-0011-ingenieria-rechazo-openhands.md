# ADR 0011 — Rechazo de OpenHands como plataforma de ejecución

- **Fecha:** 2026-10-25
- **Estado:** aceptada

## Contexto

Se evaluó OpenHands (`OpenHands/OpenHands`, MIT) como posible plataforma para
ejecutar agentes de programación de forma aislada. El repositorio ya opera con
OpenCode y Claude Code sobre un núcleo propio, y no tiene un problema de
ejecución remota sin resolver.

## Decisión

**No se adopta.** OpenHands exige un runtime adicional (uv, Node 24 y, para el
modo completo, Docker), mantiene su propio servidor y su propio modelo de
agentes. Eso duplica el harness, agrega superficie operativa y de seguridad, y
no cubre ninguna carencia actual del equipo.

Criterios aplicados (los mismos del registro de skills):

| Criterio | Resultado |
|---|---|
| Función | Ejecución de agentes en contenedor — ya cubierta por los clientes actuales |
| Mantenimiento | Activo, pero con releases frecuentes que exigirían seguimiento |
| Licencia | MIT, compatible |
| Dependencias | uv + Node 24 + Docker opcional; desproporcionado para el estado actual |
| Permisos | Contenedores, red, modelos y almacenamiento |
| Solapamiento | Alto con OpenCode y Claude Code |
| Prueba | No se despliega; no hay hipótesis que justifique la prueba |
| Rollback | Trivial (no se instala), pero el coste de adopción no lo compensa |

## Consecuencias

- El trabajo sigue ocurriendo en los clientes existentes y en CI.
- Si en el futuro aparece una necesidad real de ejecución aislada (por ejemplo,
  correr código no confiable de terceros), se reevalúa con una hipótesis
  concreta y una revisión de seguridad del despliegue.
- La decisión queda registrada para no repetir la evaluación desde cero.

## Alternativas descartadas

- **Adoptarlo «por si acaso»:** infraestructura sin caso de uso.
- **Usarlo solo en local con Docker:** sigue duplicando el harness y añade un
  segundo modelo de agentes que no comparte el estado canónico.
