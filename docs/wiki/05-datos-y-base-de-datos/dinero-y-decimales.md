# Dinero y decimales

Convención compartida para todo código que lea, calcule o escriba montos. Es un resumen: el detalle y los comentarios
originales siguen en el código.

## 1. Cómo se guarda y cómo se lee un monto

| Dónde | Representación | Por qué |
|---|---|---|
| Base de datos | Columnas `Decimal` | Precisión exacta |
| Lectura desde el driver de Prisma 8 | **Texto** (`string`) | El driver materializa los `Decimal` como cadenas y también acepta cadenas al escribir |
| Cálculo de costos de obra (APU, presupuestos) | **`BigInt` en micro-unidades**: 1 COP = 1 000 000, 6 decimales | Cero `number` en operaciones monetarias: sin error de coma flotante y resultado igual en todos los entornos |
| Monto escrito a mano en un formulario | `parseCopAmount` → decimal canónico en texto (`"1234567.89"`), máximo 2 decimales, mayor que cero | Llega intacto a la columna `Decimal` sin pasar por `number` |
| Mostrar en pantalla | `toNumber` / `formatCurrency` (`number`) | Solo para formatear; **nunca** para calcular. Los montos en micro-unidades usan el formateador de `BigInt` |

Regla práctica: un monto no se convierte a `number` para sumar, restar ni redondear. Se convierte a `number` únicamente al
final, para mostrarlo.

### Montos escritos a mano (`parseCopAmount`)

- Acepta `150000`, `150000,5`, `150.000`, `1.234.567,89`, `150,000`, `1,234,567.89` y `$ 150.000`.
- Un único separador seguido de **exactamente 3 dígitos** es de miles (`150.000` = 150000), porque el peso no usa milésimas.
- Devuelve `null` si el texto no es un monto válido o es cero.

### Motor de costos (APU)

- `parseMoney` rechaza vacíos, `NaN`, `Infinity`, notación científica y más de 6 decimales.
- Redondeo half-up.
- El motor es solo de servidor, no importa interfaz y es el único lugar autorizado para costo de componentes, costo unitario,
  totales de presupuesto y validación numérica.

## 2. Cómo se mueve el dinero (servicio de dinero)

Un cobro es varias escrituras (el pago, su recibo consecutivo, la caja del turno, el estado del documento que se paga, el stock
que se vende) y deben ocurrir **todas o ninguna**.

1. **Una sola transacción** (`moneyTransaction`). Si dos cobros chocan por el mismo número de recibo o de documento
   (restricción única por negocio), la transacción **entera** se reintenta con el número siguiente, hasta 5 reintentos. Nunca queda
   un pago sin número ni una caja sin su movimiento.
2. **Lo que se cobra una sola vez se reclama con un `UPDATE` condicional** sobre su estado (una factura, una reserva, un pago
   que se anula). Si otro clic ya lo reclamó, el `UPDATE` no afecta filas y se aborta: no hay doble cobro.
3. **Los pagos no se borran, se anulan** con motivo (`voidPayment`, `voidExpense`).
4. Solo `money-service` mueve dinero (regla del `CLAUDE.md`); `app/` llama a los repositorios de `lib/`.

## 3. Referencias

| Qué | Dónde |
|---|---|
| Servicio de dinero | `lib/business/money-service.ts` |
| Decisión | `docs/decisions/arquitectura/0006-servicio-de-dinero.md` (estado «Propuesta») y `DATA-01` en `docs/internal/historico/nexus-architecture/technical-debt.md` |
| Montos a mano | `lib/finance/cop-amount.ts`, prueba `lib/finance/cop-amount.test.ts` |
| Motor de costos | `lib/construction/apu-engine.ts`, prueba `lib/construction/apu-engine.test.ts` |
| Formato | `lib/format.ts` (`toNumber`, `formatCurrency`) |
| Concurrencia del dinero | `lib/business/money-service.integration.test.ts` |

## 4. Diferencias a tener presentes

- **El ADR-0006 describe otra ubicación.** Habla de `lib/capabilities/money` con `recordIncome`/`recordExpense`; el servicio
  real está en `lib/business/money-service.ts` y expone `recordIncome`, `payInvoice`, `receiveInvoicePayment`, `payTicketSale`,
  `sellProduct`, `voidPayment` y `voidExpense`. El ADR sigue en «Propuesta».
- **Capa:** `money-service` está clasificado como Business y llama a Finance (contabilización, impuestos, cartera). Son las
  excepciones de la etapa E5 en `docs/architecture/exceptions.json`.
- **No verificado:** si todos los módulos que no son de obra (facturas, pagos, caja) calculan con texto/`BigInt` o con `number`.
  Esta nota fija la convención del motor de costos y de los formularios; no audita el resto.
