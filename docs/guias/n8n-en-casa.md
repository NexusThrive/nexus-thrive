# n8n en casa con NEXUS THRIVE

Guía para conectar un **n8n autohospedado** (en tu casa) a NEXUS por la API con
la llave del negocio. n8n **nunca toca la base de datos**: solo la API
(`/api/v1`), el MCP (`/api/mcp`) y los eventos.

> Estado: las plantillas y la lógica de «ponerse al día» están probadas con
> n8n **simulado** (`lib/events/n8n-templates.test.ts`). **Falta probarlas en tu
> n8n real**: el paso 6 es esa prueba.

## 1. Qué usar y para qué

| Necesidad | Cómo |
|---|---|
| Avisos para ti (ventas, resumen del día) | n8n **consulta** `/api/v1/events` cada minuto. **No necesita túnel.** |
| Reaccionar al instante a un evento | NEXUS **llama** a tu n8n (webhook firmado). Necesita que n8n sea alcanzable desde internet (túnel). |
| Un agente de IA que consulta tu negocio | Herramienta **MCP** `https://<tu-dominio>/api/mcp` con la misma llave (solo lectura). |

**Recomendación para empezar: consulta (polling).** Tu n8n está en casa y, hoy,
solo se alcanza por Tailscale (`100.x`): Vercel no puede llamarlo. Con la
consulta, n8n sale a internet (siempre puede) y no abres ningún puerto. Si
apagas n8n, al volver pide desde su último cursor y recibe todo lo pendiente.
Los webhooks se agregan después si necesitas inmediatez.

## 2. Crear la llave del negocio

1. En NEXUS: **Ajustes → Integraciones → Nueva llave**.
2. Nombre «n8n en casa», acceso **Solo lectura**. La llave hereda el rol de quien
   la crea: créala como dueño o administración (para ver eventos y dinero).
3. Copia la llave (`nx_live_…`). **Se muestra una sola vez.**

Prueba rápida desde tu casa:

```bash
curl -s https://TU-DOMINIO.com/api/v1/me -H "Authorization: Bearer nx_live_…"
```

Debe listar la llave y las operaciones permitidas. Un `401` es llave mala; un
`429`, límite de peticiones o cupo mensual (50 000 peticiones al mes).

## 3. Credencial en n8n

**Credentials → New → Header Auth**:
- Name: `Authorization`
- Value: `Bearer nx_live_…`
- Nómbrala **NEXUS llave de API**.

Nunca pegues la llave dentro de un nodo ni la subas a un repositorio.

## 4. Importar las plantillas

En `docs/n8n/plantillas/`:

| Archivo | Qué hace |
|---|---|
| `01-avisos-de-ventas.json` | Cada minuto pide los eventos nuevos y te avisa por Telegram de cada venta. Guarda su cursor: si n8n estuvo apagado, avisa de todo lo pendiente al volver. |
| `02-resumen-diario.json` | A las 8 pm te manda ingresos, gastos y balance del día vs. ayer. |

En cada una: **Import from file**, edita en el primer nodo de código la línea
`NEXUS_URL`, elige tu credencial de NEXUS en el nodo HTTP y tu credencial y
`chatId` de Telegram. Quedan **inactivas**; actívalas tú. (Para WhatsApp en lugar
de Telegram, cambia el último nodo; el resto es igual.)

Nota: el cursor avanza al recibir los eventos, antes de enviar el aviso. Si
Telegram falla justo ahí, ese aviso no se reintenta (los datos siguen en NEXUS).

## 5. Webhooks (opcional, para inmediatez)

1. Expón **solo** la ruta de webhooks de n8n (`/webhook/*`), nunca el editor.
   Opciones: Cloudflare Tunnel con regla por ruta, o Tailscale Funnel limitado a
   `/webhook`. El editor de n8n sigue solo por Tailscale.
2. NEXUS enviará POST firmado con la cabecera `NexusThrive-Signature:
   t=<unix>,v1=<hex>` donde `v1 = HMAC-SHA256(secreto, "<t>.<cuerpo>")`. En n8n,
   un nodo Code al inicio debe recalcularlo con el secreto `whsec_…` y rechazar
   si no coincide o si `t` tiene más de 5 minutos.
3. Entrega **al menos una vez**: deduplica por la cabecera `NexusThrive-Event-Id`.
4. Si n8n cae, NEXUS reintenta ~44 h (1 min, 5 min, 30 min, 2 h, 6 h, 12 h,
   24 h); después queda en «fallidos» y se reenvía a mano. **Para no depender de
   eso, deja también la consulta de `/api/v1/events` como respaldo.**

(Falta la pantalla para registrar webhooks; hoy se crean desde
`lib/events/endpoints.ts`.)

## 6. Prueba de punta a punta (la que falta)

1. Activa la plantilla 01 y espera un ciclo (no debe avisar de nada viejo).
2. Registra un cobro en NEXUS → en ≤ 1 minuto te llega el aviso.
3. **Desactiva** el flujo 10 minutos, registra 2 cobros, **reactívalo** → llegan
   los 2 avisos, sin repetir los anteriores.

Cuando lo confirmes se marca la casilla *VI.08 N1 · n8n conectado por la API con
llave del negocio*.

## 7. Atención al cliente por WhatsApp (decisión pendiente)

NEXUS ya recibe WhatsApp (Meta Cloud API) en `/api/webhooks/whatsapp` y lo guarda
en la **bandeja** para atender a mano. **Meta solo permite una URL de webhook por
número**, así que hay que elegir quién recibe los mensajes:

- **A. NEXUS recibe** (hoy): atiendes desde la bandeja. n8n se usa para avisos y
  reportes tuyos, como arriba. Es lo que recomiendo para empezar.
- **B. n8n recibe**: sirve para un bot que responda. Pero entonces los mensajes
  **no llegan a la bandeja de NEXUS**, y reenviarlos a NEXUS no funciona sin
  rediseñarlo (la firma de Meta no sobrevive al reenvío).

Un bot que responda consultando el negocio («¿tienen X en stock?», «¿a qué hora
abren?») se arma en n8n con un **AI Agent** y la herramienta **MCP Client** hacia
`/api/mcp` (solo lectura: `customers_search`, `products_search`,
`inventory_check_stock`…). **Enviar** mensajes desde NEXUS por API todavía no
existe: hoy el envío lo haría n8n con su propio nodo de WhatsApp.

## 8. Seguridad

- Llave **solo lectura** y con vencimiento; una por uso (revocas una sin afectar
  las demás). Revócala en Ajustes → Integraciones si se filtra.
- n8n por Tailscale; al exterior, solo `/webhook/*`.
- Cambia las llaves y secretos si alguna vez los pegas en un chat o captura.
- Un flujo que mueva dinero o envíe mensajes necesitará operaciones con
  aprobación (todavía no existen); por ahora, todo es lectura.

## 9. Problemas comunes

| Síntoma | Causa probable |
|---|---|
| `401 unauthorized` | Falta `Bearer ` o la llave está mal copiada. |
| `403 forbidden` en `/events` | La llave se creó con un rol sin permiso de gestión. |
| `403 scope_denied` | El alcance de la llave no incluye esa operación. |
| `429 rate_limited` | Más de 120 peticiones/min; baja la frecuencia. |
| `429 quota_exceeded` | Cupo mensual agotado (`Retry-After` dice cuándo). |
| Avisos repetidos tras reimportar | Se perdió el cursor (datos estáticos del flujo): se reinicia «desde ahora». |
