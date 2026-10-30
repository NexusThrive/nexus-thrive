# NexusRestaurant — ingeniería inversa ordenada de Colega Menus

Investigación del producto **Colega Menus** (`menus.colegastudio.com`, v1.167.0
en el momento del escaneo, 2026-10-30) para decidir cómo cubrir el rubro
restaurante en Nexus. Se hizo con una **cuenta propia** del equipo, en modo de
solo lectura y sin copiar su código ni sus activos. Es una referencia funcional,
no una especificación para clonarlo.

## Índice

| Documento | Qué responde |
|---|---|
| [00-alcance-y-metodo.md](00-alcance-y-metodo.md) | Qué se hizo, qué no, límites y cómo repetirlo |
| [01-arquitectura-observada.md](01-arquitectura-observada.md) | Stack, dominios, autenticación, forma de las llamadas |
| [02-mapa-del-panel.md](02-mapa-del-panel.md) | Sidebar, topbar, menús, búsqueda global y las 40+ pantallas |
| [03-onboarding.md](03-onboarding.md) | Registro, asistente de 4 pasos, guía «Primeros pasos» de 7 pasos |
| [04-modulos.md](04-modulos.md) | Cómo funciona cada módulo: menú, caja, comandera, mesas, inventario… |
| [05-roles-planes-permisos.md](05-roles-planes-permisos.md) | Roles, matriz de permisos, planes y precios |
| [06-modelo-de-datos-inferido.md](06-modelo-de-datos-inferido.md) | Entidades y reglas que el producto deja ver |
| [07-integracion-nexus.md](07-integracion-nexus.md) | Cómo encaja en Nexus, hueco por hueco, y en qué orden |

## Material de apoyo

- `capturas/` — pantallas en escritorio (1280 px) y móvil (375 px), menús
  desplegables y páginas públicas. Son interfaz de un tercero, con los datos de
  ejemplo de la cuenta del equipo; se incluyen como **evidencia de consulta
  interna**, no para reutilizarlas. Se excluyeron las que mostraban datos
  personales (perfil y horarios con nombres).
- `datos/` — navegación, menús y catálogo de pantallas en JSON, con la forma de
  las llamadas de red (solo claves, nunca valores).
- `herramientas/` — los dos scripts de Playwright, para repetir el recorrido.
  La sesión llega por la variable de entorno `SESSION_COOKIE`; **nunca** se
  escribe en el repositorio.

## Cómo leer las etiquetas de evidencia

| Etiqueta | Significa |
|---|---|
| **Observado** | Visto directamente en el panel, en cabeceras o en la red |
| **Soporte** | Lo dice la documentación pública de Colega (`/soporte`) |
| **Inferido** | Deducción razonable; no se comprobó y puede estar mal |

## Conclusión corta

1. Colega Menus es un **monolito Next.js** con un solo panel (`/app`), una
   caja web (`/pos`) y un menú público (`menudigital…/<slug>`). No expone API
   REST: la interfaz habla con el servidor por *Server Actions*.
2. Lo que lo hace útil como referencia **no es su tecnología** sino su modelo de
   operación: pedido con estados, caja por turno, mesa con cuenta única,
   inventario por movimientos (kárdex) y permisos por rol.
3. Nexus ya tiene POS, inventario, compras, finanzas, tienda y reservas. Lo que
   falta para restaurante son **mesas, comandas, recetas y el pedido de mesa**
   (`RST-3` a `RST-7` en `.docs/arquitectura-v2/D-checklist-restaurante.md`).
   El documento 07 propone cómo cubrirlo sin crear una plataforma paralela.
4. **No se integra por su API privada.** Se integra por los puertos y
   adaptadores de Nexus, con operaciones declaradas una vez (API, MCP,
   webhooks), y `money-service` como único camino del dinero.
