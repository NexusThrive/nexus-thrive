---
title: G · Decisiones pendientes
tags: [arquitectura, decisiones]
updated: 2026-10-25
---

# G · Decisiones pendientes (requieren aprobación humana)

No se resolvieron en silencio. Cada una trae mi recomendación, que es solo una propuesta.

| ID | Pregunta | Opciones | Recomendación | Afecta |
|---|---|---|---|---|
| G-01 | ¿Se aprueba que las ~1.100 tareas propuestas (marcadas `_(propuesta)_`) entren al conteo de casillas? Bajan el avance de 10 % a 6 % | Sí, contadas · Sí, pero aparte · No | Contadas: miden el trabajo real. Se pueden filtrar por la etiqueta | Todas |
| G-02 | ¿Dónde viven membresías, acceso, mesas y comandas? Hoy XI las manda como «de un rubro» | (a) subcapas dentro de V/IV (membresías en V.02, acceso en V.05) · (b) una capa «Funciones de rubro» · (c) XI como plantillas de funciones | (c) para el perfil y (a) para cada función general; solo lo que ningún otro rubro use queda propio | E-04, XI.00 |
| G-03 | ¿`accessCode` y `nfcUid` salen de `Customer`? | Mover a tabla de acceso · Dejar como identificadores genéricos | Dejar como genéricos (los usan el gimnasio y el museo) si la API los llama «identificadores de acceso» | E-02 |
| G-04 | ¿El pedido de restaurante extiende `StoreOrder` o es un objeto propio? | Extender · Propio con contrato hacia ventas | Propio, con evento hacia ventas: su ciclo (mesa, cocina) no es el de una tienda | RST-3, RST-5, E-06 |
| G-05 | ¿Qué proveedor de respaldo y recuperación? | Respaldo del proveedor de base de datos · Copias propias | Decidir con las restricciones de costo; probar la restauración antes de cobrar | I.07 |
| G-06 | ¿X.01 incluye los portales externos o se crea una subcapa propia? | Renombrar X.01 · Subcapa nueva | Subcapa nueva «Portales externos», dejando X.01 para marca y dominios | E-10 |
| G-07 | ¿Qué proveedor de WhatsApp y de correo? | Meta Cloud API · proveedor local · n8n | Uno solo detrás del canal de III.00 | VI.08, III.00 |
| G-08 | ¿Se confirma aplazar Talento Humano completo (VIII)? | Aplazar · Mantener VIII.00 y VIII.02 | Aplazar; retomar solo asistencia si un rubro la pide | F11 |
| G-09 | ¿Se retiran ya los «Técnico» duplicados de N1–N4? | Sí, en este PR · Sí, en otro | En otro PR, tras aprobar el contrato N0 | E-09 |
| G-10 | ¿Cómo se estructuran las plantillas de rubro para que no se vea desordenado? (tu nota en la decisión de plantillas) | Receta de funciones + vocabulario + tablero · Paquetes con datos de ejemplo | Receta (ya existe como `VERTICAL_RECIPES`) más una página «Plantillas» que muestre lo que enciende y lo que carga, sin vender nada | XI.00 |
