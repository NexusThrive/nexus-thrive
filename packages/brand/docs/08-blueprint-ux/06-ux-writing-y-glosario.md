# 06 · UX Writing y glosario oficial

[← Índice](README.md) · Decisiones citadas: DR-24, DR-25, DR-26, DR-27, DR-28, DR-32, DR-33, DR-34, DR-35, DR-44. Estado en `01`.

> **Estado de este documento: borrador de glosario para aprobar (PD-03).** Nada se renombra mientras no se apruebe (DR-24). Donde una palabra de hoy choca con una regla ya aprobada, se **documenta el conflicto** y se propone una salida; no se aplica.

**Base que no se reescribe:** `01-marca/guia-de-tono.md` (tú, español de Colombia, claro antes que ingenioso, estructura «qué pasó / qué significa / qué hacer», palabras prohibidas, afirmaciones con fuente). Este documento la **amplía** con glosario, estados, mensajes y reglas de aplicación.

## 1. Voz y reglas de escritura (porqué: B1–B5, P6)

| Regla | Porqué | Correcto | Incorrecto |
|---|---|---|---|
| **Tú**, nunca usted (salvo documentos legales) | B3 local, B4 serena | «Registra tu primer cliente» | «Usted puede registrar su primer cliente» |
| **Verbo concreto + objeto** en botones | P6, B1 directa | «Guardar cambios», «Crear cliente» | «Enviar», «Aceptar», «OK» |
| **Una idea por frase**, la acción principal al final | D1 | «No se guardó la venta. Revisa la conexión y vuelve a intentarlo.» | «Ha ocurrido un error inesperado durante el proceso de guardado.» |
| **Sin anglicismos innecesarios** | B3 | «cobro», «inventario» | «checkout», «stock» (en pantalla) |
| **Sin diminutivos ni condescendencia** | B4 | «tu negocio» | «tu negocito» |
| **Sin urgencia falsa ni exclamaciones múltiples** | B4 serena, B5 honesta | «Tu prueba termina el 8 de noviembre.» | «¡Última oportunidad!!!» |
| **Dinero:** `$1.250.000`, separador de miles con punto; **fechas:** `25 de octubre de 2026` | B3 | `$ 4.850.000` | `4,850,000 COP` |
| **Mayúscula inicial solo en la primera palabra** de botones y títulos de pantalla (nombres propios aparte) | B1 | «Crear cliente» | «Crear Cliente» |
| **Nunca culpar al usuario** | B4 | «No encontramos ese correo» | «Escribiste mal el correo» |
| **No prometer lo que no existe** | P3, B5 | «Disponible», «En prueba», «En plan» | Listar una marca sin conexión real |

## 2. Tono por situación

Ya definido en la guía de tono §8. Se añade la estructura para las situaciones nuevas:

| Situación | Estructura | Tono |
|---|---|---|
| Éxito | Hecho + qué sigue (opcional) | Breve |
| Error | Qué pasó + qué se perdió o no + qué hacer | Directo, sin culpar |
| Advertencia | Riesgo + salida | Explica antes de pedir confirmar |
| Acción irreversible | Qué se pierde + qué no se puede deshacer + botón con el verbo exacto | Claro y sereno |
| Sin permiso | Qué no puede hacer + quién sí + cómo pedirlo | Neutro |
| Sincronización [F] | Estado + último dato recibido + qué hacer | Informativo |

## 3. Glosario oficial propuesto

Cada fila: **concepto → término propuesto → qué evitar → regla de uso → estado hoy**. «Estado hoy» indica si la interfaz ya cumple, choca o no se ha verificado. Los recuentos de §7 incluyen comentarios e identificadores de código; sirven para ver coexistencia, no frecuencia en pantalla.

### 3.1 Estructura del producto

