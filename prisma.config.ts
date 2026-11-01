import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  orm: ormConfig({
    // El contrato se divide por dominio en prisma/schema/ (docs/architecture/).
    // `output` mantiene contract.json y contract.d.ts en prisma/.
    contract: "prisma/schema/**/*.prisma",
    output: "prisma",
    db: {
      connection: process.env["DATABASE_URL"]!,
    },
  }),
  // Skills de Prisma solo para Claude Code (.claude/skills) y los agentes que
  // leen .agents/skills (Codex, OpenCode). Sin esto, `skills sync` también
  // escribe copias idénticas en .cursor/ y .devin/.
  skills: {
    agents: ["claude", "agents"],
  },
});
