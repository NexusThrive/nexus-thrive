# NEXUS THRIVE V1 · Progreso y siguientes pasos

Rama: `v1/negocio-completo` (sale de `feature/ops-center`, que ya trae el Operations Center A–E).
Actualizado: 17 de octubre de 2026.

---

## 1. Lo que TÚ debes hacer (en orden)

### A. Antes de publicar nada en producción
1. **Respaldo de Supabase**: Database → Backups → crear uno manual.
2. **SQL del Operations Center**: en el SQL Editor de Supabase ejecuta
   `docs/prod-sql/2026-10-17-ops-center-completo.sql` (crea 18 tablas, aditivo, una transacción).
3. **(Opcional) Limpiar la base y dejarte como único administrador**:
   ejecuta `docs/prod-sql/2026-10-17-limpieza-total-admin-global.sql` (este archivo NO está en git; está en tu carpeta local).
   ⚠️ Borra todos los negocios y datos. Solo si quieres empezar de cero.
4. Avísale a Claude **"listo el SQL"** → fusiona el **PR #43** (`feature/ops-center` → `main`).
5. **Clerk** (dashboard): desactiva *"Force organization selection"* (si no, los registros nuevos vuelven al login).
6. Entra a `/sign-in` con `santiagocastellar201022@gmail.com` (si hiciste la limpieza): quedas como Propietario.

### B. Cuando la V1 esté terminada (esta rama)
7. Claude generará `docs/prod-sql/…-v1.sql` con las tablas nuevas de la V1 (fases 1–4+). Lo ejecutas en Supabase **antes** de fusionar el PR de la V1.
8. Revisar y fusionar el PR de `v1/negocio-completo`.

### C. Cuentas y claves que solo tú puedes conseguir (para cerrar la V1 al 100 %)
| Para qué | Qué conseguir | Variable |
|---|---|---|
| Recibo público firmado (`/r/…`) | Una frase secreta larga cualquiera | `RECEIPT_LINK_SECRET` |
| Cobro de planes NEXUS con tarjeta/PSE/Nequi [23] | Cuenta **Wompi** (Bancolombia): llave pública, secreto de integridad y de eventos | `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` |
| WhatsApp de NEXUS (bandeja) y "Conecta tu WhatsApp" de cada negocio [11][17] | **Meta**: app de WhatsApp Business Platform; registrarte como *Tech Provider* (trámite de semanas: iniciarlo YA) | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `META_APP_ID`, `META_CONFIG_ID` |
| Correo saliente/entrante | Cuenta **Resend** + dominio verificado | `RESEND_API_KEY`, `INBOX_EMAIL_FROM`, `INBOUND_EMAIL_SECRET` |
| Barra de visibilidad: comprobar Google Maps [18] | Clave de **Google Places API** | `GOOGLE_PLACES_API_KEY` |
| Bot n8n por negocio [15] y `/comandos` [21] | Una instancia de **n8n** (cloud o propia) | (URL del webhook por negocio, se configura en el panel) |
| Librería de QR para el acceso del gym | Aprobar `pnpm add qrcode` cuando Claude lo pida (lo rechazaste la última vez) | — |

Todas van en Vercel → Settings → Environment Variables (y en `.env` local).

### D. Decisiones pendientes
- **Tramo de clientes en Essential**: hoy suma su precio también al plan gratuito (con 500 clientes cuesta $10). ¿Dejarlo así o que Essential no lo pague?
- Moneda de los planes en la landing (COP) vs. app (USD): elegir una para Colombia.
- Precio final de los planes y de las webs profesionales.

---

## 2. Lo que YA está hecho en esta rama (commits)

| Fase | Commit | Contenido |
|---|---|---|
| 1 · Dinero | `3d9b3cd` | Finanzas en pestañas; **Caja menor real** (fondo, turno, vales, reposición, arqueo); pagos con **recibo consecutivo**, anulación con motivo, comprobantes, **recibo público** y **envío por WhatsApp con imagen** [13]; gastos con proveedor/soporte; **Catálogo e inventario**; **Facturación** (cuentas de cobro y recibos imprimibles); **campo de dinero con miles** [14] |
| 2 · Clientes y equipo | `783f5d3` | Ficha del cliente **por rubro** [16] (foto, medidas/IMC en gym, inscripción con plan); lista con foto/etiquetas [10]; **equipo del negocio** con invitaciones, roles, retiro y límite por plan [5][19]; "Tu perfil" y saludo con tu nombre [4]; **indicativo de país** [1]; **notificaciones deslizables** [6]; **tema guardado en la cuenta** [22] |
| 3 · Agenda | `4beea98` | **Calendario Mes/Semana/Día** [12] con ocupación por color, citas con hora, servicio, responsable, cupo, choques y recordatorio por WhatsApp |
| 4 · Rubros (en curso) | (este commit) | Modelos: membresías congelables/cancelables, código de acceso y NFC por cliente, **Asistencia**, **Taquilla del museo**, **Salidas y reservas de tours**, cuentas de cobro por obra; **rubro Museo** creado; gym con sus módulos por defecto [11]; lógica del gym (acceso, congelar, contador [9]) con pruebas |

