import { db } from "@/prisma/db";

/**
 * Borrado de raíz de un negocio.
 *
 * Elimina el negocio y TODOS sus datos: clientes, membresías, dinero (caja,
 * pagos, facturas, gastos), asistencia, agenda, proyectos y catálogo APU,
 * tickets, leads, CRM, presencia, invitaciones, módulos y las cuentas de su
 * equipo.
 *
 * El orden importa: las tablas se borran de hija a padre para no chocar con
 * las claves foráneas, y al final se borra el negocio (las 51 tablas que lo
 * tienen como clave foránea caen en cascada).
 *
 * NO se borra lo que es de la plataforma: los roles del panel, el equipo de
 * NEXUS, los códigos de acceso (PROMO/PAID) ni la auditoría.
 *
 * Las cuentas de Clerk de los integrantes quedan LIBRES: se borra su ficha de
 * negocio, así que pueden entrar y volver a crear un negocio (o ser invitados
 * al equipo).
 */

/**
 * Tablas que cubre el borrado de raíz: todas las que tienen `tenantId` más las
 * que cuelgan de ellas sin llevar el `tenantId` (nivel 2).
 *
 * La lista se exporta para poder auditarla: la prueba de integración la
 * compara con las tablas que de verdad tienen `tenantId` en la base, así que
 * si mañana se agrega una tabla nueva, la prueba falla hasta que se incluya
 * aquí.
 */
export const TENANT_DELETION_TABLES: readonly string[] = [
  "ApiKey",
  "ApiRequestLog",
  "ApuActivity",
  "ApuActivityComposition",
  "ApuChapter",
  "ApuImage",
  "ApuImportRun",
  "ApuItem",
  "ApuItemPriceHistory",
  "Attachment",
  "Attendance",
  "BenefitRedemption",
  "Booking",
  "BudgetBaseline",
  "BudgetChapter",
  "BudgetItem",
  "BudgetItemProgress",
  "BudgetItemResource",
  "BudgetLockEvent",
  "CashBox",
  "CashMovement",
  "CashSession",
  "Charge",
  "ChargeEvidence",
  "Customer",
  "CustomerNote",
  "Departure",
  "DismissedNotification",
  "Expense",
  "ExternalConnection",
  "FieldLog",
  "FieldLogEntry",
  "InboxConversation",
  "InboxMessage",
  "Invoice",
  "InvoiceLine",
  "IdempotencyRecord",
  "Lead",
  "LeadActivity",
  "LookaheadTask",
  "Membership",
  "OutboxEvent",
  "Party",
  "PartyRole",
  "Payment",
  "PriceList",
  "PriceListItem",
  "PresenceRequest",
  "ProductBarcode",
  "ProductVariant",
  "ProviderEvent",
  "PurchaseOrder",
  "PurchaseOrderLine",
  "PresenceScan",
  "Product",
  "Project",
  "ProjectBudget",
  "ProjectFollowUp",
  "ProjectHeader",
  "ProjectPlan",
  "Quote",
  "QuoteItem",
  "SatisfactionSurvey",
  "StockMovement",
  "StockTransfer",
  "StockTransferLine",
  "StockCount",
  "StockCountLine",
  "StockLevel",
  "Subscription",
  "SupplierInvoice",
  "SupportTicket",
  "TenantContact",
  "TenantInvite",
  "TenantModule",
  "TicketMessage",
  "TicketSale",
  "TourBooking",
  "UsageCounter",
  "User",
  "Warehouse",
  "WebhookDelivery",
  "WebhookEndpoint",
  "WeeklyCommitment",
];

export type TenantDeletionResult = {
  ok: true;
  /** Filas borradas por tabla. */
  deleted: Record<string, number>;
  /** Total de filas borradas. */
  total: number;
  /** Cuentas de Clerk que quedaron libres (el negocio ya no las usa). */
  clerkUsers: string[];
  /** Cuántas tablas se tocaron. */
  tables: number;
};

export type TenantDeletionError = { ok: false; message: string };

/**
 * Borra el negocio y todo lo suyo. Va en una transacción: o se va todo, o no
 * se toca nada.
 */