| Concepto | Término propuesto | Evitar | Regla de uso | Estado hoy |
|---|---|---|---|---|
| El espacio de trabajo de una empresa | **Negocio** | Tenant, cuenta, organización, empresa | «Tu negocio», «Cambiar de negocio» | «Negocio» domina; «Empresa» aparece en perfil de registro (persona/empresa), que es otro concepto |
| Pantalla principal | **Inicio** | Dashboard, panel | «Inicio» en menú y títulos | Menú: «Inicio». El nombre corto de la capacidad es «Dashboard» (DR-32) |
| Unidad que se enciende o apaga | **Función** | Módulo, capacidad, plugin | «Funciones» en menú; «módulo» solo en documentación técnica | La UI usa «Funciones»; el código y la documentación usan «módulos/capacidades» |
| Ajustes del negocio | **Configuración** | Ajustes, preferencias, settings | Un solo nombre en menú, botones y textos de ayuda | **Conflicto:** menú «Configuración»; el onboarding dice «Ajustes» (`flow.ts`) |
| Grupo anclado del menú | **Sistema** | — | Contiene Funciones, Importar y exportar, Configuración (y, luego, Integraciones) | Existe |
| Persona de tu negocio con acceso | **Integrante** (equipo: **Equipo**) | Usuario, miembro, staff | «Invitar a un integrante», «Tu equipo» | Coexisten Usuario, Miembro, Integrante, Equipo |
| Nivel de acceso de un integrante | **Rol** | Perfil, permisos (solo como lista de lo que permite) | «Rol: Administración» | Roles en UI: Dueño, Administración, Recepción, Asesor |
| Quien dirige el negocio | **Dueño** (en el negocio) · **Propietario** (en el Operations Center de Nexus) | Mezclarlos | Dos modelos de roles distintos (`09`) | `Dueño` 92 menciones; `Propietario` 9 |

### 3.2 Dinero (DR-25: Cobro ≠ Pago)

| Concepto | Término propuesto | Definición | Evitar |
|---|---|---|---|
| Dinero que un cliente debe pagar o que el negocio recibe de un cliente | **Cobro** | Lo que **entra** y se gestiona frente a un cliente | «Pago» para esto |
| Salida de dinero o liquidación de una obligación del negocio | **Pago** | Lo que **sale**: proveedores, gastos pagados, impuestos | «Cobro» para esto |
| Venta registrada | **Venta** | Operación comercial que origina uno o más cobros | «Orden», «transacción» |
| Dinero gastado | **Gasto** | Salida registrada con su categoría | «Egreso» (4 menciones) |
| Dinero recibido (total) | **Ingresos** | Suma de cobros confirmados del periodo | «Entradas» |
| Compra a proveedor | **Compra** | Adquisición de insumos o mercancía | — |
| Lo que los clientes aún deben | **Por cobrar** (indicador) · **Cartera** (módulo) | «Cartera» es término contable colombiano; se conserva | «Cuentas por cobrar» (largo) |
| Cuenta de caja de un turno | **Caja** · **Turno** | La caja se abre y cierra por turno | — |
| Constancia entregada al cliente | **Recibo** | Comprobante de un cobro | — |
| Documento que el negocio emite para cobrar | **Cuenta de cobro** | Documento simple, sin factura electrónica | — |
| Documento fiscal electrónico DIAN | **Factura electrónica** | Requiere proveedor habilitado; estado «en prueba» (BETA) | «Facturación» para los dos |
| Módulo de documentos de cobro | **Facturación** (nombre actual) | Su relación con «Factura electrónica» debe quedar explícita | — |

**Conflictos documentados (no se aplica ningún cambio)**

| Dónde | Hoy | Choque con DR-25 | Salida propuesta (PD-03) |
|---|---|---|---|
| Menú, grupo «Ventas y cobros» | Ítem **«Pagos»** que abre `/finance?tab=cobros` | Se llama «Pago» a lo que entra de un cliente | Revisar qué muestra la pantalla; candidatos: «Cobros» o «Cobros y pagos» si muestra ambos |
| Ayuda del indicador Ingresos | «Suma de los **pagos** aprobados del periodo» | El texto mezcla ambos sentidos | «Suma de los **cobros** confirmados del periodo» |
| Ruta `/payments` | Solo redirige | El nombre de ruta es interno | No cambia; solo texto visible |
| Capacidad `payments` | Etiqueta «Pagos», descripción «Cobros y control de pagos» | Mismo choque | Glosario fija ambas formas |

### 3.3 Productos y existencias

| Concepto | Término propuesto | Evitar | Nota |
|---|---|---|---|
| Lo que el negocio vende | **Producto** (bien) · **Servicio** | Ítem, artículo | «Catálogo» agrupa ambos |
| Lista de lo que vende | **Catálogo** | — | Choca con «Catálogo APU» de construcción: se escribe siempre «Catálogo APU» completo |
| Cantidades disponibles | **Existencias** (cantidades) · **Inventario** (el módulo y el control) | Stock | La guía de tono ya prohíbe «stock» en pantalla; en el código aparece 68 veces como identificador |
| Pedido de un cliente | **Pedido** | Orden | «Pedido» (capacidad en plan) y «Pedidos de la tienda» deben distinguirse con su contexto |

### 3.4 Sistema y trazabilidad

