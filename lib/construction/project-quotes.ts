/**
 * Cotizaciones de obra: versiones emitidas desde el presupuesto, decisión del
 * cliente y seguimientos comerciales (la "carpeta" de cada obra).
 *
 * Reglas:
 * - Se calcula en un solo lugar (el presupuesto). Emitir una cotización
 *   congela una revisión del presupuesto en `Quote.snapshot`; la versión
 *   anterior queda `SUPERSEDED`. La obra pasa de Borrador a En cotización.
 * - Aprobar una versión, en UNA transacción: la obra pasa a Contratada, se
 *   crea la línea base de la revisión cotizada y se bloquea el presupuesto.
 *   Si el presupuesto cambió después de emitir esa versión, no se aprueba
 *   (habría que emitir una nueva): lo aprobado es exactamente lo cotizado.
 */
import { db } from "@/prisma/db";
import {
  apuItemCategoryToResourceType,
  calculateItemTotal,
  decimalToMicro,
  resourceLineCostMicro,
  type ApuSnapshot,
} from "@/lib/construction/apu-engine";
import {
  bumpRevision,
  insertBaseline,
  loadBudgetTree,
  lockRevision,
  recalcBudgetTotals,
  serializeProjectHeader,
} from "./shared";
import {
  buildQuoteDocument,
  microFractionToPercent,
  microToDecimal,
  type QuoteDocument,
} from "./quote-document";

/** Estados de obra en los que todavía se cotiza. */
const QUOTABLE_STATUSES = new Set(["DRAFT", "BIDDING"]);

export type ProjectQuoteRow = {
  id: string;
  code: string;
  version: number;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "SUPERSEDED";
  budgetRevision: number;
  grandTotal: string;
  showApuDetail: boolean;
  sentAt: string | null;
  validUntil: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  decisionNote: string | null;
};

export type FollowUpTypeValue = "NOTE" | "CALL" | "EMAIL" | "MEETING" | "VISIT";

export type ProjectFollowUpRow = {
  id: string;
  type: FollowUpTypeValue;
  note: string;
  quoteId: string | null;
  quoteVersion: number | null;
  scheduledFor: string | null;
  completedAt: string | null;
  authorName: string;
  createdAt: string;
};

export type QuoteFolderRow = {
  projectId: string;
  projectCode: string;
  projectName: string;
  projectStatus: string;
  customerName: string;
  quoteCount: number;
  latest: { id: string; version: number; status: ProjectQuoteRow["status"]; grandTotal: string; sentAt: string | null } | null;
  pendingFollowUps: number;
  nextFollowUp: string | null;
  updatedAt: string;
};

function iso(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function dayToInstant(isoDay: string): Temporal.Instant {
  const [y, m, d] = isoDay.split("-").map(Number);
  // Fin del día en Bogotá (UTC−5): la cotización vale todo ese día.
  return Temporal.Instant.fromEpochMilliseconds(Date.UTC(y, m - 1, d, 28, 59, 59));
}

function now(): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(Date.now());
}

