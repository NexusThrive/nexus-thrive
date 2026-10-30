---
name: skills-externas
description: Gobierna la evaluación, instalación, registro y retirada de skills, plugins, MCP y agentes externos con procedencia, licencia, permisos y revisión de seguridad.
---

# Gobierno de skills externas

## Antes de instalar

1. Identifica el repositorio oficial y la versión.
2. Comprueba licencia y compatibilidad real con OpenCode y Claude Code.
3. Inspecciona qué archivos instala, qué scripts ejecuta y qué hooks registra.
4. Determina datos accesibles, credenciales necesarias y llamadas externas.
5. Revisa solapamiento con capacidades existentes.
6. Registra el resultado en `docs/ingenieria/herramientas/registro.json`.

## Criterios de rechazo

- Repositorio archivado o sin mantenimiento verificable.
- Licencia incompatible o ausente.
- Script de instalación remoto no inspeccionable.
- Requiere permisos o infraestructura desproporcionados.
- Duplica una capacidad ya cubierta sin ventaja clara.
- No se puede desinstalar o revertir.

## Instalación

- Preferir instalación local al repositorio, no global.
- No sobrescribir configuración personal.
- No copiar hooks entre clientes sin adaptar el formato.
- Instalar una skill a la vez y verificar que el cliente la descubre.

## Registro obligatorio

- id, fuente, versión, licencia, compatibilidad.
- Permisos y ejecución de código.
- Revisión de seguridad con revisor y fecha.
- Prueba de funcionamiento reproducible.
- Procedimiento de rollback.
- Estado: evaluada, instalada, diferida o rechazada.

## Regla de memoria

Una skill no se convierte en política del equipo por el hecho de estar instalada. Sus recomendaciones pasan por revisión y se adoptan explícitamente.