| Concepto | Término propuesto | Evitar | Nota |
|---|---|---|---|
| Registro de lo que ocurrió | **Historial** | Bitácora, log, registro (como verbo) | La guía de tono dice «bitácora»; la construcción usa «Bitácora de obra» (término propio del oficio, se conserva) |
| Lo ocurrido recientemente | **Actividad** | — | Inicio: «Actividad reciente» |
| Aviso al usuario | **Notificación** | Alerta (reservar «alerta» a niveles urgentes) | — |
| Herramienta externa | **Integración** (el concepto) · **herramienta** (cada una) | Plugin, conector, app | «Conectar herramienta» como verbo |

## 4. Nombres de las capacidades (DR-32)

Cada capacidad tiene hoy tres nombres. El glosario los separa por función: **etiqueta corta** (chips, planes), **nombre en «Funciones»** y **etiqueta del menú**. Fuente: `registry.ts`. **Propuesta de unificación = PD-04; no se renombra.**

| Capacidad | Etiqueta corta | Nombre en «Funciones» | Menú | Observación |
|---|---|---|---|---|
| `crm` | CRM | Clientes | Término del rubro (Clientes, Socios, Pacientes…) | «CRM» es siglas en inglés (guía de tono: sin anglicismos innecesarios) |
| `bookings` | Reservas | Reservas | Del rubro (Reservas, Clases, Citas…) · Taquilla | — |
| `payments` | Pagos | Pagos | Pagos | Ver §3.2 |
| `billing` | Facturación | Facturación | Facturación | Aclarar frente a Factura electrónica |
| `inventory` | Inventario | Catálogo e inventario | Catálogo · Existencias | Tres formas |
| `finance` | Finanzas | Finanzas | Finanzas | Coherente |
| `dashboard` | Dashboard | Inicio | Inicio | Anglicismo en la etiqueta corta |
| `whatsapp` | WhatsApp | WhatsApp | WhatsApp | Marca propia |
| `memberships` | Membresías | Membresías | Membresías · Control de acceso | — |
| `purchases` | Compras | Compras y proveedores | Compras (o término del rubro) | — |
| `orders` | Pedidos | Pedidos | Pedidos | Capacidad en plan |
| `quotes` | Cotizaciones | Cotizaciones | (nav de Construcción) | Capacidad en plan; etiqueta repetida en Construcción |
| `construction` | Construcción | Obras y presupuestos | Proyectos/Obras · Cotizaciones · Catálogo APU | — |
| `pos` | Punto de venta | Punto de venta | Punto de venta | Largo para el riel |
| `online_payments` | Cobros en línea | Cobros en línea | Cobros en línea | Coherente con DR-25 |
| `einvoicing` | Factura electrónica | Factura electrónica | Factura electrónica | Largo para el riel |
| `receivables` | Cartera | Cartera | Cartera | — |
| `accounting` | Contabilidad | Contabilidad | Contabilidad | En prueba |
| `taxes` | Impuestos y numeración | Impuestos y numeración | Impuestos y numeración | Largo para el riel |
| `website` | Sitio y tienda | Sitio web y tienda en línea | Mi sitio web · Pedidos de la tienda | «Mi» solo aquí |
| `google` | Ficha de Google | Ficha de Google | Ficha de Google | En prueba |
| `growth` | Campañas y reseñas | Campañas y reseñas | Campañas y reseñas | — |

**Abreviaturas del riel (768–1023 px, DR-14).** Regla: derivar del nombre completo, ≤ 10 caracteres, sin inventar términos nuevos, y mantener el nombre completo como nombre accesible. Los casos largos se resuelven **al aprobar el glosario**:

| Nombre completo | Candidatos (a decidir en PD-04) |
|---|---|
| Punto de venta | «Punto venta», «Caja» (si no choca con Caja de turnos) |
| Factura electrónica | «Fact. elec.», «Electrónica» |
| Impuestos y numeración | «Impuestos» |
| Cobros en línea | «Cobros web», «En línea» |
| Campañas y reseñas | «Campañas» |
| Control de acceso | «Acceso» |
| Pedidos de la tienda | «Tienda» |

## 5. Verbos de interfaz (DR-26)

**Datos medidos** (literales en botones, `app/` y `components/`): «Aceptar» 0, «OK» 2, «Enviar» 2, «Guardar» 8, «Cancelar» 8, «Cerrar» 4, «Continuar» 3, «Confirmar» 1, «Crear» 11, «Eliminar» 1, «Anular» 3, «Editar» 3. La disciplina es **buena**; la regla se formaliza, no se corrige un problema grave.