export function createProjectQuotesDb(tenantId: string) {
  const toRow = (quote: {
    id: string;
    code: string;
    version: number | null;
    status: string;
    budgetRevision: number | null;
    snapshot: unknown;
    totalAmount: unknown;
    showApuDetail: boolean;
    sentAt: unknown;
    validUntil: unknown;
    decidedAt: unknown;
    decidedByName: string | null;
    decisionNote: string | null;
  }): ProjectQuoteRow => ({
    id: quote.id,
    code: quote.code,
    version: quote.version ?? 0,
    status: quote.status as ProjectQuoteRow["status"],
    budgetRevision: quote.budgetRevision ?? 0,
    grandTotal: (quote.snapshot as QuoteDocument | null)?.totals.grand ?? "0",
    showApuDetail: quote.showApuDetail,
    sentAt: iso(quote.sentAt),
    validUntil: iso(quote.validUntil),
    decidedAt: iso(quote.decidedAt),
    decidedByName: quote.decidedByName,
    decisionNote: quote.decisionNote,
  });

  return {
    /** Versiones emitidas de la obra, de la más reciente a la más antigua. */
    list: async (projectId: string): Promise<ProjectQuoteRow[]> => {
      const quotes = await db.orm.public.Quote.where({ tenantId, projectId })
        .orderBy((quote) => quote.version.desc())
        .all();
      return quotes.map(toRow);
    },

    /** Documento congelado de una versión (para verla o imprimirla). */
    getDocument: async (
      quoteId: string,
    ): Promise<{ quote: ProjectQuoteRow; projectId: string; document: QuoteDocument } | null> => {
      const quote = await db.orm.public.Quote.where({ id: quoteId, tenantId }).first();
      if (!quote || !quote.projectId || !quote.snapshot) return null;
      return { quote: toRow(quote), projectId: quote.projectId, document: quote.snapshot as unknown as QuoteDocument };
    },

    /**
     * Emite una nueva versión desde el presupuesto actual de la obra.
     * Errores: NOT_FOUND, PROJECT_NOT_QUOTABLE, EMPTY_BUDGET, STALE_REVISION.
     */
    emit: async (
      projectId: string,
      input: { validUntil: string | null; showApuDetail: boolean },
      expectedRevision?: number,
    ): Promise<{ id: string; version: number }> => {
      const project = await db.orm.public.Project.where({ id: projectId, tenantId }).first();
      if (!project) throw new Error("NOT_FOUND");
      if (!QUOTABLE_STATUSES.has(project.status)) throw new Error("PROJECT_NOT_QUOTABLE");
      const budget = await db.orm.public.ProjectBudget.where({ projectId, tenantId }).first();
      if (!budget) throw new Error("EMPTY_BUDGET");
      if (expectedRevision !== undefined && budget.revision !== expectedRevision) {
        throw new Error("STALE_REVISION");
      }
      const tree = await loadBudgetTree(budget);
      const itemCount = tree.chapters.reduce((n, chapter) => n + chapter.items.length, 0);
      if (itemCount === 0 || BigInt(tree.grandTotal) <= BigInt(0)) throw new Error("EMPTY_BUDGET");

      const [customer, header, tenant] = await Promise.all([
        db.orm.public.Customer.where({ id: project.customerId, tenantId }).select("name").first(),
        db.orm.public.ProjectHeader.where({ projectId }).first(),
        db.orm.public.Tenant.where({ id: tenantId })
          .select("name", "legalName", "taxId", "address", "city")
          .first(),
      ]);

      return db.transaction(async (tx) => {
        // Foto consistente: si el presupuesto cambió desde que se leyó, falla.
        await lockRevision(tx, budget);
        const last = await tx.orm.public.Quote.where({ tenantId, projectId })
          .orderBy((quote) => quote.version.desc())
          .select("version")
          .first();
        const version = (last?.version ?? 0) + 1;
        const code = `${budget.code}-V${version}`;
        const issuedAt = now();
        const document = buildQuoteDocument({
          version,
          code,
          issuedAt: String(issuedAt),
          validUntil: input.validUntil,
          showApuDetail: input.showApuDetail,
          project: { code: project.code, name: project.name },
          header: header ? serializeProjectHeader(header) : null,
          customerName: customer?.name ?? "",
          issuer: {
            name: tenant?.legalName?.trim() || tenant?.name || null,
            taxId: tenant?.taxId ?? null,
            address: tenant?.address ?? null,
            city: tenant?.city ?? null,
          },
          budget: tree,
        });

        await tx.orm.public.Quote.where({ tenantId, projectId })
          .where((quote) => quote.status.in(["DRAFT", "SENT"]))
          .updateAndCount({ status: "SUPERSEDED" });

        const created = await tx.orm.public.Quote.select("id").create({
          tenantId,
          projectId,
          customerId: project.customerId,
          title: project.name,
          code,
          status: "SENT",
          version,
          budgetRevision: budget.revision,
          snapshot: document as never,
          showApuDetail: input.showApuDetail,
          adminPercent: microFractionToPercent(String(budget.aiuAdminPct)),
          imprevPercent: microFractionToPercent(String(budget.aiuImprevPct)),
          utilPercent: microFractionToPercent(String(budget.aiuUtilidadPct)),
          taxPercent: microFractionToPercent(String(budget.ivaUtilidadPct)),
          directCost: microToDecimal(String(budget.directCostTotal)),
          totalAmount: microToDecimal(String(budget.grandTotal)),
          validUntil: input.validUntil ? dayToInstant(input.validUntil) : null,
          sentAt: issuedAt,
        });

        if (project.status === "DRAFT") {
          await tx.orm.public.Project.where({ id: projectId, tenantId, status: "DRAFT" }).updateAndCount({
            status: "BIDDING",
          });
        }
        return { id: created.id, version };
      });
    },

    /**
     * Registra la decisión del cliente sobre una versión enviada.
     * Errores: NOT_FOUND, NOT_PENDING, BUDGET_CHANGED, PROJECT_NOT_QUOTABLE.
     */
    decide: async (
      quoteId: string,
      input: { decision: "APPROVE" | "REJECT"; note?: string; userId: string; userName: string },
    ): Promise<{ status: "APPROVED" | "REJECTED"; baselineVersion?: number }> => {
      const quote = await db.orm.public.Quote.where({ id: quoteId, tenantId }).first();
      if (!quote || !quote.projectId) throw new Error("NOT_FOUND");
      if (quote.status !== "SENT") throw new Error("NOT_PENDING");
      const projectId = quote.projectId;
      const decidedAt = now();
      const note = input.note?.trim() || null;

      if (input.decision === "REJECT") {
        await db.orm.public.Quote.where({ id: quoteId, tenantId, status: "SENT" }).updateAndCount({
          status: "REJECTED",
          decidedAt,
          decidedByName: input.userName,
          decisionNote: note,
        });
        return { status: "REJECTED" };
      }

      const project = await db.orm.public.Project.where({ id: projectId, tenantId }).first();
      if (!project || !QUOTABLE_STATUSES.has(project.status)) throw new Error("PROJECT_NOT_QUOTABLE");
      const budget = await db.orm.public.ProjectBudget.where({ projectId, tenantId }).first();
      if (!budget || budget.revision !== quote.budgetRevision) throw new Error("BUDGET_CHANGED");

      return db.transaction(async (tx) => {
        await lockRevision(tx, budget);
        const baseline = await insertBaseline(tx, tenantId, budget, {
          userId: input.userId,
          userName: input.userName,
          note: `Cotización ${quote.code} aprobada por el cliente${note ? `: ${note}` : ""}`,
          budgetRevision: quote.budgetRevision ?? budget.revision,
        });
        if (!budget.isLocked) {
          await bumpRevision(tx, budget, { isLocked: true });
          await tx.orm.public.BudgetLockEvent.create({
            tenantId,
            budgetId: budget.id,
            action: "LOCK",
            reason: `Contratada: cotización ${quote.code} aprobada`,
            userId: input.userId,
          });
        }
        const updated = await tx.orm.public.Quote.where({ id: quoteId, tenantId, status: "SENT" }).updateAndCount({
          status: "APPROVED",
          decidedAt,
          decidedByName: input.userName,
          decisionNote: note,
        });
        if (updated !== 1) throw new Error("NOT_PENDING");
        await tx.orm.public.Quote.where({ tenantId, projectId })
          .where((q) => q.id.neq(quoteId))
          .where((q) => q.status.in(["DRAFT", "SENT"]))
          .updateAndCount({ status: "SUPERSEDED" });
        const moved = await tx.orm.public.Project.where({ id: projectId, tenantId, status: project.status })
          .updateAndCount({ status: "APPROVED" });
        if (moved !== 1) throw new Error("PROJECT_NOT_QUOTABLE");
        return { status: "APPROVED" as const, baselineVersion: baseline.version };
      });
    },

    /** Carpetas: una por obra, con su última versión y seguimientos pendientes. */
    listFolders: async (input: { q?: string; status?: string } = {}): Promise<QuoteFolderRow[]> => {
      let projects = db.orm.public.Project.where({ tenantId });
      const text = (input.q ?? "").trim();
      if (text) {
        const pattern = `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        projects = projects.where((project) => project.name.ilike(pattern));
      }
      if (input.status) {
        projects = projects.where((project) => project.status.eq(input.status as never));
      }
      const rows = await projects.orderBy((project) => project.updatedAt.desc()).all();
      if (rows.length === 0) return [];
      const ids = rows.map((row) => row.id);
      const [customers, quotes, followUps] = await Promise.all([
        db.orm.public.Customer.where({ tenantId })
          .where((customer) => customer.id.in([...new Set(rows.map((row) => row.customerId))]))
          .select("id", "name")
          .all(),
        db.orm.public.Quote.where({ tenantId })
          .where((quote) => quote.projectId.in(ids))
          .select("id", "projectId", "version", "status", "snapshot", "totalAmount", "sentAt")
          .all(),
        db.orm.public.ProjectFollowUp.where({ tenantId })
          .where((followUp) => followUp.projectId.in(ids))
          .where((followUp) => followUp.completedAt.isNull())
          .select("projectId", "scheduledFor")
          .all(),
      ]);
      const customerName = new Map(customers.map((customer) => [customer.id, customer.name]));
      return rows.map((project) => {
        const own = quotes
          .filter((quote) => quote.projectId === project.id)
          .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
        const latest = own[0];
        const pending = followUps.filter((followUp) => followUp.projectId === project.id);
        const next = pending
          .map((followUp) => iso(followUp.scheduledFor))
          .filter((date): date is string => Boolean(date))
          .sort()[0] ?? null;
        return {
          projectId: project.id,
          projectCode: project.code,
          projectName: project.name,
          projectStatus: project.status,
          customerName: customerName.get(project.customerId) ?? "",
          quoteCount: own.length,
          latest: latest
            ? {
                id: latest.id,
                version: latest.version ?? 0,
                status: latest.status as ProjectQuoteRow["status"],
                grandTotal: (latest.snapshot as QuoteDocument | null)?.totals.grand ?? "0",
                sentAt: iso(latest.sentAt),
              }
            : null,
          pendingFollowUps: pending.length,
          nextFollowUp: next,
          updatedAt: String(project.updatedAt),
        };
      });
    },

    /* --- Cotizaciones anteriores a la obra (migración) -------------- */

    /** Cotizaciones creadas antes de que la cotización naciera de la obra. */
    listLegacy: async () => {
      const quotes = await db.orm.public.Quote.where({ tenantId })
        .where((quote) => quote.projectId.isNull())
        .orderBy((quote) => quote.createdAt.desc())
        .select("id", "code", "title", "status", "customerId", "totalAmount", "createdAt")
        .all();
      return quotes.map((quote) => ({
        id: quote.id,
        code: quote.code,
        title: quote.title,
        status: quote.status as ProjectQuoteRow["status"],
        customerId: quote.customerId ?? null,
        totalAmount: String(quote.totalAmount),
        createdAt: String(quote.createdAt),
      }));
    },

    /**
     * Pasa una cotización anterior a una obra recién creada (vacía): un
     * capítulo "General" con sus partidas y el APU congelado de cada una, el
     * mismo AIU, y la cotización como versión 1 con su código original. Si
     * estaba aprobada, la obra queda contratada con línea base y bloqueo.
     * Errores: NOT_FOUND, ALREADY_MIGRATED, PROJECT_NOT_EMPTY.
     */
    adoptLegacyQuote: async (
      quoteId: string,
      projectId: string,
      input: { userId: string; userName: string },
    ): Promise<{ projectStatus: string; legacyTotal: string; newTotal: string }> => {
      const quote = await db.orm.public.Quote.where({ id: quoteId, tenantId }).first();
      if (!quote) throw new Error("NOT_FOUND");
      if (quote.projectId) throw new Error("ALREADY_MIGRATED");
      const project = await db.orm.public.Project.where({ id: projectId, tenantId }).first();
      const budget = await db.orm.public.ProjectBudget.where({ projectId, tenantId }).first();
      if (!project || !budget) throw new Error("NOT_FOUND");
      const existingChapters = await db.orm.public.BudgetChapter.where({ tenantId, budgetId: budget.id }).select("id").all();
      if (existingChapters.length > 0) throw new Error("PROJECT_NOT_EMPTY");
      const lines = await db.orm.public.QuoteItem.where({ quoteId }).all();

      const micro = (value: unknown) => decimalToMicro(String(value)) ?? BigInt(0);
      const fraction = (percent: unknown) => micro(percent) / BigInt(100);

      const revision = await db.transaction(async (tx) => {
        const chapter = await tx.orm.public.BudgetChapter.create({
          tenantId,
          budgetId: budget.id,
          order: 1,
          name: "General",
          description: `Migrada de la cotización ${quote.code}`,
        });
        for (const [index, line] of lines.entries()) {
          const snapshot = (line.apuSnapshot ?? null) as ApuSnapshot | null;
          const quantity = micro(line.quantity);
          const unitCostDirect = micro(line.unitCost);
          const item = await tx.orm.public.BudgetItem.create({
            tenantId,
            chapterId: chapter.id,
            order: index + 1,
            code: snapshot?.activity.code ?? String(index + 1),
            description: line.name,
            unit: line.unit,
            quantity,
            unitCostDirect,
            totalCostDirect: calculateItemTotal(quantity, unitCostDirect),
            sourceActivityId: line.activityId ?? null,
          });
          for (const [order, component] of (snapshot?.components ?? []).entries()) {
            const performance = micro(component.consumption);
            const unitPrice = micro(component.unitPrice);
            const wastePct = micro(component.wastePercent) / BigInt(100);
            await tx.orm.public.BudgetItemResource.create({
              tenantId,
              itemId: item.id,
              type: apuItemCategoryToResourceType(component.category),
              name: component.name,
              unit: component.unit,
              performance,
              unitPrice,
              wastePct,
              totalPrice: resourceLineCostMicro({ performance, wastePct, unitPrice }),
              order,
              sourceItemId: component.itemId,
            });
          }
        }
        const aiu = {
          admin: fraction(quote.adminPercent),
          imprev: fraction(quote.imprevPercent),
          utilidad: fraction(quote.utilPercent),
          iva: fraction(quote.taxPercent),
        };
        await recalcBudgetTotals(tx, budget.id, aiu);
        return bumpRevision(tx, budget, {
          aiuAdminPct: aiu.admin,
          aiuImprevPct: aiu.imprev,
          aiuUtilidadPct: aiu.utilidad,
          ivaUtilidadPct: aiu.iva,
        });
      });

      const fresh = (await db.orm.public.ProjectBudget.where({ tenantId, id: budget.id }).first())!;
      const tree = await loadBudgetTree(fresh);
      const [customer, header, tenant] = await Promise.all([
        db.orm.public.Customer.where({ id: project.customerId, tenantId }).select("name").first(),
        db.orm.public.ProjectHeader.where({ projectId }).first(),
        db.orm.public.Tenant.where({ id: tenantId }).select("name", "legalName", "taxId", "address", "city").first(),
      ]);
      const document = buildQuoteDocument({
        version: 1,
        code: quote.code,
        issuedAt: String(quote.createdAt),
        validUntil: null,
        showApuDetail: false,
        project: { code: project.code, name: project.name },
        header: header ? serializeProjectHeader(header) : null,
        customerName: customer?.name ?? "",
        issuer: {
          name: tenant?.legalName?.trim() || tenant?.name || null,
          taxId: tenant?.taxId ?? null,
          address: tenant?.address ?? null,
          city: tenant?.city ?? null,
        },
        budget: tree,
      });

      const targetStatus =
        quote.status === "APPROVED" ? "APPROVED" : quote.status === "DRAFT" ? "DRAFT" : "BIDDING";

      await db.transaction(async (tx) => {
        const adopted = await tx.orm.public.Quote.where({ id: quoteId, tenantId })
          .where((q) => q.projectId.isNull())
          .updateAndCount({
            projectId,
            version: 1,
            budgetRevision: revision,
            snapshot: document as never,
            customerId: project.customerId,
            sentAt: quote.status === "DRAFT" ? null : quote.createdAt,
          });
        if (adopted !== 1) throw new Error("ALREADY_MIGRATED");
        if (targetStatus === "APPROVED") {
          await lockRevision(tx, fresh);
          await insertBaseline(tx, tenantId, fresh, {
            userId: input.userId,
            userName: input.userName,
            note: `Cotización ${quote.code} aprobada (migrada)`,
          });
          await bumpRevision(tx, fresh, { isLocked: true });
          await tx.orm.public.BudgetLockEvent.create({
            tenantId,
            budgetId: fresh.id,
            action: "LOCK",
            reason: `Contratada: cotización ${quote.code} aprobada (migrada)`,
            userId: input.userId,
          });
        }
        if (targetStatus !== "DRAFT") {
          await tx.orm.public.Project.where({ id: projectId, tenantId }).update({ status: targetStatus });
        }
      });

      return {
        projectStatus: targetStatus,
        legacyTotal: String(quote.totalAmount),
        newTotal: tree.grandTotal,
      };
    },

    /* --- Seguimientos ----------------------------------------------- */

    listFollowUps: async (projectId: string): Promise<ProjectFollowUpRow[]> => {
      const [rows, quotes] = await Promise.all([
        db.orm.public.ProjectFollowUp.where({ tenantId, projectId })
          .orderBy((followUp) => followUp.createdAt.desc())
          .all(),
        db.orm.public.Quote.where({ tenantId, projectId }).select("id", "version").all(),
      ]);
      const versionById = new Map(quotes.map((quote) => [quote.id, quote.version ?? null]));
      return rows.map((row) => ({
        id: row.id,
        type: row.type as FollowUpTypeValue,
        note: row.note,
        quoteId: row.quoteId ?? null,
        quoteVersion: row.quoteId ? (versionById.get(row.quoteId) ?? null) : null,
        scheduledFor: iso(row.scheduledFor),
        completedAt: iso(row.completedAt),
        authorName: row.authorName,
        createdAt: String(row.createdAt),
      }));
    },

    createFollowUp: async (
      projectId: string,
      input: {
        type: FollowUpTypeValue;
        note: string;
        quoteId: string | null;
        scheduledFor: string | null;
        authorName: string;
      },
    ): Promise<{ id: string }> => {
      const project = await db.orm.public.Project.where({ id: projectId, tenantId }).select("id").first();
      if (!project) throw new Error("NOT_FOUND");
      if (input.quoteId) {
        const quote = await db.orm.public.Quote.where({ id: input.quoteId, tenantId, projectId }).select("id").first();
        if (!quote) throw new Error("NOT_FOUND");
      }
      const created = await db.orm.public.ProjectFollowUp.select("id").create({
        tenantId,
        projectId,
        quoteId: input.quoteId,
        type: input.type,
        note: input.note,
        scheduledFor: input.scheduledFor ? dayToInstant(input.scheduledFor) : null,
        // Un registro sin fecha prevista es algo que ya ocurrió.
        completedAt: input.scheduledFor ? null : now(),
        authorName: input.authorName,
      });
      return { id: created.id };
    },

    completeFollowUp: async (followUpId: string): Promise<boolean> => {
      const updated = await db.orm.public.ProjectFollowUp.where({ id: followUpId, tenantId })
        .where((followUp) => followUp.completedAt.isNull())
        .updateAndCount({ completedAt: now() });
      return updated === 1;
    },

    deleteFollowUp: async (followUpId: string): Promise<boolean> => {
      const deleted = await db.orm.public.ProjectFollowUp.where({ id: followUpId, tenantId }).deleteAndCount();
      return deleted === 1;
    },
  };
}
