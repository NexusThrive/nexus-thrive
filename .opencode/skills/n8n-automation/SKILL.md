---
name: n8n-automation
description: Diseña y opera workflows de n8n autenticados e idempotentes sin delegar en n8n la decisión de qué código es correcto.
metadata:
  opencode/autoinvoke: true
---

# n8n: automatización externa

## Principios

- n8n coordina eventos; **no** decide calidad ni corrección.
- La inteligencia vive en el orquestador y el estado canónico.
- Webhooks siempre autenticados (`Authorization: Bearer <token>`).
- Idempotencia obligatoria: `idempotency_key` único por evento.
- Reintentos acotados, errores registrados, sin duplicar operaciones.

## Flujos versionados

| Flujo | Evento | Endpoint |
|---|---|---|
| A nueva solicitud | `task.request` | `/webhooks/n8n/A` |
| B conocimiento | `knowledge.update` | `/webhooks/n8n/B` |
| C sprint | `sprint.run` | `/webhooks/n8n/C` |
| D recuperación | `recovery` | `/webhooks/n8n/D` |
| E CI/revisión | `task.request` | `/webhooks/n8n/E` |
| F informes | `sprint.run` | `/webhooks/n8n/F` |
| G notificaciones | `task.request` | `/webhooks/n8n/G` |
| H investigación | `knowledge.update` | `/webhooks/n8n/H` |

## Operación

1. Arranca el puente autenticado:
   `NEXUS_WEBHOOK_TOKEN=... scripts/nexus-eng serve --host 127.0.0.1 --port 8787`.
2. Importa el JSON desde `integrations/n8n/workflows/` (n8n no está instalado en
   este entorno: la importación no está verificada).
3. Crea la credencial `Header Auth` con el token; nunca lo escribas en el JSON.
4. Prueba un evento y repítelo: la segunda respuesta debe ser `duplicate`.
5. Revisa `scripts/nexus-eng workflow-history`.

## Prohibiciones

- No exponer webhooks administrativos sin autenticación.
- No incluir secretos en exportaciones.
- No automatizar inicios de sesión ni eludir límites de proveedores.
- No promover a producción desde n8n.