| Situación | Verbo | Patrón | Ejemplo |
|---|---|---|---|
| Crear | **Crear** + objeto | «Crear cliente» | Sustituye a «Nuevo», «Agregar» |
| Guardar edición | **Guardar cambios** | — | Sustituye a «Guardar» solo |
| Salir sin guardar | **Cancelar** | Cierra sin guardar | No se usa para anular un registro |
| Cerrar información | **Cerrar** | Ventanas sin cambios | — |
| Avanzar en un asistente | **Continuar** | — | — |
| Confirmar una acción | **Verbo exacto de la acción** | «Anular venta», «Eliminar cliente» | Nunca «Confirmar» solo |
| Cobrar | **Cobrar** / **Registrar cobro** | — | Por la acción principal del POS |
| Exportar | **Exportar datos** | — | — |
| Conectar herramienta | **Conectar** / **Reconectar** / **Desconectar** | + nombre de la herramienta | «Conectar Wompi» |
| Ver | **Ver detalles** | — | — |

**Acciones destructivas (propuesta PD-03):** cuatro verbos hoy conviven («Eliminar» 64, «Anular» 29, «Borrar» 15, «Archivar» 11 menciones, con la advertencia de §11 sobre los recuentos).

| Verbo | Significa | Se puede deshacer | Cuándo |
|---|---|---|---|
| **Archivar** | Deja de mostrarse; conserva todo | Sí | Por defecto, para registros con historial |
| **Anular** | Invalida un documento o una venta y **deja rastro** | No se borra | Dinero (P5) |
| **Eliminar** | Borra definitivamente | No | Solo sin rastro financiero ni referencias |
| **Borrar** | — | — | **No se usa** (sinónimo de eliminar) |

## 6. Estados (DR-27)

**Regla:** texto + icono + color; el nombre del estado concuerda en género con el sustantivo («Venta anulada», «Cobro pendiente»).

| Estado | Significado | Color funcional | Se usa para | Presencia en la interfaz hoy |
|---|---|---|---|---|
| Activo/a | En uso | Neutro o éxito | Clientes, membresías, funciones | Sí («Activo» 6, «Activa» 4) |
| Pendiente | Espera una acción o un dato | Aviso | Cobros, documentos | Sí (7) |
| En proceso | Se está procesando | Neutro | Importaciones, sincronizaciones, envíos | Casi nula (0 literales) |
| Completado/a | Terminó bien | Éxito | Importaciones, pedidos | Casi nula (1) |
| Cancelado/a | Se detuvo antes de completarse | Neutro | Reservas, pedidos | Sí (5) |
| Vencido/a | Pasó su fecha | Peligro | Membresías, cobros | Sí (7) |
| Conectado | Integración activa | Éxito | Integraciones | 1 literal |
| Desconectado | Integración inactiva | Neutro | Integraciones | 0 |
| Requiere atención | Hay algo que resolver | Aviso | Integraciones, documentos, notificaciones | 0 |
| *Estados ya presentes que el vocabulario debe absorber* | Pagado/a (6), Anulado/a (7), Suspendido (5), Rechazado (1), Abierto/Cerrado (caja/turno) | — | — | Existen; se integran sin renombrar hasta aprobar |

Los nombres de estado de **Prisma/código** (p. ej. `PENDING`, `PAID`) son internos y no se traducen en la base: el vocabulario vive en la capa de presentación.

## 7. Mensajes (plantillas)

Estructura común de la guía de tono §4. Los ejemplos usan funciones que **ya existen**.