Ya resuelto antes (Operations Center, PR #38–#43): precios por módulo y por cantidad de clientes [8], panel CFO/Finanzas y Facturación de NEXUS [7].

Pruebas: 331+ pruebas, tipos y lint sin errores; cada fase probada en el navegador (escritorio y celular).

---

## 3. Lo que falta (Claude continúa aquí)

### Fase 4 · Rubros (siguiente)
- **Gym**: pantalla de control de acceso `/[negocio]/checkin` (lector QR, Web NFC, manual) con resultado grande, foto y **contador** [9]; QR y tarjeta en la ficha del socio; congelar/cancelar membresía; avisos de vencimiento con cobro de renovación. *(Necesita aprobar `qrcode`.)*
- **Museo**: taquilla (vender entradas por tipo y franja, aforo), visitas guiadas y colegios en la agenda, informe de visitantes; ajustes de aforo y franjas.
- **Turismo**: salidas con cupos, reservas con pasajeros, abonos y saldo, **voucher**, comisiones.
- **Constructora**: cuentas de cobro y gastos por obra en la ficha de la obra.
- **Inicio por rubro**: asistencia de hoy (gym), visitantes (museo), salidas de la semana (turismo).

### Fase 5 · Visibilidad y websites [18]
- Barra INVISIBLE → VISIBLE → CONECTADO → ORDENADO, misiones, comprobación con Google Places.
- "Solicitar web profesional" con archivos + "¡Te avisaremos!"; **Websites solicitadas** en el panel CEO con estados y cobro único.

### Fase 6 · Pagos de planes NEXUS [23] + Pase CREATE
- Checkout **Wompi** para la suscripción (webhook confirma el cobro solo).
- **Tarjetas CREATE**: códigos únicos (NFC/QR → `/c/CODIGO`), beneficio configurable (30 días Elite + precio fundador + tarjeta propia), seguimiento en el panel.

#### Estado (piloto interno, 19 de octubre de 2026)
Como todavía no hay Wompi, el acceso se administra **a mano** con dos tipos de código
(panel **Accesos** → `/admin/beneficios`):
- **PROMO (gratis)**: regalo/promoción (QR fijo `ELITE30` de las tarjetas, ilimitado).
  Quien lo usa ve "N días gratis".
- **PAID (acceso pagado)**: se emite **después** de confirmar el pago por WhatsApp
  (1 uso, con los días pagados). Quien lo usa ve "Cuenta NEXUS activada", nunca "gratis".

Onboarding sin precios (`lib/onboarding/flags.ts` → `SHOW_PRICING = false`): tres caminos
(código de acceso / coordinar pago por WhatsApp / probar gratis con Essential). El
servidor decide el plan y los módulos (nunca el navegador), el canje de un uso es
atómico y hay rate limit en la validación de códigos. Al vencer el acceso, el negocio
vuelve a Essential.

**Pendiente:** Wompi (checkout real) y el SQL de producción de estas tablas
(`docs/prod-sql/2026-10-19-beneficios.sql`).

### Fase 7 · WhatsApp de cada negocio [11][13][17][15][21]
- "Conecta tu WhatsApp" (botón verde) con Embedded Signup de Meta; chat integrado por negocio (reutiliza la bandeja del Operations Center); WhatsApp desde la ficha del cliente.
- API para el bot **n8n** (crear clientes, agendar entregas, registrar pagos **con confirmación** antes de cambiar algo) + plantilla del flujo.
- Comandos `/caja`, `/cobros hoy`, `/citas hoy` desde el WhatsApp del dueño.

### Fase 8 · Landing (repo `nexus-landing`)
- Escalera Visible → Conectado → Ordenado (= NEXUS THRIVE), botón "Empieza gratis", páginas por rubro, planes leídos del catálogo, gancho "Descubre tu % de visibilidad".

### Cierre
- SQL de producción de la V1 (ensayado en copia de producción), `pnpm build`, PR de la rama.

---

## 4. Cómo retomar con Claude
Escribe: **"continúa la V1 desde docs/V1-PROGRESO.md"**. Claude debe:
1. `git checkout v1/negocio-completo` y leer este archivo.
2. Seguir en la **Fase 4** (punto 3).
3. Reiniciar el servidor de desarrollo si no responde (`pnpm dev -p 3000`).
