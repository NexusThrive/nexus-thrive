# ADR-0001 · Mantener un monolito modular

- **Estado:** Propuesta · 2026-10-22

## Contexto

Un solo despliegue Next.js en Vercel con una base Postgres. ~87 mil líneas, un
equipo pequeño, piloto sin carga relevante. El dolor actual es de **límites**
(catálogo disperso, acceso a datos sin capa), no de escala
([modules-and-dependencies.md](../modules-and-dependencies.md)).

## Decisión

Seguir con un único repositorio, despliegue y base, organizando el código por
capacidades (`lib/core`, `lib/capabilities/*`, `lib/solutions`, `lib/integrations`)
con reglas de dependencia (las capacidades dependen del núcleo, nunca de otra
capacidad salvo por su interfaz pública).

## Alternativas

1. Microservicios por dominio. 2. Una app por rubro. 3. Monorepo con paquetes por
módulo (`packages/*`).

## Ventajas / desventajas

- (+) Transacciones locales, una sola autenticación, despliegue simple.
- (+) Compatible con el código existente: es reorganización, no reescritura.
- (−) Requiere disciplina (lint de imports) para que los límites no se erosionen.
- La opción 3 queda como paso posterior si los límites se estabilizan.

## Consecuencias

Una regla de lint (`no-restricted-imports`) entre capacidades y la prohibición de
`db.orm` en `app/`.