| Situación | Plantilla | Ejemplo correcto | Ejemplo incorrecto |
|---|---|---|---|
| **Confirmación** | «{Objeto} {acción}. {Qué sigue, si aplica}» | «Venta registrada. Recibo enviado.» | «Operación completada con éxito.» |
| **Error** | «No se pudo {acción}: {causa}. {Qué hacer}. {Qué pasó con los datos}» | «No se pudo registrar el cobro: el turno de caja está cerrado. Abre un turno nuevo y vuelve a intentarlo. La venta no se guardó.» | «Error 422.» |
| **Advertencia** | «{Acción} {consecuencia}. ¿{Verbo}?» | «Anular la venta deja rastro en el historial. ¿Anular venta?» | «¿Está seguro?» |
| **Validación de campo** | «{Campo} {qué falta o sobra}. {Cómo corregirlo}» | «El correo no tiene un formato válido. Revisa que incluya @ y un dominio.» | «Campo inválido» |
| **Estado vacío** | «{Aún no tienes X}. {Cómo llegar al primer dato}» | «Aún no tienes clientes. Registra el primero para cobrarle y enviarle su recibo.» | «No hay clientes.» |
| **Carga** | «{Gerundio de la acción}…» (con forma del contenido) | «Guardando la venta…» | «Cargando…» suelto |
| **Sin resultados** | «No encontramos {X} con "{búsqueda}". {Sugerencia}» | «No encontramos clientes con "Marta". Revisa la ortografía o crea un cliente nuevo.» | «0 resultados» |
| **Sin permiso** (DR-34) | «No puedes {acción}. {Rol que sí puede} puede hacerlo.» | «No puedes anular ventas. El dueño o administración puede hacerlo.» | Texto distinto en cada pantalla |
| **Problema de conexión** | «Sin conexión. {Qué sigue funcionando} {Qué se reintentará}» | «Sin conexión. Tus cambios no se han guardado; los reintentaremos al volver.» (**solo si es cierto**) | Prometer un reintento que no existe |
| **Sincronización** [F] | «{Herramienta}: {estado}. Última sincronización {cuándo}» | «Alegra: requiere atención. Última sincronización hoy a las 3:00 p. m.» | — (no existe todavía) |
| **Acción irreversible** | «Se eliminará {X} para siempre. No se puede deshacer.» + botón con verbo exacto | «Se eliminará el cliente para siempre. No se puede deshacer.» [Eliminar cliente] | «¿Continuar?» [Aceptar] |

**Sin permiso (DR-34):** hoy 13 páginas muestran un aviso propio (se leyó el texto de 4: «Solo el dueño o administración maneja…», «Tu rol no maneja cobros en línea», etc.). Propuesta: el texto se compone con los roles que la matriz de permisos autoriza para esa acción, de modo que **no pueda quedar desactualizado** si el permiso cambia.

## 8. Formularios (DR-44)

Cada campo lleva:
1. **Etiqueta visible**, siempre (nunca solo placeholder). Porqué: D7.
2. **Ayuda** (`hint`) solo si la persona la necesita para llenar el campo; nunca solo en tooltip ni `title`.
3. **Validación comprensible** al salir del campo o al enviar; resumen de errores al enviar cuando hay varios.
4. **Mensaje de error accionable**, con icono y texto, asociado al campo (`aria-describedby`).
5. El **placeholder** muestra un ejemplo de formato, no sustituye la etiqueta.

| Tipo de error | Plantilla | Ejemplo |
|---|---|---|
| Obligatorio | «{Campo} es obligatorio» | «El nombre del cliente es obligatorio.» |
| Formato | «{Campo} no tiene un formato válido. {Ejemplo}» | «El teléfono debe tener 10 dígitos. Ejemplo: 300 123 4567.» |
| Duplicado | «Ya existe {X} con ese {campo}. {Salida}» | «Ya existe un cliente con ese correo. Ábrelo o usa otro correo.» |
| Rango | «{Campo} debe estar entre {a} y {b}» | — |

Medición base: 174 `placeholder` frente a 173 etiquetas en el código; se revisa uno a uno (no se asume que falten etiquetas).

## 9. Cómo se aplica

| Mecanismo | Qué hace | Estado |
|---|---|---|
| Glosario aprobado en Storybook (página «Lenguaje») | Una fuente consultable | Por crear tras aprobar (no es código de producción) |
| Revisión de PR | La lista de calidad incluye «¿usa el glosario?» | `quality-checklist.md` ya tiene textos |
| Regla automática de botones genéricos | Marca «Aceptar», «OK», «Enviar» fuera de excepciones | **Propuesta**; la línea base es 4 literales |
| Renombrado por oleadas | Solo tras aprobar PD-03, con nota de cambio | Pendiente |
| Medición | Conteos de §3 y §5, repetidos tras cada oleada | Línea base en este documento |

## 10. Criterios de aceptación
- 0 renombrados aplicados antes de aprobar el glosario (DR-24).
- Cada término oficial tiene definición, término a evitar y regla.
- Los 22 nombres de capacidades documentados con sus tres formas.
- Cobro y Pago separados en todos los textos nuevos (DR-25).
- Plantilla única de «sin permiso» (DR-34).

## 11. Límites
- Los recuentos de §3 cuentan coincidencias en `.ts/.tsx` de `app/`, `components/`, `lib/experience`, `lib/core/capabilities` y `lib/core/sectors`, **incluidos comentarios e identificadores**. Indican coexistencia, no frecuencia en pantalla.
- No se recorrió la interfaz real para leer cada pantalla: los términos que viven en textos de base de datos o en CMS no se auditaron.
- No se verificó qué muestra exactamente la pantalla «Pagos»; el candidato a nombre depende de eso.
- Los estados de Prisma no se revisaron uno a uno.
