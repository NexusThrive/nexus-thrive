# 01 · Filosofía y registro de decisiones

[← Índice](README.md) · Fuente única de decisiones del blueprint. Los demás documentos **citan** estos identificadores; no los redefinen.

## 1. La filosofía que sostiene toda decisión

Todo lo siguiente ya está escrito en el repositorio. Aquí solo se reúne con siglas.

**Promesa de producto:** «Simplifica tu vida financiera y empresarial en un solo sitio» (`01-marca/brand-book.md`). Nexus es el sistema operativo del negocio para pymes colombianas.

| Sigla | Principio | Fuente | Pregunta de prueba |
|---|---|---|---|
| **D1** | Claridad antes que complejidad | `03-sistema/SYSTEM-DESIGN.md` §3 | ¿Qué decisión permite tomar cada elemento de la pantalla? |
| **D2** | Consistencia en todo el sistema | idem | ¿Se hace igual que en los demás módulos? |
| **D3** | El contexto determina la experiencia (rubro, tipo de negocio, rol) | idem | ¿Cada contexto ve lo suyo, sin menús que no usa? |
| **D4** | Progreso visible y honesto | idem | ¿La barra o la cifra es real o decora? |
| **D5** | Acciones con propósito | idem | Si se quita, ¿alguien lo echaría de menos? |
| **D6** | Complejidad progresiva | idem | ¿Una persona nueva completa la tarea sin ver opciones avanzadas? |
| **D7** | Accesibilidad y confianza | idem | ¿Se puede con teclado, con una mano y sin color? ¿Se puede deshacer o ver el rastro? |
| **D8** | Mobile as a First-Class Experience (ratificado) | idem y `decisiones-nexus-design-system.md` §4 | ¿La tarea esencial se completa en móvil? |
| **P1** | Se adapta al rubro | `02-producto/PRODUCT.md` | — |
| **P2** | La operación diaria primero | idem | — |
| **P3** | Datos reales o nada: sin cifras inventadas, controles que no funcionan ni módulos que no existen | idem | — |
| **P4** | El mismo gesto para lo mismo | idem | — |
| **P5** | El dinero no se equivoca (sin duplicados, con recibo, anular deja rastro) | idem | — |
| **P6** | Español de Colombia, claro y corto; verbos concretos | idem | — |
| **P7** | Accesible y usable con una mano (WCAG 2.2 AA) | idem | — |
| **B1–B5** | Marca: directa · operativa · local · serena · honesta | `brand-book.md` §3 | — |
| **S1–S5** | Lo que la persona debe sentir: control · claridad · confianza · progreso · continuidad | `SYSTEM-DESIGN.md` §1 | Cada una tiene una «señal de falla» documentada |

**Marca inmutable:** nombre NEXUS, negro y oro, tipografías de marca. `packages/brand/` es la fuente de verdad. No existe un segundo sistema de tokens.

### 1.1 La regla del porqué

Ninguna decisión entra al sistema sin responder por escrito: (1) el **problema** observado, con medición o evidencia; (2) el **principio** que la sostiene; (3) la **alternativa descartada**; (4) **cómo se mide** que funcionó; (5) **qué se rompe si se retira**. Una decisión sin principio es una preferencia personal y no pasa.

## 2. Estados de una decisión

| Etiqueta | Significa | Quién la fijó |
|---|---|---|
| **A** · Aprobada | Decisión explícita tuya | Tú |
| **D** · Dirección aprobada | Parte del registro v3 que aprobaste como dirección de trabajo; el **detalle de implementación** necesita autorización específica | Tú (dirección) |
| **N** · Propuesta nueva | Surge de la auditoría de esta etapa; **no es una decisión** hasta que la apruebes | Este trabajo |
| **PD** · Pendiente | Requiere tu decisión; no hay recomendación cerrada | — |
| **H** · Hipótesis | Afirmación sin verificar; no se usa como base de una decisión | — |

Ninguna **N**, **PD** ni **H** se ha convertido en aprobada.

## 3. Registro de decisiones heredadas (blueprint v3)

Se conservan sin cambios (texto original en `historico/blueprint-v3-base.md`). Solo se añade el estado.

### 3.1 Fundamentos

