---
description: Investiga el código y el impacto antes de diseñar un cambio
agent: engineering-manager
---

Investiga: $ARGUMENTS

1. Consulta el estado del grafo:
   `scripts/nexus-eng knowledge graphify-status --json`.
   - Si `installed=false`, dilo y usa `grep`/lectura directa; no simules el grafo.
   - Si `stale=true`, advierte que el grafo no es fiable y regenera solo si el
     usuario lo autoriza.
2. Delega en `mesa-de-trabajo`: mapa de archivos, símbolos, flujos y pruebas
   existentes, con referencias exactas.
3. Si el cambio cruza módulos, pide a `arquitecto` un análisis de impacto y un
   ADR si cambia un límite.
4. Usa el Knowledge Hub para documentación y decisiones previas:
   `scripts/nexus-eng knowledge search "<tema>" --json`.
5. Entrega: mapa de impacto, riesgos, reutilización, vacíos de información y
   siguiente acción. No modifiques código en este comando.
