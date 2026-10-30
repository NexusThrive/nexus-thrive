# Contribuir

NEXUS es un monorepo de Next.js. El repositorio está en GitHub y **todo se
propone y se fusiona allí** mediante pull requests.

- Guías de trabajo: [docs/guias/README.md](docs/guias/README.md)
- Ramas, CI, SQL de producción y despliegue: [docs/guias/devops.md](docs/guias/devops.md)
- Cómo agregar una funcionalidad: [docs/guias/nueva-funcionalidad.md](docs/guias/nueva-funcionalidad.md)

---

## 1. Dónde se trabaja

Un único remoto, `origin`, apunta a GitHub. Los pull requests se abren y se
fusionan allí; no hay espejo ni segundo remoto.

## 2. Ramas y commits

- `main` es la única rama que se despliega y solo recibe merges.
- Una rama por cambio, con prefijo: `fix/<qué>`, `feature/<qué>`,
  `hotfix/<qué>`, `refactor/<qué>`, `docs/<qué>`.
- Un PR hace **una** cosa. Si mientras arreglas ves otra, va en otro PR.
- Commits en español, imperativo y con alcance:
  `fix(caja): no cobra dos veces una factura`.

## 3. Antes de abrir el PR

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

## 4. Abrir el pull request

```bash
git switch -c fix/mi-cambio
git add -A
git commit -m "fix(scope): describe el cambio"
git push -u origin fix/mi-cambio
```

Con `gh pr create` (o el enlace que imprime el push) se abre el PR contra
`main` y se describe qué cambia y cómo se comprobó. Se fusiona en GitHub,
borrando la rama al terminar.

## 5. Después del merge

```bash
git switch main && git pull
git branch -d fix/mi-cambio
```


## 6. Reglas que no se negocian

| Regla | Motivo |
|---|---|
| Nada de push directo a `main` | Entra por PR |
| Nada de `--force` en ramas compartidas ni `--no-verify` | Reescribe historia y salta las comprobaciones |
| Un PR, una cosa | Revisión y reversión simples |
| Los secretos no entran al repo: `.env` local, valores reales solo en Vercel | El historial no se borra de verdad |
| Si un secreto llega a Git: rotarlo primero, limpiar después | Limpiar sin rotar no sirve |
| Los tags se crean en GitHub | Ver [VERSIONADO.md](docs/VERSIONADO.md) |
