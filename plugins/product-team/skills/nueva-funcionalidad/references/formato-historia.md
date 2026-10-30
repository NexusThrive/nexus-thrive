# Formato estándar de historia de usuario

## Estructura

```
Como <rol del sistema>,
quiero <acción o capacidad>,
para <beneficio o resultado>.
```

## Criterios de aceptación (Given / When / Then)

```
Escenario: <nombre corto del comportamiento>
  Dado <estado inicial concreto>
  Cuando <acción del usuario o evento>
  Entonces <resultado observable>
```

Reglas:
- Un escenario por comportamiento.
- Usa nombres reales de campos, estados y roles tomados del código.
- Evita adjetivos vagos ("rápido", "adecuado", "intuitivo"). Si necesitas un umbral, escríbelo como número.

## Ejemplo completo

```
ID: HU-exportar-reportes-01
Título: Exportar reporte a PDF

Como usuario con rol Administrador,
quiero descargar un reporte en formato PDF,
para compartirlo con clientes sin acceso al sistema.

Criterios de aceptación:

Escenario: Descarga exitosa de un reporte finalizado
  Dado que el reporte tiene estado "Finalizado"
  Cuando hago clic en "Exportar PDF"
  Entonces se descarga un archivo PDF con el mismo nombre del reporte

Escenario: Reporte aún en borrador
  Dado que el reporte tiene estado "Borrador"
  Cuando hago clic en "Exportar PDF"
  Entonces veo el mensaje "El reporte debe estar finalizado para exportarse"
  Y no se descarga ningún archivo

Reglas de negocio:
- Solo reportes en estado "Finalizado" son exportables. Fuente: <ruta del archivo en el código>.

Dependencias: ninguna
Fuera de alcance: exportación a Excel
Tamaño sugerido: M
```

## Definition of Ready

- Rol, acción y beneficio definidos.
- Al menos un escenario ejecutable por un tester.
- Sin "TBD" ni adjetivos vagos en los criterios.
- Dependencias listadas.
- Tamaño S, M o L. Si es XL, dividir.
