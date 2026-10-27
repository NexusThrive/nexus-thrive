# Contribuir

NEXUS es un monorepo de Next.js. El repositorio oficial está en GitLab;
GitHub es una copia de solo lectura que se actualiza sola con cada push.
**Todo se propone y se fusiona en GitLab.**

- Flujo entre los dos remotos: [docs/flujo-gitlab-github.md](docs/flujo-gitlab-github.md)
- Guías de trabajo: [docs/guias/README.md](docs/guias/README.md)
- Ramas, CI, SQL de producción y despliegue: [docs/guias/devops.md](docs/guias/devops.md)
- Cómo agregar una funcionalidad: [docs/guias/nueva-funcionalidad.md](docs/guias/nueva-funcionalidad.md)

---

## 1. Dónde se trabaja

| Remoto | Uso |
|---|---|
| `origin` (GitLab, `100.116.222.50:8929`) | fetch y push |
| `github` | solo lectura; el push está bloqueado |

Los merge requests se abren en GitLab. En GitHub no se empuja, no se fusiona y
no se edita: el siguiente sync sobrescribe `main` con lo que haya en GitLab.

## 2. Ramas y commits

- `main` es la única rama que se despliega y solo recibe merges.
- Una rama por cambio, con prefijo: `fix/<qué>`, `feature/<qué>`,
  `hotfix/<qué>`, `refactor/<qué>`, `docs/<qué>`.
- Un MR hace **una** cosa. Si mientras arreglas ves otra, va en otro MR.
- Commits en español, imperativo y con alcance:
  `fix(caja): no cobra dos veces una factura`.

## 3. Antes de abrir el MR

```bash
pnpm exec tsc --noEmit     # tipos
pnpm lint                  # eslint + reglas de arquitectura
pnpm test                  # unitarias
pnpm test:integration      # requiere Postgres local (TEST_DATABASE_URL)
```

`pnpm verify` encadena tipos, unitarias, integración y build; es lo que corre el
CI. Si cambias el contrato de datos (`prisma/contract.prisma`), revisa
[devops.md §4](docs/guias/devops.md#sql-de-producción): el SQL de producción se
corre **antes** del merge.

## 4. Abrir el merge request

```bash
git switch -c fix/mi-cambio
git add -A
git commit -m "fix(scope): describe el cambio"
git push -u origin fix/mi-cambio
```

El push imprime el enlace para crear el MR. Se abre contra `main` y se describe
qué cambia y cómo se comprobó. Se fusiona en GitLab, marcando *Delete source
branch*.

## 5. Después del merge

```bash
git switch main && git pull
git branch -d fix/mi-cambio
```

GitHub recibe el merge en segundos. No hay que hacer nada más.

## 6. Reglas que no se negocian

| Regla | Motivo |
|---|---|
| Nada de push directo a `main` | Entra por MR |
| Nada de `--force` en ramas compartidas ni `--no-verify` | Reescribe historia y salta las comprobaciones |
| Un MR, una cosa | Revisión y reversión simples |
| Los secretos no entran al repo: `.env` local, valores reales solo en Vercel | El historial no se borra de verdad |
| Si un secreto llega a Git: rotarlo primero, limpiar después | Limpiar sin rotar no sirve |
| Los tags se crean en GitLab y viajan solos al espejo | Ver [VERSIONADO.md](docs/VERSIONADO.md) |
