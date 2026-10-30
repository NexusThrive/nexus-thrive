# Seguridad

## 1. Modelo de amenazas considerado

| Amenaza | Control implementado | Evidencia |
|---|---|---|
| Webhook sin autorización | token Bearer obligatorio; el servidor no arranca sin él | `tests/test_server.py` |
| Repetición de eventos | `idempotency_key` + bloqueo de estado | `tests/test_server.py`, `tests/test_workflows.py` |
| Payload abusivo | límite 64 KiB, validación de contrato, eventos en lista blanca | `tests/test_server.py` |
| Secreto en el estado o logs | redacción previa a persistir | `tests/test_security.py` |
| Push directo a `main` o `sprint/*` | guardas en `gitguard.py` y hook de Claude Code | `tests/test_security.py` |
| `--force` / `--no-verify` | argumentos prohibidos; rechazo antes de ejecutar | `tests/test_security.py`, `scripts/guard_git.py` |
| Aprobación del propio trabajo | QA y revisión senior de otro agente | `tests/test_orchestrator.py`, `tests/test_domain.py` |
| Integración sin CI | `merged` exige `stage=ci_green` | `tests/test_domain.py` |
| Inyección de instrucciones vía documento | contenido externo se marca `untrusted` y se devuelve como dato | `knowledge.py`, `knowledge show` |
| Fuga entre empresas (producto) | RLS + `tenantId` + `can()` | CI del producto, `docs/nexus-architecture/security.md` |

## 2. Secretos

- No se versionan tokens ni claves. Los workflows de n8n referencian credenciales
  por nombre; `nexus-eng validate` falla si detecta marcadores de secreto.
- `.claude/settings.json.example` es un ejemplo: se copia a
  `.claude/settings.json` y no se commitea.
- `NEXUS_WEBHOOK_TOKEN` debe tener al menos 16 caracteres; se recomienda
  `openssl rand -hex 24`.
- Tokens distintos para entrada y salida de n8n, con rotación.
- La redacción cubre claves privadas PEM, JWT, `Bearer`, `sk-`/`ghp_`/`xox*`,
  asignaciones `api_key=`/`token=`/`password=` y URLs de base de datos con
  credenciales.
- Los errores HTTP devuelven mensajes redactados, nunca el cuerpo ni cabeceras.

## 3. Autorización del producto NEXUS

Este repositorio aloja el producto, no solo el equipo de ingeniería. Las reglas
del producto siguen vigentes:

- Toda lectura/escritura pasa por `requireTenantContext`/`requireStaff`.
- Cada tabla multiempresa lleva RLS; el CI falla si falta.
- Ningún archivo de `app/` importa `@/prisma/db` directamente.
- Los flujos de dinero usan el servicio transaccional.
- Los tests de integración deben cubrir dos empresas distintas.
- Datos privados nunca en caché del navegador ni del service worker.

## 4. Contenido no confiable

Graphify, NotebookLM, páginas web y documentos de usuario son **datos**. El
sistema:

- los cataloga con `trust: untrusted`;
- no ejecuta instrucciones encontradas en ellos;
- no los envía automáticamente a servicios externos si son de baja confianza;
- exige `NEXUS_ALLOW_NETWORK_SYNC=1` para sincronización de red;
- no activa servicios de pago o con datos sensibles sin autorización humana.

## 5. Operaciones que requieren humano

- Merge a `main` y cualquier despliegue.
- Aplicar SQL o migraciones en producción.
- Rotar o crear credenciales.
- Activar Graphify alojado o NotebookLM.
- Aceptar un riesgo de seguridad.
- Ampliar el alcance de una historia bloqueada por 3 intentos.

## 6. Verificación periódica

```bash
scripts/nexus-eng health --json          # rama, herramientas, estado, grafo
scripts/nexus-eng validate --json        # estado + configuración + secretos
python3 scripts/guard_git.py < payload.json   # prueba del hook
pnpm lint && pnpm exec tsc --noEmit && pnpm test
```

La revisión de seguridad de un cambio de producto se registra como veredicto
independiente (`kind=senior_review`, `reviewer=security-engineer`), nunca como
autoaprobación.

## 7. Límites conocidos

- No hay escaneo de dependencias automatizado en el núcleo; se apoya en el CI del
  producto.
- El puente HTTP no implementa TLS: debe ir detrás de un proxy TLS o en red
  privada.
- La redacción es por patrones: reduce el riesgo, no lo elimina. La revisión
  humana sigue siendo necesaria.
- No se ha probado el hook de Claude Code contra el binario real en todos los
  casos; el núcleo es la barrera efectiva.
