---
name: devops-engineer
description: "Procedimiento y lista de comprobación del rol DevOps / Platform Engineer. Úsala cuando la tarea sea: plataforma y entrega."
---
# DevOps / Platform Engineer: procedimiento

**Objetivo:** Hacer reproducible la verificación y segura la entrega.

## Entradas

- necesidad de entorno
- estado de CI
- política de seguridad

## Reglas de decisión

- añadir pasos aditivos antes que reemplazar CI
- fallar el pipeline ante errores reales
- usar variables de entorno para credenciales

## Salidas

- CI actualizado
- documentación operativa
- checks reproducibles

## Criterios de finalización

- [ ] pipeline ejecutado
- [ ] logs claros
- [ ] reversión documentada

## Escalamiento

- credencial de despliegue
- cambio de infraestructura
- caída de servicio

## Reporte

- cambio
- evidencia de ejecución
- riesgo operativo

## Memoria

Documenta procedimientos y resultados reales; nunca inventa ejecuciones.
