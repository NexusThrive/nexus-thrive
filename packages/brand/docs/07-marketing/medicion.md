# Medición y métricas — NEXUS Thrive

- **Estado del dato:** **no hay analítica instalada** en este repositorio. Este
  documento define qué se medirá y cómo; no contiene resultados.
- **Regla:** sin fuente, no hay métrica. Un dato estimado se etiqueta como
  estimación; una ausencia se declara como ausencia.

## 1. Estado real de la instrumentación

| Comprobación | Resultado |
|---|---|
| `gtag`/Google Analytics | no encontrado |
| PostHog / Plausible / Vercel Analytics | no encontrado |
| Eventos de producto instrumentados | no verificados |
| Search Console / Bing | sin credenciales |
| Datos de producción | no accesibles en este entorno |

Conclusión: **no se puede reportar adquisición, activación, conversión ni
retención con datos reales**. Cualquier cifra de marketing hoy sería inventada.

## 2. Diccionario de métricas (a instrumentar)

Cada métrica necesita definición, evento, dueño y periodo.

| Métrica | Definición | Evento propuesto | Dueño |
|---|---|---|---|
| Visita | Sesión en página pública | `page_view` | Marketing |
| Solicitud de demo | Formulario enviado y correo válido | `demo_requested` | Marketing |
| Registro | Cuenta creada y correo verificado | `account_created` | Producto |
| Negocio creado | Tenant con nombre y rubro | `tenant_created` | Producto |
| Activación | Primer cobro registrado con recibo | `first_sale_completed` | Producto |
| Uso semanal | ≥3 días con al menos una venta | derivado | Producto |
| Retención M1 | Negocios activos a 30 días del alta | derivado | Producto |
| Ticket promedio | Valor de ventas / número de ventas | derivado | Finanzas |
| Conversión a plan pago | Negocios con suscripción activa / activados | derivado | Finanzas |
| Coste de adquisición | Inversión / altas atribuidas | derivado | Marketing |

**Privacidad:** no se instrumentan datos personales innecesarios ni contenido de
clientes. Todo evento debe poder explicarse y desactivarse.

## 3. Proceso de medición

1. Definir la pregunta y la métrica principal antes de tocar código.
2. Verificar que el evento se emite (prueba real, no suposición).
3. Registrar periodo, filtros y fuente.
4. Analizar y escribir la decisión (continuar, corregir, detener).
5. Guardar el resultado aunque sea negativo.

## 4. Plantilla de ficha de experimento

```markdown
## Experimento: <nombre>
- Hipótesis: si <cambio>, entonces <métrica> <dirección> porque <razón>.
- Público y superficie:
- Métrica principal: <definición y evento>
- Métricas de protección: <errores, soporte, cancelaciones>
- Duración / condición de parada:
- Riesgos éticos, de privacidad y de marca:
- Decisión si gana / pierde / no concluye:
- Estado: propuesto | instrumentado | en curso | concluido
```

## 5. Reglas de reporte

- Toda tabla de resultados indica fuente, periodo y fecha de extracción.
- Si la fuente no está disponible: «dato no disponible», nunca un cero.
- No se comparan periodos con instrumentación distinta sin decirlo.
- No se presenta una correlación como causalidad.
- Un resultado negativo se documenta igual que uno positivo.

## 6. Qué falta para medir de verdad

1. Decidir herramienta de analítica y consentimiento.
2. Instrumentar los eventos de la tabla con pruebas.
3. Acceso a Search Console y a datos de producción.
4. Definir el periodo de referencia y el tablero mínimo.
5. Asignar dueño de cada métrica.
