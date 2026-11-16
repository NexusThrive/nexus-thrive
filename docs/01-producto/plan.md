# Plan de producto

## Estado confirmado

El plan heredado no registraba historias vigentes. El 2026-11-16 el usuario aceptó **M01 — MVP privado administrado**, **S01 — Alta, activación y acceso seguro** y las historias HU-01 a HU-08 del [plan y reporte de aprovisionamiento](../07-ingenieria/propuestas/aprovisionamiento-administrado.md). La aceptación autoriza implementación y PR; no acredita configuración externa ni fusión. Los estados de entrega se documentan con evidencia.

Posteriormente solicitó auditar los errores de pantallas: **HU-09 — Reconciliación del esquema local**, continuación correctiva de M01/S01 registrada en el mismo informe, con respaldo y preservación de datos. No amplía la funcionalidad comercial ni autoriza cambios en Supabase, que dejó pendiente.

## Orden de trabajo

La [estrategia de producto](estrategia/README.md) contiene las decisiones aceptadas y su transición por etapas. La [hoja de ruta](hoja-de-ruta.md) conserva los seguimientos técnicos con su fecha. Las [funcionalidades](funcionalidades/README.md) describen capacidades y los [pendientes heredados](backlog/README.md) requieren validación antes de convertirse en historias listas.

## Planificación y evidencia

Cada trabajo sigue Hito M → Sprint S → Historia HU → Rama → PR → Verificación. El hito define el resultado; el sprint, el objetivo y las historias; cada HU, sus criterios de aceptación y fuentes. El plan de sprint registra dependencias, bloqueos, intentos, ramas, PR y comandos ejecutados. Véanse [sprints](../07-ingenieria/sprints/README.md) y [ramas](../07-ingenieria/ramas.md).

Una funcionalidad distingue: **Implementada y verificada**, **Implementada sin verificar**, **Parcial**, **Planificada** o **Descartada**. «Verificada» exige prueba o evidencia enlazada con fecha; las casillas heredadas sin esa evidencia no bastan. Una propuesta sin decisión mantiene su incertidumbre.

## Dependencias, bloqueos y riesgos

La solicitud tiene [auditoría y riesgos](../02-arquitectura/propuestas/aprovisionamiento-administrado.md), [ADR aceptado](../05-decisiones/ADR-0011-arquitectura-aprovisionamiento-administrado.md) y [desglose y evidencia M01/S01/HU-01 a HU-08](../07-ingenieria/propuestas/aprovisionamiento-administrado.md). Mantener dependencias y estados en ese informe, sin confundir pruebas simuladas con validación desplegada.

Las dependencias del nuevo trabajo están formalizadas en ese reporte. Los pendientes heredados conservan su clasificación; esta implementación no los declara resueltos.
