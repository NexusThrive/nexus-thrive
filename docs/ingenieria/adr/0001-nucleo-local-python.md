# ADR 0001 — Núcleo local en Python 3.12

- **Fecha:** 2026-10-25
- **Estado:** aceptada

## Contexto

El equipo de ingeniería debe operar desde OpenCode, Claude Code, CI y terminal
humana. El repositorio ya usa Python en `scripts/product-gate.py`. Instalar un
runtime adicional (o exigir Node para el estado) aumenta el coste de arranque y
acopla el núcleo al cliente.

## Decisión

Implementar el núcleo en Python 3.12 con biblioteca estándar:

- `unittest` para pruebas;
- `json` + `os.replace` + `fsync` para persistencia;
- `fcntl` para bloqueo;
- `http.server` para el puente de automatización.

No hay dependencias Python obligatorias. `jsonschema` es opcional.

## Consecuencias

- `python3 -m unittest` funciona sin instalar nada.
- La interfaz con los clientes es CLI/HTTP, no imports compartidos con TypeScript.
- El núcleo no se acopla a la versión de OpenCode ni de Node.
- La validación estructural por esquema se degrada a advertencia si falta
  `jsonschema`.

## Alternativas descartadas

- **TypeScript:** obliga a Node para el estado y a mantener un paquete paralelo.
- **Base de datos remota:** no existe concurrencia entre máquinas que lo
  justifique (ver ADR 0003).
