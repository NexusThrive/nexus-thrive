# Automatización con n8n

## 1. Frontera de responsabilidad

n8n **coordina eventos**; no decide calidad ni corrección. La autoridad sigue
siendo el núcleo:

```text
n8n (disparador / transporte)  →  puente HTTP autenticado  →  orquestador
                                                              →  estado canónico
                                                              →  compuertas y revisión
```

Si n8n se cae, el equipo sigue trabajando desde OpenCode o Claude Code con la CLI.
Si el núcleo se cae, n8n reintenta y no duplica: cada evento lleva
`idempotency_key`.

## 2. Puente HTTP

```bash
export NEXUS_WEBHOOK_TOKEN="$(openssl rand -hex 24)"   # mínimo 16 caracteres
scripts/nexus-eng serve --host 127.0.0.1 --port 8787
```

| Método | Ruta | Auth | Respuesta |
|---|---|---|---|
| `GET` | `/health` | no | `{"ok":true}` (solo liveness) |
| `GET` | `/status` | sí | estado del equipo |
| `GET` | `/next` | sí | siguiente tarea o `paused`/`empty` |
| `GET` | `/knowledge` | sí | catálogo de fuentes |
| `POST` | `/webhooks/n8n/A`…`H` | sí | `202 accepted` o `200 duplicate` |

Controles implementados y probados en `tests/test_server.py`:

- `Authorization: Bearer <token>` obligatorio; comparación con
  `hmac.compare_digest`.
- Sin `NEXUS_WEBHOOK_TOKEN` válido el servidor **no arranca** (`RuntimeError`).
- Cuerpo máximo 64 KiB → `413`; JSON inválido o evento no permitido → `400`.
- El token y el cuerpo nunca se registran; los errores se redactan.
- La comprobación de idempotencia y el registro ocurren bajo el bloqueo del
  estado, por lo que dos webhooks simultáneos no crean dos tareas.

## 3. Workflows

| Flujo | Archivo | Disparador | Evento | Efecto en el núcleo |
|---|---|---|---|---|
| A | `A-nueva-solicitud.json` | webhook `/nexus/a` | `task.request` | crea tarea si es nueva |
| B | `B-actualizacion-conocimiento.json` | webhook `/nexus/b` | `knowledge.update` | registra propuesta de fuente |
| C | `C-ejecucion-sprint.json` | webhook `/nexus/c` | `sprint.run` | registra solicitud de avance |
| D | `D-recuperacion.json` | cada 15 min | `recovery` | propone reanudar; el núcleo valida deriva |
| E | `E-ci-revision.json` | webhook `/nexus/e` | `task.request` | registra resultado de CI |
| F | `F-informes.json` | cada 24 h | `sprint.run` | informe con clave por día |
| G | `G-notificaciones.json` | webhook `/nexus/g` | `task.request` | registra notificación |
| H | `H-investigacion-periodica.json` | semanal | `knowledge.update` | propone revisión de fuentes |

Generación determinista:

```bash
python3 scripts/build-n8n-workflows.py
```

Cada workflow incluye nota operativa, timeout de 60 s, reintentos (3 con espera de
2 s), credenciales referenciadas por nombre y **ningún secreto**. Los flujos
programados generan claves deterministas por franja temporal para que un reintento
de n8n no duplique la operación.

## 4. Idempotencia

```json
{
  "event": "task.request",
  "idempotency_key": "evt-2026-0001",
  "title": "Añadir filtro por fecha",
  "task": { "id": "HU-CRM-014", "title": "Añadir filtro por fecha" }
}
```

- Primera entrega: `202 accepted`, se registra en `workflows/executions.json`.
- Repetición con la misma clave: `200 duplicate`, **no** se crea otra tarea.
- `idempotency_key` debe cumplir `^[A-Za-z0-9._:-]{8,128}$`.
- El campo `task` solo se acepta en el flujo A.

## 5. Estado real

| Elemento | Estado |
|---|---|
| Workflows y esquemas versionados | sí |
| JSON válido y sin secretos | verificado por `nexus-eng validate` |
| Puente HTTP, auth e idempotencia | implementado y probado |
| n8n instalado | **no** |
| Workflows importados en n8n | **no verificado** |
| Credenciales reales | **no disponibles** |
| Notificaciones Slack/email | **no configuradas** |

No se declara ninguna integración operativa más allá de lo verificable.

## 6. Puesta en marcha pendiente (requiere entorno con n8n)

1. Instalar n8n en un entorno reproducible y fijar versión.
2. Crear credenciales Header Auth: `NEXUS n8n webhook` (entrada) y
   `NEXUS ingeniería API` (salida), con tokens distintos.
3. Definir `NEXUS_ENGINEERING_URL` sin barra final.
4. Importar los JSON de `integrations/n8n/workflows/` y asignar credenciales.
5. Probar una entrega y una repetición; verificar `duplicate`.
6. Exponer el puente solo por red privada o detrás de TLS y proxy autenticado.

## 7. Prohibiciones

- Webhooks administrativos sin autenticación.
- Secretos embebidos en exportaciones.
- Automatizar logins o eludir límites de proveedores.
- Promover a producción o mergear a `main` desde n8n.
- Delegar en n8n la decisión de si el código es correcto.
