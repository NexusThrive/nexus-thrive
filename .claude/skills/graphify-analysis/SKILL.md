---
name: graphify-analysis
description: Usa el grafo de Graphify para entender dependencias e impacto, detectando cuándo está obsoleto y sin sustituir pruebas reales.
metadata:
  opencode/autoinvoke: true
---

# Graphify: mapa del conocimiento

Graphify es información estructural. **No garantiza corrección.**

## Comprobación previa

```bash
scripts/nexus-eng knowledge graphify-status --json
```

- `installed: false` → no hay integración operativa. Diloo y usa `grep`/lectura.
- `stale: true` → el grafo no es fiable para decisiones de impacto; regenera con
  autorización o advierte de la limitación.

## Instalación (solo si se autoriza)

Sigue exclusivamente la documentación oficial:
`https://github.com/Graphify-Labs/graphify` y `https://graphiffy.com/docs`.
Fija la versión y el binario con `NEXUS_GRAPHIFY_BIN`. No inventes comandos ni
paquetes.

## Uso

1. Consulta símbolos, llamadas y dependencias del área a cambiar.
2. Cruza el resultado con `grep` y lectura directa; cita archivos reales.
3. Para cambios transversales, produce análisis de impacto: módulos, pruebas y
   contratos potencialmente afectados.
4. Tras cambios relevantes, regenera el grafo y registra fecha y versión.

## Límites

- No sustituye `pnpm test`, `tsc` ni la revisión humana.
- El grafo puede estar incompleto (archivos ignorados, lenguajes no soportados).
- Si el servicio alojado requiere cuenta o envía código fuera del equipo, no se
  activa por defecto.
