# Estados vacíos

Cuando una vista no tiene nada que mostrar, no se queda en blanco ni parece que está cargando. Muestra **cómo se verá con
datos**, explica **para qué sirve** e **invita a crear lo primero** con un botón.

Componente: `EmptyState` (`components/molecules/empty-state.tsx`) con `mark="page"`. El marco (`EmptyPageFrame`) ocupa el
alto que queda en la pantalla, sin dejar scroll, y centra el contenido.

## 1. Cuándo se usa cada uno

| Caso | Variante | Ejemplo |
|---|---|---|
| Una vista entera está vacía (lista, tablero, módulo recién encendido) | `mark="page"` con datos de ejemplo, invitación y botón | Clientes sin clientes, Pipeline sin oportunidades |
| La búsqueda o un filtro no encontró nada | `mark="page"` **sin** datos de ejemplo ni primeros pasos; solo el mensaje y cómo salir | «Sin coincidencias para «Ana»» |
| Un bloque pequeño está vacío (tarjeta, panel, Actividad reciente) | `mark="corner"` (texto a la izquierda) | «Aún no hay movimientos» |

Con búsqueda o filtros, `remember={false}`: un «sin coincidencias» no debe cambiar la precarga de la vista.

## 2. Las cuatro capas (de atrás hacia adelante)

1. **Datos de ejemplo de fondo** (`preview`). La tabla como se verá con datos reales: encabezado y filas de 38 px, la cara de
   cada cliente (su blobatar, `CustomerAvatar`) en la primera columna, y valores creíbles (nombres, correos, teléfonos, fechas y montos en pesos colombianos).
   Llena hasta abajo, va desenfocada y se difumina hacia el centro, donde va el texto, y hacia abajo. Es decoración: `aria-hidden`, `inert`, sin
   foco ni clics.
   - **No** es un esqueleto de carga: nada de barras grises. Si parece que está cargando, el usuario espera en vez de crear.
   - Los datos son fijos (sin `Math.random`), así el servidor y el navegador pintan lo mismo.
   - En celular solo se ven las dos primeras columnas.
2. **Icono del área** en un recuadro de 48 px (`icon`): el mismo icono del módulo o de la sección.
3. **Invitación**: un título que nombra lo que falta («Aún no tienes clientes») y una línea que dice **para qué sirve**
   («Registra el primero para llevar su historial, sus citas y sus cobros»). Lenguaje de dueño de negocio, sin tecnicismos.
4. **Acciones y primeros pasos**:
   - **Botón principal** (`action`): crear lo primero, con el nombre exacto («Nuevo cliente», «Nueva oportunidad»). Es dorado
     (`accent`) y lleva el destello `nx-flash`, que se apaga con movimiento reducido.
   - **Acción secundaria** (`secondaryAction`, contorno): otra forma de empezar, normalmente importar («Importar desde Excel»).
   - **Tres primeros pasos** (`highlights`): tarjetas cortas con icono, título y una línea; qué se gana al usar la vista. Nunca
     cifras inventadas.

## 3. Ejemplo

```tsx
<EmptyState
  mark="page"
  headingLevel={2}
  remember={!query}
  icon={<Users />}
  title="Aún no tienes clientes"
  description="Registra el primero para llevar su historial, sus citas y sus cobros."
  action={<Link href="/contactos/nuevo" className={buttonVariants({ variant: "accent", size: "sm" })}><Plus /> Nuevo cliente</Link>}
  secondaryAction={<Link href="/data" className={buttonVariants({ variant: "outline", size: "sm" })}>Importar desde Excel</Link>}
  highlights={[
    { icon: <CalendarClock />, title: "Citas con recordatorio", text: "Agenda y le avisamos por WhatsApp." },
    { icon: <Wallet />, title: "Cobros y cartera", text: "Lo que te paga y lo que te debe." },
    { icon: <History />, title: "Todo en su ficha", text: "Notas, compras y actividad en un lugar." },
  ]}
  preview={{
    columns: ["Cliente", "Correo", "Teléfono", "Próxima cita", "Saldo"],
    rows: [["María Pérez", "maria@correo.com", "300 123 4567", "Hoy, 10:00 a. m.", "$ 0"] /* … ~20 filas */],
  }}
/>
```

Referencia viva: `app/[tenant]/(app)/contactos/_components/customer-table.tsx` (`CUSTOMER_PREVIEW`).

## 4. Tableros

En un tablero (Pipeline del CRM) las columnas reales ya hacen de fondo: se ven con «0» y «$0», y la invitación va en una tarjeta
centrada encima, con la misma estructura (icono, título, para qué sirve, botón, acción secundaria y tres primeros pasos).

## 5. Precarga

Si una vista estaba vacía la última vez, su precarga (`PageSkeleton`) muestra el esqueleto del estado vacío y no filas: icono,
título, dos botones y las tres tarjetas. Se anota con `remember` y se borra en cada navegación.

## 6. Lista de revisión

- [ ] Se ve como la vista llena (datos de ejemplo), no como una carga.
- [ ] El título nombra lo que falta y la línea dice para qué sirve.
- [ ] Hay un botón principal para crear lo primero, con su nombre exacto.
- [ ] Si se puede, una acción secundaria (importar).
- [ ] Tres primeros pasos, sin cifras inventadas.
- [ ] Sin scroll en 320, 390 y 1440 px; legible en claro y oscuro; `pnpm test:e2e` con axe en verde.
- [ ] Búsqueda o filtros: sin datos de ejemplo, con la salida («limpia la búsqueda») y `remember={false}`.
