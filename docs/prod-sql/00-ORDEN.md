# Orden de ejecución del SQL de producción (Supabase)

Todos los archivos son **aditivos e idempotentes**: se pueden correr en cualquier
orden y volver a correr sin romper nada. Aun así, este es el orden recomendado
(va de lo más antiguo a lo más reciente).

Ejecutar en el **SQL Editor de Supabase**, base del proyecto, uno por uno.
Cada archivo trae su propia transacción (`BEGIN`/`COMMIT`).

| # | Archivo | Qué crea | Estado |
|---|---------|----------|--------|
| 1 | `2026-10-17-ops-center-completo.sql` | Operations Center: equipo, roles, clientes, soporte, Leads, contactos, bandeja | aplicado |
| 2 | `2026-10-19-v1-negocio-completo.sql` | V1 del negocio: finanzas, caja, clientes, agenda, rubros, taquilla, Presence | aplicado |
| 3 | `2026-10-19-beneficios.sql` | Accesos: `BenefitCode`, `BenefitRedemption` + el código fijo `ELITE30` | aplicado |
| 4 | `2026-10-20-admin-santiago.sql` | Administrador (Propietario) del Operations Center (`santiprocastellar7@gmail.com`) | aplicado |
| 5 | `2026-10-20-asistencia-intentos.sql` | Control de acceso: columna `scanned` y `customerId` admite null (registrar los escaneos que no son de nadie) | **sin confirmar** |
| 6 | `2026-10-21-alta-en-panel.sql` | Alta de negocios desde el panel con invitación al dueño | **sin confirmar** |
| 7 | `2026-10-21-invitaciones-equipo.sql` | Invitaciones al equipo del negocio | **sin confirmar** |
| 8 | `2026-10-21-reinicio-de-datos.sql` | Vacía los datos de negocio (no es de esquema; solo si quieres empezar de cero) | opcional |
| 9 | `2026-10-23-restricciones-negocio-y-rls.sql` | Llaves a `Tenant` en 22 tablas, código de acceso y NFC únicos por negocio, RLS en las 71 tablas, retira `Membership.payments` | **PENDIENTE** |
| 10 | `2026-10-23-codigos-a-medida.sql` | Códigos a medida: precio, módulos y límites en `BenefitCode`; límites en `Tenant`; precio en `BenefitRedemption` (aditivo) | **PENDIENTE** |
| 11 | `2026-10-23-registro-de-capacidades.sql` | Módulos como texto validado (sin el CHECK del enum) y suite de construcción de `quotes` a `construction` (datos) | **PENDIENTE** |

## Estado: producción reconstruida desde las migraciones (camino A, 2026-10-23)

Producción quedó con 71 tablas, RLS en todas, los 5 roles del panel y
`santiagocastellar201022@gmail.com` como Propietario. **Los archivos de esta
carpeta ya no se corren**: los cambios de esquema llegan con
`pnpm exec prisma db migrate --db <producción>` antes de mergear. Se conservan
como historial.

## Los dos caminos (referencia)

Producción todavía no tiene datos que conservar, así que hay dos caminos. El
**A** acaba con el problema de raíz (DATA-03: dos fuentes del esquema).

### A · Reconstruir producción desde las migraciones (recomendado)

Deja producción con exactamente el mismo esquema que el CI prueba en cada PR.
Borra todas las tablas de `public`.

En tu terminal, desde `nexus-thrive/` (pide datos, así que no va con `!`):

```bash
OWNER_EMAIL=<tu-correo> bash scripts/rebuild-db.sh
```

Te pide la cadena de conexión (no se ve al pegarla) y después el nombre de
la base para confirmar.

- `TARGET_DATABASE_URL`: Supabase → *Project Settings* → *Database* →
  *Connection string* (la directa o el *session pooler*, puerto 5432).
- El script pide escribir el nombre de la base antes de borrar.
- Siembra los 5 roles del panel y te deja como Propietario por correo; tu
  cuenta de Clerk se vincula sola al entrar con ese correo verificado.
- Después, los archivos de esta carpeta ya no se corren: los cambios de
  esquema llegan por las migraciones (`pnpm exec prisma db migrate --db …`).

### B · Seguir con el SQL manual

Corre los archivos **5, 6, 7 y 9** en ese orden (son idempotentes: si alguno
ya estaba aplicado, no pasa nada). El 9 va **antes** de desplegar la versión
que lo trae.

> Mientras se use el camino B, `scripts/check-prod-sql.sh` (en el CI de cada
> PR) exige que un cambio del modelo de datos traiga su archivo aquí.

---

## Comprobación rápida (después de correrlos)

```sql
-- Debe salir 1 fila: tu correo, con el rol owner y 25 permisos.
SELECT m."email", m."clerkUserId", m."active", r."key", r."name",
       array_length(r."permissions", 1) AS permisos
  FROM "public"."StaffMember" m
  JOIN "public"."StaffRole" r ON r."id" = m."roleId"
 WHERE m."email" = 'santiprocastellar7@gmail.com';

-- Debe salir 1 fila: el código del QR impreso.
SELECT "code", "kind", "active", "plan", "durationDays" FROM "public"."BenefitCode";
```

---

## Cosas que se corrigen desde el panel (sin SQL)

- **Activar el QR fijo**: en *Accesos* (`/admin/beneficios`), el código `ELITE30`
  se puede **pausar/activar** y editar (plan, días, usos, vencimiento). El
  código en sí nunca cambia (las tarjetas ya impresas apuntan a él).
- **Emitir accesos pagados**: desde *Accesos*, botón *Emitir acceso pagado*
  (plan + días + cliente). Se entrega el código al cliente.
