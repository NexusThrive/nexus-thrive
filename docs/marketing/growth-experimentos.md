# Growth — hipótesis y experimentos

- **Estado:** no hay experimentos ejecutados. No hay analítica instalada.
- **Regla:** sin instrumentación verificada no se declara resultado.

## 1. Punto de partida honesto

No se conocen tasas de conversión, retención ni coste de adquisición con datos
reales. Cualquier cifra en una presentación sería inventada. El trabajo inicial
es **instrumentar y observar**, no optimizar a ciegas.

## 2. Priorización

Cada oportunidad se puntúa por:

- **Impacto esperado** en activación o retención.
- **Confianza** en la hipótesis (evidencia disponible).
- **Coste** de instrumentar y ejecutar.
- **Riesgo** ético, de privacidad y de marca.

Sin evidencia, la confianza es baja y se busca primero una señal cualitativa
(entrevistas, soporte, sesiones observadas).

## 3. Hipótesis iniciales (sin resultados)

| # | Hipótesis | Métrica principal | Cómo se valida | Riesgo |
|---|---|---|---|---|
| H1 | Completar el onboarding en menos pasos aumenta la primera venta | `first_sale_completed` / altas | comparar cohortes tras simplificar | perder datos fiscales necesarios |
| H2 | Un ejemplo guiado con el rubro reduce el abandono inicial | activación a 7 días | prueba con y sin ejemplo | ejemplo que no representa el rubro |
| H3 | El recibo compartido por WhatsApp trae nuevos negocios | altas atribuidas a enlace de recibo | instrumentar atribución | exponer datos en el enlace |
| H4 | Una guía de cierre de caja reduce consultas de soporte | tickets de soporte / activos | medir antes y después | ruido estacional |

Estas hipótesis **no** están probadas. Se registran para no confundir opinión
con resultado.

## 4. Condiciones de parada

Un experimento se detiene si:

- la instrumentación falla o no se puede verificar;
- aparece un riesgo de privacidad o de datos personales;
- el impacto en soporte o errores supera el umbral definido;
- el tamaño de muestra no permite concluir en el periodo previsto.

## 5. Decisión posterior

Toda prueba termina con una de tres decisiones, por escrito:

1. **Adoptar**: el cambio queda y se documenta.
2. **Corregir**: nueva hipótesis con lo aprendido.
3. **Descartar**: se registra el motivo para no repetirlo.

## 6. Qué no se hace

- Declarar éxito sin fuente, periodo y muestra.
- Manipular la interfaz para ocultar costes o forzar una acción.
- Comprar tráfico o seguidores.
- Enviar correo sin consentimiento.
- Usar datos de un negocio para probar mensajes de otro.
- Presentar una estimación como medición.

## 7. Requisitos antes del primer experimento

1. Analítica con consentimiento y eventos definidos (`medicion.md`).
2. Acceso a datos de producción o a un entorno con datos representativos.
3. Dueño del experimento y revisor independiente.
4. Criterio de éxito acordado antes de empezar.
5. Capacidad de revertir el cambio.
