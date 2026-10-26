# n8n — automatización externa

n8n **no** decide si el código es correcto. Coordina eventos y entrega payloads
autenticados al núcleo; el orquestador, las compuertas y la revisión independiente
siguen siendo la autoridad.

## Estado real en este entorno

| Elemento | Estado |
|---|---|
| Workflows A–H versionados | Generados y validados como JSON |
| Esquemas de payload | Generados (`schemas/`) |
| Puente HTTP del núcleo | Implementado y probado (`tests/test_server.py`) |
| Autenticación Bearer | Implementada; el servidor no arranca sin token |
| Idempotencia | Implementada con `idempotency_key` y bloqueo de estado |
| n8n instalado / workflows importados | **No verificado** (n8n no está instalado) |
| Credenciales reales | **No disponibles** |
| Notificaciones a Slack/email | **No configuradas** |

No se declara ninguna integración operativa más allá de lo que se puede probar.

## Workflows

| Flujo | Archivo | Disparador | Evento |
|---|---|---|---|
| A nueva solicitud | `A-nueva-solicitud.json` | Webhook `/nexus/a` | `task.request` |
| B conocimiento | `B-actualizacion-conocimiento.json` | Webhook `/nexus/b` | `knowledge.update` |
| C sprint | `C-ejecucion-sprint.json` | Webhook `/nexus/c` | `sprint.run` |
| D recuperación | `D-recuperacion.json` | Cada 15 min | `recovery` |
| E CI y revisión | `E-ci-revision.json` | Webhook `/nexus/e` | `task.request` |
| F informes | `F-informes.json` | Cada 24 h | `sprint.run` |
| G notificaciones | `G-notificaciones.json` | Webhook `/nexus/g` | `task.request` |
| H investigación | `H-investigacion-periodica.json` | Semanal | `knowledge.update` |

Cada workflow incluye una nota operativa, reintentos acotados (3), timeout de
ejecución (60 s), guardado de ejecuciones y credenciales referenciadas por nombre.
**No contiene secretos.**

## Puesta en marcha

1. Define el token (mínimo 16 caracteres) y arranca el puente:

   ```bash
   export NEXUS_WEBHOOK_TOKEN="$(openssl rand -hex 24)"
   scripts/nexus-eng serve --host 127.0.0.1 --port 8787
   ```

   Si el puente corre en otra máquina o contenedor, no lo expongas a Internet sin
   TLS y un proxy autenticado.

2. En n8n crea dos credenciales **Header Auth**:

   - `NEXUS n8n webhook`: cabecera `Authorization: Bearer <token-de-entrada>`.
   - `NEXUS ingeniería API`: cabecera `Authorization: Bearer <NEXUS_WEBHOOK_TOKEN>`.

   Usa tokens distintos para entrada y salida; rota ambos.

3. Define la variable de entorno `NEXUS_ENGINEERING_URL` en n8n, por ejemplo
   `http://127.0.0.1:8787` (sin barra final).

4. Importa los JSON desde `workflows/` y asigna las credenciales. **Este paso no
   se ha ejecutado aquí** porque n8n no está instalado.

5. Prueba idempotencia:

   ```bash
   curl -sS -X POST http://127.0.0.1:8787/webhooks/n8n/A \
     -H "Authorization: Bearer $NEXUS_WEBHOOK_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"event":"task.request","idempotency_key":"evt-2026-0001","title":"Prueba","task":{"id":"HU-DEMO-01","title":"Prueba"}}'
   ```

   La primera llamada responde `202 accepted`; la segunda `200 duplicate` y no
   crea otra tarea.

## Contrato de payload

```json
{
  "event": "task.request",
  "idempotency_key": "evt-2026-0001",
  "title": "Añadir filtro por fecha",
  "task": {
    "id": "HU-CRM-014",
    "title": "Añadir filtro por fecha",
    "priority": 2,
    "depends_on": ["HU-CRM-013"],
    "tags": ["backend"],
    "paths": ["lib/"]
  }
}
```

El campo `task` solo se acepta en el flujo A.

## Seguridad

- Webhook sin `Authorization` válido → `401`.
- Payload inválido o evento no permitido → `400`.
- Cuerpo > 64 KiB → `413`.
- El token nunca se registra; los mensajes de error se redactan.
- No se permite desactivar la autenticación mediante variables de entorno.
- Los flujos programados usan claves deterministas por franja temporal para no
  duplicar operaciones si n8n reintenta.

## Limitaciones conocidas

- No hay nodo de notificación real (Slack, email) porque no hay credenciales.
- La importación y ejecución dentro de n8n queda pendiente de un entorno con n8n.
- Los flujos E y G registran el evento; el enrutamiento fino a agentes lo hace el
  orquestador, no n8n.
