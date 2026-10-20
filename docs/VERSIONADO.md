# Versionado y entregas

Cómo se saca una versión de NEXUS THRIVE a partir de la V1. La idea es que
cada cambio salga **medido, verificable y reversible**.

---

## 1. El mapa de una entrega

```
main ──► Vercel (autodespliega)  ──► app.nexusthrive.com.co
  │
  └──► tag v1.0.1 / v1.1.0  ──► marca la versión (se puede volver a ella)
```

Reglas del repo:

- `main` es la **única rama que se despliega**. Vercel la toma sola.
- Un cambio llega a `main` por **PR**, y el CI tiene que estar en verde.
- Los **tags** marcan las versiones: `v1.0.0` es la V1, `v1.0.1` el primer
  parche, `v1.1.0` la primera funcionalidad nueva.
- El **SQL de producción** no lo corre Vercel: lo corres tú en Supabase.

---

## 2. Qué versión sale

| Tipo de cambio | Versión | Ejemplos |
|---|---|---|
| Error, texto, seguridad, rendimiento | **PATCH** `v1.0.1` | El QR no cargaba, un cálculo mal, un 500 en un caso raro |
| Funcionalidad nueva que no rompe nada | **MINOR** `v1.1.0` | Un módulo nuevo, un flujo nuevo en el onboarding |
| Rompe algo de lo existente | **MAJOR** `v2.0.0` | Cambiar cómo funciona el acceso, cambiar el modelo de datos |

Regla práctica: si alguien que usa la app de hoy **no se entera** de que
cambió algo, es un PATCH. Si ve algo nuevo, es MINOR.

---

## 3. Flujo de un bug (lo más común)

1. **Reproducir** y escribir el caso exacto (URL, pasos, qué se ve).
2. **Rama**: `git checkout -b fix/<qué-arregla>` desde `main` actualizado.
3. **Primero el test**: escribe una prueba que falle con el bug. Si no se
   puede probar (bug visual o de configuración), anota en el commit qué se
   estaba viendo y cómo se comprueba.
4. **Arreglar** lo mínimo. Nada de refactors de paso.
5. **Verificar**: `pnpm verify` (tipos, lint, pruebas y build).
6. **Commit** y **PR a `main`**. El CI corre lo mismo.
7. Al mergear: Vercel despliega. **Verifica en producción** (no asumas).
8. **Tag** y entrada en el CHANGELOG:

```bash
git tag -a v1.0.1 -m "fix(ventas): no deja registrar una venta sin fecha"
git push origin v1.0.1
```

Commits: `fix(scope): qué arregla` — en español, en imperativo, con el motivo
en el cuerpo cuando no sea obvio.

---

## 4. Flujo de una funcionalidad

1. `git checkout -b feature/<qué-agrega>` desde `main`.
2. Desarrolla con los commits atómicos: `feat(scope): ...`.
3. Si toca el **modelo de datos**, en este orden (si no, el despliegue falla):

   ```bash
   # 1) edita prisma/contract.prisma
   pnpm prisma contract emit
   # 2) planifica la migración
   pnpm prisma migration plan --name <nombre>
   # 3) aplícala en la base de desarrollo
   pnpm prisma db migrate --db "$DATABASE_URL"
   # 4) escribe el SQL de producción en docs/prod-sql/ (aditivo e idempotente)
   # 5) anótalo en docs/prod-sql/00-ORDEN.md
   ```

4. **PR a `main`** → CI verde → Vercel despliega.
5. **Antes de que alguien use la función en producción**: correr el SQL nuevo
   en Supabase (SQL Editor). Si la app nueva lee columnas nuevas, el SQL va
   **primero**, o la app se cae.
6. Tag `v1.1.0` + CHANGELOG.

---

## 5. Cuando producción está rota (urgente)

1. `git checkout main && git pull` — reproduce el problema en local.
2. Rama `hotfix/<qué>`.
3. Arreglo + prueba.
4. `pnpm verify` → merge a `main` (si es urgente, se mergea directo y se
   documenta después).
5. Vercel despliega. Verifica.
6. Tag `v1.0.2` y anota en el CHANGELOG.

---

## 6. Antes de dar por buena cualquier versión

```bash
pnpm verify
```

Que corre: tipos (`tsc`), lint, pruebas unitarias, pruebas de integración
(requieren `TEST_DATABASE_URL`) y build. El CI hace lo mismo.

Y en **producción**, antes de decir que está:

| Qué | Cómo se comprueba |
|---|---|
| El login abre | `https://app.nexusthrive.com.co/sign-in` → se ve el formulario |
| Un acceso funciona | `/c/{código}` → se ve la tarjeta del beneficio |
| El panel abre | `/admin` → la lista de negocios |
| Los enlaces sirven el dominio real | `/admin/accesos` → el enlace del QR dice `app.nexusthrive.com.co` |

---

## 7. La lista de la versión (checklist)

```markdown
## [v1.0.1] — 2026-10-21

### Corregido
- El QR fijo no cargaba para los negocios con el código en pausa.

### Cambios
- ...
```

Y en el CHANGELOG, arriba del todo, con el enlace de comparación.

---

## 8. Reglas que no se negocian

- **No se commitea ni se sube nada sin que lo pidas** (está en `AGENTS.md`).
- **Ningún cambio de esquema sin su SQL de producción.** La app y la base
  van a la par: si el SQL falta, la versión está rota.
- **Cada bug que se arregla lleva una prueba** (o una nota de cómo se
  comprueba).
- **Los SQL son aditivos e idempotentes**: se pueden correr dos veces.
- **Lo que no bloquea el piloto se anota, no se frena**: Wompi, Meta, Resend
  y Google Places están pendientes a propósito; siguen en
  `docs/V1-PROGRESO.md`.

### Estas reglas se cumplen solas

| Regla | Dónde se aplica |
|---|---|
| El cambio de modelo trae su SQL de producción | `scripts/check-prod-sql.sh`, invocado por `pnpm test:integration` (lo corre el CI) y por `pnpm release` |
| La versión está anotada en el changelog | `pnpm release` lo comprueba antes de crear el tag |
| Todo verde antes de publicar | `pnpm release` corre tipos, lint, pruebas, integración y build |
| `main` es la única rama que se despliega | `pnpm release` publica solo desde `main`, sincronizada con `origin/main` |

> El paso del CI que compara contra la base del PR necesita el historial
> completo del clon. Si quieres que el CI bloquee el PR (y no solo la
> publicación), añade esto a `.github/workflows/ci.yml`:
>
> ```yaml
>       - uses: actions/checkout@v4
>         with:
>           fetch-depth: 0
>
>       - name: SQL de producción si cambió el modelo
>         if: github.event_name == 'pull_request'
>         run: bash ./scripts/check-prod-sql.sh "origin/${{ github.base_ref }}"
> ```
>
> (El token con el que se hace el push desde el equipo no tiene el permiso
> `workflow`, por eso este paso se deja a mano.)
