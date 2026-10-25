---
title: Reorganización del checklist y arquitectura funcional (V2)
tags: [arquitectura, checklist, capas, gym, restaurante]
updated: 2026-10-25
---

# Reorganización del checklist y arquitectura funcional (V2)

Trabajo **solo de documentación** (sin código, esquema ni migraciones). Ordena las 70 subcapas por responsabilidad, relaciona las capas con GYM y RESTAURANTE y deja todo listo para revisión. Los identificadores originales (`I.00` … `XI.00`, `N0` … `N6`, `PR-nn`) no cambian.

## Entregables

| | Documento | Contenido |
|---|---|---|
| A | [A-checklist-maestro.md](A-checklist-maestro.md) | 70 subcapas por categoría, con estado, decisión y criterio |
| B | [B-core-y-compartidas.md](B-core-y-compartidas.md) | Core, capacidades compartidas y contratos, con servicios verificados |
| C | [C-checklist-gym.md](C-checklist-gym.md) | Funciones propias del gimnasio |
| D | [D-checklist-restaurante.md](D-checklist-restaurante.md) | Funciones propias del restaurante |
| E | [E-registro-inconsistencias.md](E-registro-inconsistencias.md) | 12 hallazgos con evidencia |
| F | [F-backlog-priorizado.md](F-backlog-priorizado.md) | Orden de ejecución y bloqueos |
| G | [G-decisiones-pendientes.md](G-decisiones-pendientes.md) | 10 decisiones que son tuyas |

## Estructura propuesta

Cuatro categorías, respetando el modelo ya documentado en [`distribucion-por-rubro.md`](../distribucion-por-rubro.md) (un solo sistema; el rubro es perfil; las funciones se activan por organización):

- **A · Core** — no depende de ningún rubro: identidad, organizaciones, permisos, aislamiento, auditoría, respaldo, planes.
- **B · Compartidas** — servicios que varias funciones usan: catálogo, clientes, dinero, inventario, contabilización, facturación, avisos, reportes.
- **C · Funciones de negocio** — reglas, estados y pantallas propias (membresías, mesas, comandas, proyectos…).
- **D · Contratos** — eventos, API, MCP y automatizaciones: la única vía entre funciones.

## Respuestas a las nueve preguntas

1. **¿Qué está construido?** 159 casillas hechas de 2.610 (6 %), con 1.095 por aprobar entre ellas. Lo más sólido: núcleo multi-organización, tercero único, dinero, POS, inventario, contabilización, impuestos y la membresía/acceso del gimnasio.
2. **¿Qué está terminado y probado?** Ninguna subcapa completa. Con hechos y pruebas asociadas: ver *Estado verificado* en A.
3. **¿Qué falta para estabilizar la base?** Contrato N0 y pruebas de aislamiento por subcapa, respaldo (I.07), privacidad (X.03), avisos y exportación como servicios únicos.
4. **¿Core o separado?** Ver B. El Core solo tiene 8 subcapas; lo demás es compartido o función.
5. **¿Qué necesita GYM?** C: sobre todo avisos por el canal único, el informe de asistencia, E-01/E-02 y probar el acceso en un dispositivo físico.
6. **¿Qué necesita RESTAURANTE?** D: casi todo lo propio (mesas, comandas, recetas) no existe; antes hay que decidir G-04.
7. **¿Qué mezclas impiden avanzar?** E-01, E-02, E-04, E-05 y E-06.
8. **¿Mantener, rellenar o aplazar?** 32 MANTENER · 25 RELLENAR · 13 APLAZAR (reglas en A).
9. **¿Orden correcto?** F: Core → compartidas → contratos → GYM → RESTAURANTE → pruebas entre funciones → aplazado.

## Qué se cambió en `.docs/capas/`

Solo se **añadió**; no se borró ni renombró nada:

- Los niveles que eran títulos vacíos (N0, N5 y N6 en 69 subcapas, más 12 niveles N1–N4) ahora tienen tareas **propuestas** (`_(propuesta)_`, sin marcar). N0 es el contrato; N5 y N6 salen de la plantilla de su arquetipo.
- Se añadieron las tareas de las decisiones transversales aceptadas (exportar e importar en cada formato con envío programado; avisos por WhatsApp, correo, push y toast con su panel; aprobaciones; portales; firma; historial; multisede; IA con API y MCP controlables desde n8n; WhatsApp único).
- Se agregaron 5 casillas de V2: 4 hechas con evidencia (I.02 N2, X.00 N2, II.00 N2 y N4) y 1 pendiente de ejecutar (I.07 N2, migración automatizada).
- Los bloques «Técnico» duplicados **siguen ahí** (E-09, G-09).

## Decisiones aplicadas (de la revisión del 2026-10-24)

Aceptados los 14 hallazgos F01–F14; casillas nuevas de V2 aceptadas; transversales aceptadas salvo plantillas por rubro (ajustar → G-10) y las notas de reportes, avisos e IA (incorporadas como tareas). De las subcapas solo se decidieron I.00 e I.01 («completar»); el resto se rellenó con el mismo criterio para que la lista no quede en blanco, pero **cada propuesta está por aprobar**. Falta decidir el resto del artefacto: acciones por subcapa, olas y decisiones V2 pendientes (v2d, v2g).

## Lo que no se verificó

No se ejecutaron las pruebas en esta tarea; «con pruebas» significa que existen archivos de prueba asociados por carpeta. Nada se probó con Clerk y base reales, ni con dispositivo físico.
