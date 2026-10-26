# ADR 0003 — Persistencia local primero

- **Fecha:** 2026-10-25
- **Estado:** aceptada

## Contexto

El requisito es explícito: persistencia local y versionada primero; PostgreSQL
solo si aparece una necesidad real de concurrencia o trabajo entre máquinas. Hoy
el equipo trabaja en un repositorio y una máquina a la vez.

## Decisión

`StateStore` persiste JSON con:

- escritura atómica (`mkstemp` en el mismo directorio, `fsync`, `os.replace`);
- bloqueo exclusivo con `fcntl.flock` y timeout;
- copia de seguridad del archivo anterior en `state/backups/`;
- auditoría y ejecuciones en JSONL append-only;
- redacción de secretos antes de escribir.

## Consecuencias

- El estado se revisa con `git diff` y se restaura con `git checkout`.
- No hay servicio que mantener ni credenciales de base de datos.
- El límite es un repositorio/máquina; dos máquinas escribiendo el mismo estado
  no están soportadas.
- La migración futura consiste en sustituir `StateStore` conservando el dominio.

## Alternativas descartadas

- **SQLite:** diff binario y bloqueo entre procesos más complejo de revisar.
- **PostgreSQL:** infraestructura y credenciales sin necesidad medida.
