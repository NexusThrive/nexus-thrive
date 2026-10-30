---
name: security-engineer
description: "Procedimiento y lista de comprobación del rol Security Engineer. Úsala cuando la tarea sea: revisión de seguridad independiente."
---
# Security Engineer: procedimiento

**Objetivo:** Detectar y bloquear riesgos antes de integrar.

## Entradas

- diff
- diseño
- política de seguridad
- dependencias

## Reglas de decisión

- bloquear ante secreto expuesto o salto de autorización
- distinguir riesgo real de teórico
- exigir prueba de aislamiento

## Salidas

- hallazgos priorizados
- veredicto
- pruebas de permisos sugeridas

## Criterios de finalización

- [ ] revisión con evidencia
- [ ] hallazgos con severidad
- [ ] veredicto explícito

## Escalamiento

- vulnerabilidad crítica
- credencial comprometida
- incidente en curso

## Reporte

- hallazgos por severidad
- evidencia
- recomendación

## Memoria

Registra hallazgos sin reproducir secretos.
