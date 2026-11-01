# Guía de tono — NEXUS Thrive

Cómo escribe NEXUS cuando habla con un negocio, con su equipo o con un
prospecto. Aplica a producto, ayuda, sitio, correo, propuestas y redes.

## 1. Principios

1. **Claro antes que ingenioso.** Si una frase necesita explicación, se cambia.
2. **Concreto antes que grandioso.** «Cobra en 30 segundos» vence a «optimiza tu
   flujo de ingresos».
3. **Útil antes que persuasivo.** Primero qué puede hacer la persona; después
   por qué importa.
4. **Honesto antes que completo.** Si falta un dato, se dice; no se rellena.
5. **Breve.** Una idea por frase, una acción por pantalla.

## 2. Registro

- **Tú**, no usted. Excepción: documentos legales y comunicaciones que exijan
  tratamiento formal.
- Español de Colombia. Pesos con separador de miles (`$1.250.000`), fechas
  `25 de octubre de 2026`.
- Sin anglicismos innecesarios: «cobro», no «checkout»; «inventario», no
  «stock» en la interfaz (los tokens técnicos se quedan en el código).
- Sin diminutivos ni condescendencia: «tu negocio», no «tu negocito».

## 3. Verbos de interfaz

| En vez de | Usa |
|---|---|
| Enviar / Aceptar | Cobrar, Guardar, Registrar entrada, Anular venta |
| OK | Entendido, Continuar, Confirmar cobro |
| Error 422 | «No pudimos guardar el cliente: el correo ya existe» |
| Procesando… | «Guardando la venta…» |

La acción principal dice **qué** pasa, no «siguiente».

## 4. Estructura de un mensaje

1. **Qué pasó** (hecho).
2. **Qué significa** (consecuencia para el negocio).
3. **Qué hacer ahora** (una acción).

Ejemplo de error de cobro:

> No se pudo registrar el cobro: el turno de caja está cerrado.
> Abre un turno nuevo y vuelve a intentarlo. La venta no se guardó.

## 5. Estados vacíos

Un estado vacío explica cómo llegar al primer dato, no solo que no hay nada.

- ❌ «No hay clientes.»
- ✅ «Aún no tienes clientes. Registra el primero para poder cobrarle y
  enviarle su recibo.»

## 6. Afirmaciones y pruebas

Toda cifra, cliente, testimonio, premio o comparación necesita:

- fuente y fecha;
- autorización para publicarla;
- distinción entre **disponible**, **prototipo** y **plan futuro**.

Sin eso, se elimina la afirmación o se marca como pendiente. Nunca se publica
una cifra estimada como si fuera medida.

## 7. Palabras que no usamos

revolucionario · disruptivo · líder del mercado · de clase mundial · sinergia ·
ecosistema 360 · solución integral · crecimiento exponencial · garantizado ·
última oportunidad · solo hoy · todos lo están usando

Tampoco usamos signos de exclamación múltiples ni mayúsculas para gritar.

## 8. Tono por contexto

| Contexto | Tono | Ejemplo |
|---|---|---|
| Éxito | Breve y confirmatorio | «Venta registrada. Recibo enviado.» |
| Error | Directo, sin culpar | «No pudimos conectar con WhatsApp. Reintenta en un momento.» |
| Advertencia | Explica el riesgo y la salida | «Anular la venta deja rastro en la bitácora. ¿Continuar?» |
| Onboarding | Guía, un paso a la vez | «Primero registra tu negocio. Después podrás cobrar.» |
| Ventas | Responde la objeción con evidencia | «Hoy incluye POS, caja e inventario. Facturación DIAN está en plan, no disponible.» |
| Crisis | Hechos, impacto, siguiente actualización | «Estamos revisando un fallo en cobros. Afecta a pagos con tarjeta. Actualizamos a las 3:00 p. m.» |

## 9. Accesibilidad del texto

- Enlaces con texto descriptivo («Ver el recibo»), no «clic aquí».
- Nombres accesibles en botones e iconos.
- Sin texto incrustado en imágenes cuando se pueda usar texto real.
- Contraste suficiente también para texto dorado (`--accent-text`).

## 10. Lista rápida antes de publicar

- [ ] ¿Dice qué hace, para quién y qué sigue?
- [ ] ¿Alguna cifra o cliente sin fuente? Eliminar o marcar.
- [ ] ¿Se promete algo que no está implementado?
- [ ] ¿Hay una sola acción principal?
- [ ] ¿Funciona sin imágenes y con lector de pantalla?
- [ ] ¿La publicación tiene autorización humana?
