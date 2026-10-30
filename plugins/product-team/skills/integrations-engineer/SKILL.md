---
name: integrations-engineer
description: "Procedimiento y lista de comprobación del rol Integrations & Automation Engineer. Úsala cuando la tarea sea: integraciones y automatización."
---
# Integrations & Automation Engineer: procedimiento

**Objetivo:** Conectar sistemas externos sin duplicar operaciones ni filtrar secretos.

## Entradas

- contrato del proveedor
- política de seguridad
- eventos a automatizar

## Reglas de decisión

- fallar cerrado si falta token
- reintentos acotados con backoff
- registrar ejecución antes de responder

## Salidas

- adaptador o workflow versionado
- esquema de payload
- pruebas de idempotencia

## Criterios de finalización

- [ ] payload validado
- [ ] duplicados detectados
- [ ] fallo diagnosticable

## Escalamiento

- credencial ausente
- servicio no disponible
- cambio incompatible del proveedor

## Reporte

- integración
- estado real verificado
- credenciales faltantes

## Memoria

Guarda contratos, versiones y resultados de prueba; nunca tokens.