export async function deleteTenantCompletely(
  tenantId: string,
): Promise<TenantDeletionResult | TenantDeletionError> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) return { ok: false, message: "El negocio ya no existe." };

  // Cuentas de Clerk que quedarán libres (antes de borrar las fichas).
  const members = await db.orm.public.User.where({ tenantId }).select("clerkUserId").all();
  const clerkUsers = [
    ...new Set(members.map((m) => m.clerkUserId).filter((id): id is string => Boolean(id))),
  ];

  const deleted: Record<string, number> = {};
  const count = (table: string, rows: unknown[]) => {
    if (rows.length) deleted[table] = rows.length;
  };

  try {
    await db.transaction(async (tx) => {
      // ---- Nivel 2: tablas sin `tenantId` que cuelgan de datos del negocio.
      // Se borran por el id de su padre, antes de borrar al padre.
      {
        const ids = new Set<string>();
        for (const row of await tx.orm.public.ApuActivity.where({ tenantId }).select("id").all())
          ids.add(String(row.id));
        for (const row of await tx.orm.public.ApuItem.where({ tenantId }).select("id").all())
          ids.add(String(row.id));
        if (ids.size) {
          count(
            "ApuActivityComposition",
            await tx.orm.public.ApuActivityComposition
              .where((row) => row.activityId.in([...ids]) || row.itemId.in([...ids]))
              .deleteAll(),
          );
        }
      }
      {
        const ids = new Set<string>();
        for (const row of await tx.orm.public.Charge.where({ tenantId }).select("id").all())
          ids.add(String(row.id));
        if (ids.size) {
          count(
            "ChargeEvidence",
            await tx.orm.public.ChargeEvidence.where((row) => row.chargeId.in([...ids])).deleteAll(),
          );
        }
      }
      {
        const ids = new Set<string>();
        for (const row of await tx.orm.public.InboxConversation.where({ tenantId }).select("id").all())
          ids.add(String(row.id));
        if (ids.size) {
          count(
            "InboxMessage",
            await tx.orm.public.InboxMessage.where((row) => row.conversationId.in([...ids])).deleteAll(),
          );
        }
      }
      {
        const ids = new Set<string>();
        for (const row of await tx.orm.public.Invoice.where({ tenantId }).select("id").all())
          ids.add(String(row.id));
        if (ids.size) {
          count(
            "InvoiceLine",
            await tx.orm.public.InvoiceLine.where((row) => row.invoiceId.in([...ids])).deleteAll(),
          );
        }
      }
      {
        const ids = new Set<string>();
        for (const row of await tx.orm.public.Lead.where({ tenantId }).select("id").all())
          ids.add(String(row.id));
        if (ids.size) {
          count(
            "LeadActivity",
            await tx.orm.public.LeadActivity.where((row) => row.leadId.in([...ids])).deleteAll(),
          );
        }
      }
      {
        const ids = new Set<string>();
        for (const row of await tx.orm.public.Project.where({ tenantId }).select("id").all())
          ids.add(String(row.id));
        if (ids.size) {
          count(
            "ProjectHeader",
            await tx.orm.public.ProjectHeader.where((row) => row.projectId.in([...ids])).deleteAll(),
          );
        }
      }
      {
        const ids = new Set<string>();
        for (const row of await tx.orm.public.Quote.where({ tenantId }).select("id").all())
          ids.add(String(row.id));
        if (ids.size) {
          count(
            "QuoteItem",
            await tx.orm.public.QuoteItem.where((row) => row.quoteId.in([...ids])).deleteAll(),
          );
        }
      }
      {
        const ids = new Set<string>();
        for (const row of await tx.orm.public.SupportTicket.where({ tenantId }).select("id").all())
          ids.add(String(row.id));
        if (ids.size) {
          count(
            "TicketMessage",
            await tx.orm.public.TicketMessage.where((row) => row.ticketId.in([...ids])).deleteAll(),
          );
        }
      }
      {
        const ids = new Set<string>();
        for (const row of await tx.orm.public.User.where({ tenantId }).select("id").all())
          ids.add(String(row.id));
        if (ids.size) {
          count(
            "DismissedNotification",
            await tx.orm.public.DismissedNotification.where((row) => row.userId.in([...ids])).deleteAll(),
          );
        }
      }

      // ---- Tablas del negocio (de hija a padre) ----
  count("ApuItemPriceHistory", await tx.orm.public.ApuItemPriceHistory.where({ tenantId }).deleteAll());
  count("ApuItem", await tx.orm.public.ApuItem.where({ tenantId }).deleteAll());
  count("ApuActivity", await tx.orm.public.ApuActivity.where({ tenantId }).deleteAll());
  count("ApuChapter", await tx.orm.public.ApuChapter.where({ tenantId }).deleteAll());
  count("ApuImage", await tx.orm.public.ApuImage.where({ tenantId }).deleteAll());
  count("ApuImportRun", await tx.orm.public.ApuImportRun.where({ tenantId }).deleteAll());
  count("PriceListItem", await tx.orm.public.PriceListItem.where({ tenantId }).deleteAll());
  count("PriceList", await tx.orm.public.PriceList.where({ tenantId }).deleteAll());
  count("ProductBarcode", await tx.orm.public.ProductBarcode.where({ tenantId }).deleteAll());
  count("ProductVariant", await tx.orm.public.ProductVariant.where({ tenantId }).deleteAll());
  count("PartyRole", await tx.orm.public.PartyRole.where({ tenantId }).deleteAll());
  count("ProviderEvent", await tx.orm.public.ProviderEvent.where({ tenantId }).deleteAll());
  count("ExternalConnection", await tx.orm.public.ExternalConnection.where({ tenantId }).deleteAll());
  count("UsageCounter", await tx.orm.public.UsageCounter.where({ tenantId }).deleteAll());
  count("StockCountLine", await tx.orm.public.StockCountLine.where({ tenantId }).deleteAll());
  count("StockCount", await tx.orm.public.StockCount.where({ tenantId }).deleteAll());
  count("StockTransferLine", await tx.orm.public.StockTransferLine.where({ tenantId }).deleteAll());
  count("StockTransfer", await tx.orm.public.StockTransfer.where({ tenantId }).deleteAll());
  count("SupplierInvoice", await tx.orm.public.SupplierInvoice.where({ tenantId }).deleteAll());
  count("PurchaseOrderLine", await tx.orm.public.PurchaseOrderLine.where({ tenantId }).deleteAll());
  count("PurchaseOrder", await tx.orm.public.PurchaseOrder.where({ tenantId }).deleteAll());
  count("WebhookDelivery", await tx.orm.public.WebhookDelivery.where({ tenantId }).deleteAll());
  count("WebhookEndpoint", await tx.orm.public.WebhookEndpoint.where({ tenantId }).deleteAll());
  count("OutboxEvent", await tx.orm.public.OutboxEvent.where({ tenantId }).deleteAll());
  count("ApiRequestLog", await tx.orm.public.ApiRequestLog.where({ tenantId }).deleteAll());
  count("IdempotencyRecord", await tx.orm.public.IdempotencyRecord.where({ tenantId }).deleteAll());
  count("ApiKey", await tx.orm.public.ApiKey.where({ tenantId }).deleteAll());
  count("Attachment", await tx.orm.public.Attachment.where({ tenantId }).deleteAll());
  count("Attendance", await tx.orm.public.Attendance.where({ tenantId }).deleteAll());
  count("BenefitRedemption", await tx.orm.public.BenefitRedemption.where({ tenantId }).deleteAll());
  count("Booking", await tx.orm.public.Booking.where({ tenantId }).deleteAll());
  count("BudgetBaseline", await tx.orm.public.BudgetBaseline.where({ tenantId }).deleteAll());
  count("BudgetItemProgress", await tx.orm.public.BudgetItemProgress.where({ tenantId }).deleteAll());
  count("BudgetItemResource", await tx.orm.public.BudgetItemResource.where({ tenantId }).deleteAll());
  count("FieldLogEntry", await tx.orm.public.FieldLogEntry.where({ tenantId }).deleteAll());
  count("LookaheadTask", await tx.orm.public.LookaheadTask.where({ tenantId }).deleteAll());
  count("WeeklyCommitment", await tx.orm.public.WeeklyCommitment.where({ tenantId }).deleteAll());
  count("BudgetItem", await tx.orm.public.BudgetItem.where({ tenantId }).deleteAll());
  count("BudgetChapter", await tx.orm.public.BudgetChapter.where({ tenantId }).deleteAll());
  count("BudgetLockEvent", await tx.orm.public.BudgetLockEvent.where({ tenantId }).deleteAll());
  count("CashMovement", await tx.orm.public.CashMovement.where({ tenantId }).deleteAll());
  count("CashSession", await tx.orm.public.CashSession.where({ tenantId }).deleteAll());
  count("CashBox", await tx.orm.public.CashBox.where({ tenantId }).deleteAll());
  count("Charge", await tx.orm.public.Charge.where({ tenantId }).deleteAll());
  count("CustomerNote", await tx.orm.public.CustomerNote.where({ tenantId }).deleteAll());
  count("Payment", await tx.orm.public.Payment.where({ tenantId }).deleteAll());
  count("Membership", await tx.orm.public.Membership.where({ tenantId }).deleteAll());
  count("FieldLog", await tx.orm.public.FieldLog.where({ tenantId }).deleteAll());
  count("ProjectBudget", await tx.orm.public.ProjectBudget.where({ tenantId }).deleteAll());
  count("ProjectFollowUp", await tx.orm.public.ProjectFollowUp.where({ tenantId }).deleteAll());
  count("ProjectPlan", await tx.orm.public.ProjectPlan.where({ tenantId }).deleteAll());
  count("Quote", await tx.orm.public.Quote.where({ tenantId }).deleteAll());
  count("Project", await tx.orm.public.Project.where({ tenantId }).deleteAll());
  count("Customer", await tx.orm.public.Customer.where({ tenantId }).deleteAll());
  count("Party", await tx.orm.public.Party.where({ tenantId }).deleteAll());
  count("Departure", await tx.orm.public.Departure.where({ tenantId }).deleteAll());
  count("Expense", await tx.orm.public.Expense.where({ tenantId }).deleteAll());
  count("InboxConversation", await tx.orm.public.InboxConversation.where({ tenantId }).deleteAll());
  count("Invoice", await tx.orm.public.Invoice.where({ tenantId }).deleteAll());
  count("Lead", await tx.orm.public.Lead.where({ tenantId }).deleteAll());
  count("PresenceRequest", await tx.orm.public.PresenceRequest.where({ tenantId }).deleteAll());
  count("PresenceScan", await tx.orm.public.PresenceScan.where({ tenantId }).deleteAll());
  count("StockMovement", await tx.orm.public.StockMovement.where({ tenantId }).deleteAll());
  count("StockLevel", await tx.orm.public.StockLevel.where({ tenantId }).deleteAll());
  count("Warehouse", await tx.orm.public.Warehouse.where({ tenantId }).deleteAll());
  count("Product", await tx.orm.public.Product.where({ tenantId }).deleteAll());
  count("SatisfactionSurvey", await tx.orm.public.SatisfactionSurvey.where({ tenantId }).deleteAll());
  count("Subscription", await tx.orm.public.Subscription.where({ tenantId }).deleteAll());
  count("SupportTicket", await tx.orm.public.SupportTicket.where({ tenantId }).deleteAll());
  count("TenantContact", await tx.orm.public.TenantContact.where({ tenantId }).deleteAll());
  count("TenantInvite", await tx.orm.public.TenantInvite.where({ tenantId }).deleteAll());
  count("TenantModule", await tx.orm.public.TenantModule.where({ tenantId }).deleteAll());
  count("TicketSale", await tx.orm.public.TicketSale.where({ tenantId }).deleteAll());
  count("TourBooking", await tx.orm.public.TourBooking.where({ tenantId }).deleteAll());
  count("User", await tx.orm.public.User.where({ tenantId }).deleteAll());

      // ---- El negocio ----
      await tx.orm.public.Tenant.where({ id: tenantId }).delete();
    });
  } catch (error) {
    console.error("[tenant] no se pudo eliminar el negocio:", error);
    return {
      ok: false,
      message: "No se pudo eliminar el negocio. Inténtalo de nuevo o escríbenos.",
    };
  }

  const total = Object.values(deleted).reduce((sum, n) => sum + n, 0);
  return { ok: true, deleted, total, clerkUsers, tables: Object.keys(deleted).length };
}
