# ADR 0005 — Puente HTTP autenticado para n8n

- **Fecha:** 2026-10-25
- **Estado:** reemplazada por 0013

## Contexto

n8n debe poder disparar solicitudes, recuperaciones e informes, pero no debe
decidir si el código es correcto ni exponer administración sin autenticación. Los
webhooks tienen que ser idempotentes: n8n reintenta.

## Decisión

`nexus-eng serve` expone un `ThreadingHTTPServer`:

| Ruta | Auth | Función |
|---|---|---|
| `GET /health` | no | liveness |
| `GET /status`, `/next`, `/knowledge` | Bearer | lectura de estado |
| `POST /webhooks/n8n/{A..H}` | Bearer | eventos idempotentes |

Controles:

- token obligatorio (mínimo 16 caracteres); sin él el servidor no arranca;
- comparación con `hmac.compare_digest`;
- cuerpo máximo 64 KiB; JSON y contrato validados;
- eventos en lista blanca;
- comprobación de idempotencia y registro bajo el mismo `flock`;
- errores redactados, sin cuerpo ni cabeceras en logs.

## Consecuencias

- Probado de extremo a extremo en `tests/test_server.py` (401, 400, 413,
  duplicado sin crear dos tareas).
- No incluye TLS: debe ir detrás de proxy TLS o en red privada.
- n8n real no está instalado; la importación de workflows no está verificada.

## Alternativas descartadas

- **Webhook sin auth:** rechazado por riesgo evidente.
- **n8n llamando directamente a la CLI por SSH:** difícil de autenticar y de
  auditar; además acopla n8n a la máquina.
- **Cola de mensajes:** infraestructura no justificada para el volumen actual.