| ID | Estado | Decisión | Porqué (principio) | Descartado | Medida |
|---|---|---|---|---|---|
| DR-01 | **A** | `packages/brand` sigue como única fuente de tokens | D2, P4: dos fuentes hacen divergir los módulos | Tokens paralelos | 0 colores o tamaños nuevos fuera del paquete |
| DR-02 | **A** | Añadir `text-2xs` (11) y `text-ui` (13); seis pasos; no migrar automáticamente los 736 usos | D1, D2: 13 px domina (308 usos) y no existe como paso; migrar a ciegas puede alterar importes (P5) | Escala de 4 pasos; migración masiva | Usos fuera de token bajan módulo a módulo; capturas sin diferencias en importes |
| DR-03 | **A** | Dos densidades: estándar (40 px) y compacta (34 px). Sin «cómoda» | D5, D6: nadie la echaría de menos hoy | Tres densidades | Se reabre solo con un caso real documentado |
| DR-04 | D | Cifras de dinero ≥ 16 px y nunca recortadas; metadatos ≥ 11 px | P5, D7: el dinero recortado fue el P1 más grave (#140) | Reducir fuente | 0 recortes a 320 px |
| DR-05 | D | Tokens documentales `--doc-*` para recibos y facturas | P5, B5: 114 colores arbitrarios concentrados en documentos | Hex locales | Colores arbitrarios en documentos → 0 |
| DR-06 | D | Campos editables a 16 px en móvil, sin tocar tokens globales | D8, D7: evitar zoom en Safari iOS | 16 px en todo | Prueba en iPhone/iPad reales |

### 3.2 Componentes y patrones

| ID | Estado | Decisión | Porqué | Descartado | Medida |
|---|---|---|---|---|---|
| DR-07 | **A** | `<Button>` como API preferida; `buttonVariants` interno; mismas variantes (tamaño por defecto pendiente: PD-01) | D2, P4: hoy dos formas de hacer lo mismo | Reescritura de golpe | Llamadas a `buttonVariants` sobre `<button>` bajan por área |
| DR-08 | D | Un patrón de tabla/lista adaptable: tabla en ancho, lista en estrecho; columnas con rol | D8, D1: 30 tablas manuales | Scroll horizontal | Tablas manuales en pilotos → 0 |
| DR-09 | D | Estados como contrato: cargando, vacío, error, sin permiso, sin conexión, guardando, guardado | S1, S3, D7: 0/38 páginas del negocio con `error.tsx` | Dejar el error a Next | Cobertura de estados por ruta |
| DR-10 | D | Un solo tratamiento de «sin permiso» | D3, P3 | Esconder o mostrar siempre | Revisión rol × pantalla |
| DR-11 | D | Componente nuevo solo con dos usos reales y su historia | D5, D2 | Crear de antemano | Componentes sin uso bajan |
| DR-12 | **A** | 19 componentes sin uso: conservar 5 / consolidar 10 / retirar 4 a Laboratorio; no se borra nada | S3: reversibilidad | Borrar | Catálogo sin huérfanos |

### 3.3 Navegación y shell

| ID | Estado | Decisión | Porqué | Descartado | Medida |
|---|---|---|---|---|---|
| DR-13 | **A** | Sidebar expandido desde 1024 px | D8, S2: hoy 1024–1199 trabaja con iconos sin nombre | Mantener 1200 | Capturas 1023/1024/1180 |
| DR-14 | **A** | 768–1023: riel compacto con etiquetas abreviadas visibles | S2: icono sin nombre es la señal de falla de claridad | Solo iconos con descripción al enfocar (no existe en táctil) | Etiqueta ≥ 11 px sin recorte |
| DR-15 | **A** | < 768: barra inferior + hoja «Más»; 44 px en todos los controles táctiles, también cabecera | D8, P7 | 44 px solo en primarias | 0 controles táctiles < 44 px |
| DR-16 | D | Navegación generada desde el registro de capacidades, única para todos los módulos | D2 | Menús por módulo | Ningún módulo define navegación propia |
| DR-17 | D | Navegación contextual con un solo componente de subnavegación | D2, D1 | Pestañas ad hoc | Una implementación (ver H-02) |
| DR-18 | **A** | Integraciones dentro de «Sistema» al inicio, con arquitectura que permita evolucionar a centro propio | S5, P3 | Primer nivel desde ya | Una ruta con estados reales |
| DR-19 | D | `Ctrl K` oculto con `pointer: coarse`; búsqueda móvil como hoja | D8, D5 | Mostrarlo siempre | Sin atajo visible en táctil |
| DR-20 | **A** | Viewports: 360 diseño · 375 regresión · 320 reflow · 412; tablet 820×1180 y 1180×820; 744 como punto de control | D8 | Solo 375 y 1280 | Pruebas en todos |

### 3.4 Búsqueda, actividad y lenguaje

| ID | Estado | Decisión | Porqué | Descartado | Medida |
|---|---|---|---|---|---|
| DR-21 | D | Búsqueda global en dos niveles: (1) ir a / funciones / acciones (existe); (2) registros con límite en servidor y permisos | S1, P4 | Buscadores por módulo | Tarea guiada «encuentra un cliente» ≤ 2 pasos (sin línea base) |
| DR-22 | D | Centro de actividad único: notificaciones + historial, tres niveles, estructura «qué pasó / qué significa / qué hacer» | S1, S3 | Contador sin detalle | Cada elemento enlaza a su registro |
| DR-23 | D | No diseñar editor de automatizaciones ni asistente de IA ahora | P3, D5: no hay disparadores | Maquetas de automatización | Se reabre cuando existan |
| DR-24 | **A** | No renombrar hasta aprobar el glosario completo | P6, S5 | Renombrar sin glosario | 0 renombrados antes de aprobar |
| DR-25 | **A** | Cobro ≠ Pago (cobro: dinero que un cliente debe pagar; pago: salida o liquidación de una obligación) | P5, S2 | Un solo concepto | Glosario + revisión de «Pagos» |
| DR-26 | D | Verbos de botón de lista cerrada; nunca «Aceptar/OK/Enviar» salvo informativos | P6 | Texto libre | Conteo base: ver `06` §5 |
| DR-27 | D | Estados con texto + icono + color; vocabulario único | D7 | Un color por módulo | axe + revisión de `Badge` |
| DR-28 | D | Cada capacidad lleva etiqueta disponible / prototipo / plan futuro | B5, P3 | Listar sin conexión real | 0 listadas que no existan. **Refinada por DR-33** |
| DR-29 | D | Pruebas con nombres largos, importes grandes y estados | D8, P5 | Datos cortos | Casos en historias |
| DR-30 | **A** | Declarar siempre que Chromium emulado ≠ dispositivo real | B5 | Dar R2/R4/R5 por cumplidos | Sección de limitaciones por informe |

## 4. Propuestas nuevas de esta etapa (N)

Surgen de la auditoría (`02`). **Son propuestas**; ninguna se aplica sin tu aprobación.

| ID | Propuesta | Porqué (problema → principio) | Descartado | Medida |
|---|---|---|---|---|
| **DR-31** | Adoptar la **puntuación de coherencia por módulo** (`02` §3) como instrumento de seguimiento: mide presencia de patrones, no sanciona | Hoy no hay forma de ver el avance módulo a módulo → D2 | Revisión manual | Se repite tras cada oleada |
| **DR-32** | Separar en el glosario los **tres nombres** de una capacidad (etiqueta corta, nombre en «Funciones», etiqueta de menú): hoy difieren (p. ej. `Dashboard`/`Inicio`; `Inventario`/`Catálogo e inventario`/`Catálogo`; `Pagos`) | Tres nombres sin regla desorientan → P6, S2 | Unificarlos sin revisar su uso | Cada capacidad con tres nombres documentados |
| **DR-33** | Usar el **estado ya declarado** de cada capacidad (`READY`/`BETA`/`PLANNED`) como fuente de las etiquetas «disponible / prototipo / plan futuro» | Ya existe: 16 READY, 4 BETA, 2 PLANNED. No se inventa un segundo sistema → P3, D2 | Etiquetas nuevas independientes | La etiqueta visible = el estado del registro |
| **DR-34** | El texto de **«sin permiso»** se compone desde la matriz de permisos (qué rol puede), no se escribe a mano | 13 páginas muestran un aviso propio (se leyó el texto de 4: «Solo el dueño o administración…», «Tu rol no maneja…»); si cambia la matriz, el texto miente → P3, P5 | Texto libre por pantalla | Una sola plantilla; 0 textos de rol escritos a mano |
| **DR-35** | **Describir con honestidad** lo que hace WhatsApp hoy (abre la conversación con el texto listo; la API entrante «sigue en el roadmap») | La etiqueta «WhatsApp» sugiere una integración que no es → B5, P3 | Cambiar el estado sin autorización | Descripción visible alineada con el comportamiento |
| **DR-36** | Una capacidad `PLANNED` nunca se presenta como operativa; su página (hoy `orders` usa `ModulePlaceholder`) debe decir que es plan | P3 | Placeholder genérico | Revisión de dónde aparece (ver H-03) |
| **DR-37** | Documentar los roles de `KpiCard` (indicador con comparación) y `StatTile` (recuento); no fusionarlos todavía | Dos componentes de cifra; ambos corregidos en #143 → D2 sin abstracción prematura (DR-11) | Fusionar ya | Ficha de cada uno |
| **DR-38** | Definir **jerarquía del Inicio**: qué va sobre el pliegue y por qué (ver `05`) | D1: el dashboard no debe ser 15 tarjetas sin decisión | Más widgets | Cada bloque justifica la decisión que permite |
| **DR-39** | Los gráficos comunican con color **y** texto/valor, con alternativa en tabla | D7: el color no puede ser único medio | Solo color | Revisión con axe y lectura de tabla |
| **DR-40** | Añadir **severidad** (informa / requiere acción / urgente) a las notificaciones existentes, sin cambiar su origen | Hoy solo clasifican por módulo (`payment`, `expense`, `booking`, `membership`) → S1 | Reescribir el sistema | Cada notificación con nivel |
| **DR-41** | Unificar **campana** y **actividad reciente** del Inicio bajo el mismo vocabulario y estructura (derivado de DR-22) | Hoy son dos superficies con modelos distintos → D2, S5 | Mantener separados sin criterio | Mismo componente de elemento |
| **DR-42** | Revisar los **14** usos de `outline-none` sin `focus-visible` en la misma línea (heurística) | D7: foco siempre visible | Dejar | Conteo = 0 tras revisión manual (puede haber falsos positivos) |
| **DR-43** | Auditar los **205** usos del atributo `title`; ninguno puede ser la única ayuda | Regla vigente de `CLAUDE.md`; `title` no llega con teclado ni táctil → D7 | Ignorar | Cada uso con nombre accesible propio |
| **DR-44** | Patrón de formulario único: etiqueta visible, ayuda, validación comprensible y resumen de errores; el `placeholder` nunca sustituye la etiqueta | P6, D7. 174 `placeholder` frente a 173 etiquetas: se revisa uno a uno | Validar por módulo | Auditoría de campos sin etiqueta |
| **DR-45** | Aplicar el sistema a los módulos **en oleadas**, según su puntuación (`12`) | Riesgo y valor distintos por módulo → S3 | Todos a la vez | Puntuación sube por oleada |
| **DR-46** | **Misma plantilla, contenido y acciones por permiso**; no hay pantallas distintas por rol (`09`) | D2, P4, D3: pantallas por rol multiplican el mantenimiento y rompen la coherencia | Una versión de cada pantalla por rol | Revisión rol × pantalla |
| **DR-47** | **Ficha única «Conexión»** para toda herramienta externa, con el estado del modelo existente (`DISCONNECTED`/`CONNECTED`/`ERROR`, entorno, última verificación, último error) (`10`) | S5, D2: hoy cada integración muestra su estado a su manera → P3: solo lo que existe | Una pantalla por herramienta sin patrón común | Un solo componente de ficha con historia por estado |

## 5. Decisiones pendientes (PD)

| ID | Qué hay que decidir | Contexto | Documento |
|---|---|---|---|
| PD-01 | Tamaño por defecto del botón (`sm` o `default`) | Decisión 2b del DS; comparación visual lista, falta evidencia táctil | `11` §3 |
| PD-02 | Consolidación de `Input` (contratos de `MoneyInput`, `UsdInput`, `SearchField`, `SearchInput`) | Decisión 2c; no son fusiones directas | `11` §3 |
| PD-03 | **Aprobado (2026-11-01)** · Glosario oficial (términos, estados, verbos) | Aplicado solo en lo ya revisado; ver `14` §2 | `06` |
| PD-04 | Nombres definitivos de las capacidades (DR-32) | Depende de PD-03 | `06` §3 |
| PD-05 | Redacción oficial de mensajes de acceso (DR-34) | Plantilla propuesta | `09` §4 |
| PD-06 | Alcance del Centro de actividad (solo eventos que existen) | DR-22 / DR-41 | `04` §6 |
| PD-07 | Destino de los 4 componentes a retirar a Laboratorio | DR-12 define la clasificación; falta confirmar los 4 | `11` §6 |
| PD-08 | Dónde y cuándo se publica la documentación consolidada (`main`) | Pediste revisarla y aprobarla antes | `README` |
| PD-09 | Orden de las oleadas de migración por módulo | Propuesta en `12` | `12` |
| PD-10 | Qué hacer con la pila de PR #141–#143 (no tocada) | No se fusiona sin tu orden | `12` |
| PD-11 | ¿El menú se filtra por rol? Exige asociar un permiso a cada ítem del registro | Hoy `buildTenantNav` no recibe rol; D3 pide «sin menús que no usa» | `09` §5 |
| PD-12 | Textos oficiales de las descripciones por herramienta (WhatsApp, Wompi, factura electrónica, Google) | Propuestas en `10` §3.4; ninguna se aplica sin aprobar | `10` §3.4 |

## 6. Hipótesis sin verificar (H)

| ID | Hipótesis | Cómo se verifica |
|---|---|---|
| H-01 | La mayoría de usuarios opera desde móvil | Analítica de uso (no consultada) |
| H-02 | Existen `TabNav`, `SectionNav` y `UrlSegmentedControl`, pero no todos los módulos los usan (Finanzas usa `?tab=`) | Inventario de uso de esos tres componentes frente a `?tab=` en `app/` |
| H-03 | Las capacidades `PLANNED` (Pedidos, Cotizaciones) se muestran con indicación de «Pronto» | Recorrer «Funciones» y la navegación con un negocio real |
| H-04 | El flujo de importación tiene vista previa y errores por fila (hay `catalog/import/mapping-editor`) | Recorrerlo en `localhost:3001` |
| H-05 | El dueño puede ver quién hizo qué (auditoría de negocio) | Buscar la superficie; existe `logTenantAction` y panel en admin |
| H-06 | Un campo de 14–15 px provoca zoom en Safari iOS | Prueba en iPhone/iPad reales |
| H-07 | 7 de 12 usos de texto con opacidad incumplen o rozan AA (cifra de `decisiones…` §1.7) | Medición con capturas renderizadas |
| H-08 | Un iPad mini (744 px) recibe el diseño de teléfono | Medido en Chromium emulado; confirmar en dispositivo |
| H-09 | Qué funciona sin conexión | Prueba de PWA (existe `NetworkBanner`) |
| H-10 | Los gráficos cumplen contraste y tienen alternativa textual | Revisión con axe y lectores |
| H-11 | El tiempo hasta el primer valor es largo | Medirlo con usuarios; no hay línea base |
| H-12 | Un solo componente de elemento sirve a campana y actividad | Comparar `NotificationCenter` y `RecentActivity` |
| H-13 | Los 205 `title` incluyen casos que son la única ayuda | Auditoría manual |
| H-14 | La capacidad `dashboard` aparece bajo «Clientes y agenda» en «Funciones» pero en «General» en el menú | Recorrer «Funciones» |
| H-15 | El Inicio muestra indicadores de dinero a un rol «sin dinero» (Asesor): `page.tsx` no llama a `can()` | Abrir el Inicio con un integrante Asesor |
| H-16 | El plegado de grupos del menú se recuerda por persona | Revisar `app-sidebar.tsx` y su almacenamiento |
| H-17 | `api-keys-panel` figura entre los componentes sin uso aunque la API tiene llaves | Comprobar la pantalla de Configuración |

## 7. Cómo se mantiene este registro

- Una decisión nueva se añade con su ID siguiente y entra como **N**.
- Pasa a **A** solo con tu aprobación explícita, anotando la fecha.
- Una hipótesis se cierra con evidencia: pasa a hecho (con su fuente) o se descarta.
- Ningún documento redefine un ID; si cambia el sentido, se crea un ID nuevo y el anterior queda marcado como reemplazado.
