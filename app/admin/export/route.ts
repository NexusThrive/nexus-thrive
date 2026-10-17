import { requireStaff } from "@/lib/ops/access";
import { headers } from "next/headers";
import { createAdminDb, type TenantListRow } from "@/lib/admin-db";
import { isVertical } from "@/lib/admin-catalogs";

export const dynamic = "force-dynamic";

/** Escapa un campo para CSV (comillas dobles + comillas internas). */
function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

const CSV_HEADERS = [
  "Nombre",
  "Slug",
  "Vertical",
  "Estado",
  "Onboarding",
  "Ciudad",
  "Dominio personalizado",
  "Módulos activos",
  "Usuarios",
  "Creado",
  "Última actividad",
  "URL",
];

function toCsv(rows: TenantListRow[]): string {
  const lines = [CSV_HEADERS.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.slug,
        row.vertical,
        row.active ? "Activo" : "Suspendido",
        row.onboardingCompleted
          ? "Completo"
          : `Pendiente (${row.onboardingProgress}%)`,
        row.city ?? "",
        row.customDomain ?? "",
        row.modules.join(" | "),
        String(row.usersCount),
        row.createdAt,
        row.lastActivityLabel,
        row.url,
      ]
        .map((value) => csvField(value))
        .join(","),
    );
  }
  return lines.join("\r\n");
}

/**
 * Exportación CSV del listado de negocios (respeta todos los filtros del
 * panel). Requiere el permiso accounts.view: no es un endpoint público. Queda auditado.
 */
export async function GET(request: Request): Promise<Response> {
  // Integrante del equipo NEXUS con acceso a cuentas (lib/ops/access.ts).
  const staff = await requireStaff("accounts.view");
  if (!staff) {
    return new Response("No autorizado.", { status: 403 });
  }
  const userId = staff.clerkUserId;
  const sessionClaims = { email: staff.email };
  const adminDb = createAdminDb();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const verticalRaw = searchParams.get("vertical") ?? "";
  const statusRaw = searchParams.get("status") ?? "";
  const attentionOnly = searchParams.get("attention") === "1";

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";

  const rows = await adminDb.listTenantsForExport({
    host,
    q,
    vertical: isVertical(verticalRaw) ? verticalRaw : undefined,
    activeStatus:
      statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all",
    attentionOnly,
    sort: "created_desc",
  });

  const claims = sessionClaims as { email?: unknown } | null;
  try {
    await adminDb.logAudit({
      actorId: userId,
      actorEmail: typeof claims?.email === "string" ? claims.email : null,
      action: "EXPORT_TENANTS",
      metadata: { rows: rows.length, q, verticalRaw, statusRaw, attentionOnly },
      ipAddress:
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headerList.get("x-real-ip") ??
        null,
      userAgent: headerList.get("user-agent"),
    });
  } catch (error) {
    console.error("[admin] export audit failed:", error);
  }

  // BOM para que Excel respete los acentos.
  const body = `\uFEFF${toCsv(rows)}`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="negocios-nexus-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
