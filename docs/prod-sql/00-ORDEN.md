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
| 4 | `2026-10-20-admin-santiago.sql` | Administrador (Propietario) del Operations Center | aplicado |
| 5 | `2026-10-20-asistencia-intentos.sql` | Control de acceso: columna `scanned` y `customerId` admite null (registrar los escaneos que no son de nadie) | **PENDIENTE** |

> Si en algún momento reseteaste la base, vuelve a correr **3 y 4** (son las
> que dejan el acceso y el administrador listos para vender).

### Lo que falta ahora

**Corre el archivo 5** (`2026-10-20-asistencia-intentos.sql`) antes de usar
la versión nueva del control de acceso: sin él, la app que registra los
códigos desconocidos fallaría al escribir la columna `scanned`.

Los archivos 1 a 4 ya están aplicados.

> Lo que venga después (por ejemplo, el checkout con Wompi) traerá su propio
> archivo aquí, y la regla de `scripts/check-prod-sql.sh` comprueba que un
> cambio de modelo de datos siempre venga con su SQL.

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
