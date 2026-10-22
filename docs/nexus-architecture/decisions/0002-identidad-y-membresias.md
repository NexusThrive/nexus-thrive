# ADR-0002 · Identidad: Clerk + membresía `User`

- **Estado:** Propuesta · 2026-10-22

## Contexto

`User` ya es una membresía (`clerkUserId`, `tenantId`, `role`, `active`). No hay
entidad local de persona ni webhook de Clerk. La vinculación por correo causó
SEC-01 y SEC-10. El onboarding dice "una cuenta = un negocio" pero las
invitaciones permiten varios.

## Decisión

1. Mantener Clerk como dueño de la persona y `User` como membresía (renombrarlo
   en el dominio a "membresía" sin cambiar la tabla).
2. Vincular cuentas **solo** por enlace de un solo uso o por correo **verificado**
   con igualdad exacta.
3. Añadir webhook de Clerk (`user.updated`, `user.deleted`) para mantener nombre y
   correo y desactivar membresías.
4. Permitir varias membresías por persona con selector de negocio; el onboarding
   puede seguir limitando a un negocio *creado* por cuenta en el piloto.
5. Sacar `SUPERADMIN` de los roles de negocio: el soporte de NEXUS entra por
   suplantación auditada, no como miembro.

## Alternativas

Tabla `Person` local como identidad principal (más control, más sincronización);
usar Clerk Organizations (acopla el modelo de negocio a Clerk).

## Consecuencias

Migración de datos para `SUPERADMIN` existentes; `isSuperAdmin` deja de mirar
`User`.
