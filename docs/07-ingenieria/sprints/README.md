# Sprints

## Responsabilidad

Registrar planes y cierres con evidencia. No hay un sprint activo confirmado en el [plan de producto](../../01-producto/plan.md); no se crean carpetas vacías ni reportes ficticios.

Cada sprint real usa `S<nn>/plan.md` para objetivo, historias HU, dependencias, riesgos y criterio de cierre; `S<nn>/reporte.md` registra estado, intentos, ramas, PR, comandos, resultados y veredictos independientes. Las notas opcionales explican incidentes o desviaciones.

El flujo es Hito M → Sprint S → Historia HU → Rama → PR → Verificación. Las ramas de tarea siguen la [convención HU](../ramas.md); los PR se integran según su base acordada. La promoción del sprint a main requiere aprobación humana.

Antes de iniciar trabajo nuevo, comprobar `docs/07-ingenieria/PAUSA`. Si existe, detener el ciclo y registrar el estado; el agente nunca elimina ese marcador. No se inicia un sprint con dependencias sin resolver ni se declara cerrado sin justificar historias bloqueadas.

Los reportes se mantienen con evidencia de git, PR y comandos reales. El motor nexus-eng fue retirado: sus comandos de generación y cierre no están disponibles y no se usan.
