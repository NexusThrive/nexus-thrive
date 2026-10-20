# NEXUS THRIVE V1 · Estado de entrega

Rama: `main`. Actualizado: **20 de octubre de 2026**.
Alcance de esta versión: **V1 piloto interno** (acceso por código, sin cobro
automático).

---

## 1. Estado: qué está listo

| Pieza | Estado | Dónde |
|---|---|---|
| Esquema de producción | Aplicado (70 tablas) | `docs/prod-sql/` |
| Código de la app en GitHub | `main` al día | `NexusThrive/nexus-thrive` |
| Build / tipos / lint / pruebas | Verde: 59 rutas, 410 pruebas, 0 errores de lint | `pnpm verify` |
| Dominio de la app | `app.nexusthrive.com.co` | Vercel |
| Landing | `nexusthrive.com.co` | **otro repo** |
| Acceso al Operations Center | Propietario con los 25 permisos | `docs/prod-sql/2026-10-20-admin-santiago.sql` |
| Base de datos | Vacía y lista para vender (0 negocios, 0 clientes, 0 canjes) | — |

### Módulos de la V1

1. **Dinero** — finanzas por pestañas, caja menor real (fondo, turno, vales,
   reposición, arqueo), pagos con recibo consecutivo y anulación con motivo,
   comprobantes, recibo público `/r/…`, gastos con soporte, catálogo e
   inventario, facturación con cuentas de cobro.
2. **Clientes y equipo** — ficha 360° por rubro, lista con foto y etiquetas,
   equipo con invitaciones, roles, retiro y límite por plan, perfil, avisos.
3. **Agenda** — calendario mes/semana/día con ocupación, citas con hora,
   servicio, responsable, cupo, choques y recordatorio por WhatsApp.
4. **Rubros** — membresías congelables, código de acceso y NFC por cliente,
   asistencia (gym), taquilla (museo), salidas y reservas (turismo), cuentas
   de cobro por obra (construcción).
5. **Presence Thrive** — visibilidad del negocio, solicitudes de sitio y
   panel de presencia.
6. **Operations Center** — negocios, equipo y roles, clientes, CRM, soporte,
   finanzas, facturación, bandeja, satisfacción, salud, precios y catálogo,
   auditoría y **Accesos**.
7. **Vertical de construcción** — catálogo APU con importador del libro
   completo, presupuesto, cotización al cliente, planificación Lean, bitácora
   con fotos, informes (Informe Cero, semanal, valor ganado).

### El modelo de acceso (piloto, sin Wompi)

Dos tipos de código, un solo motor (`lib/benefits`):

| Tipo | Cómo se emite | Qué ve la persona |
|---|---|---|
| **PROMO** | Regalo/promoción. El QR fijo de las tarjetas (`ELITE30`) es de este tipo | "N días gratis" |
| **PAID** | Después de confirmar el pago por WhatsApp (1 uso, con los días pagados) | "Cuenta NEXUS activada" |

El onboarding (`lib/onboarding/flags.ts` → `SHOW_PRICING = false`) ofrece tres
caminos: **código de acceso**, **coordinar el pago por WhatsApp** (planes sin
precio) o **probar gratis** con Essential.

Reglas que da la seguridad del modelo:

- El servidor decide el plan y los módulos: nunca los acepta del navegador.
- El canje de un código de un solo uso es **atómico** (dos peticiones
  simultáneas no pueden regalarlo dos veces).
- Rate limit en la validación de códigos y una cuenta de Clerk = un negocio.
- Al vencer el acceso, el negocio vuelve al plan Essential.

---

## 2. Lo que falta para la V1 al 100 %

| # | Qué | Quién | Bloquea el uso |
|---|---|---|---|
| 1 | **Wompi** (checkout real de planes) | Tú (cuenta Bancolombia) | No: el piloto cobra a mano |
| 2 | **Meta / WhatsApp Business** (bandeja y "Conecta tu WhatsApp") | Tú (trámite de semanas) | No: la app degrada |
| 3 | **Resend** (correo saliente y entrante) | Tú | No |
| 4 | **Google Places** (autocompletado de direcciones) | Tú | No: hay campo manual |
| 5 | **Landing** (`nexusthrive.com.co`) | Otro repo | No |
| 6 | **Limpiar la ficha de staff vieja** (`santiagocastellar201022@gmail.com`, inactiva) | Tú | No |

Las variables opcionales van en `.env.produccion`. El orden del SQL, en
`docs/prod-sql/00-ORDEN.md`.

---

## 3. Decisiones de negocio abiertas

- **Tramo de clientes en Essential**: hoy suma su precio también al plan
  gratuito (con 500 clientes cuesta $10). ¿Dejarlo así o que Essential no lo
  pague?
- **Moneda**: la app usa USD; el público es colombiano. ¿Se mantiene USD o se
  pasa a COP en la landing?
- **Precios finales** de los planes y de las webs profesionales.
- **QR fijo**: hoy `ELITE30` es ilimitado y se puede pausar desde *Accesos*.
  Si se filtra, se pausa y se emite otro; el código del QR impreso no cambia.

---

## 4. Cómo retomar el trabajo

```bash
git checkout main && git pull
pnpm install
pnpm dev
```

Estado del código: `pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build`.
El CI (`.github/workflows/ci.yml`) corre lo mismo sobre un Postgres efímero.
