"use server";

import { requireTenantContext as requireSharedTenantContext } from "@/lib/tenant/context";
import { auth } from "@clerk/nextjs/server";
import { createTenantDb } from "@/lib/tenant/db";

export type ActionState = {
  status: "idle" | "ok" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
  values?: Record<string, unknown>;
};

export type InformeCeroResult = {
  status: "ok" | "error";
  data?: import("@/lib/construction/report-engine").InformeCeroData;
  message?: string;
};

export type WeeklyReportResult = {
  status: "ok" | "error";
  data?: import("@/lib/construction/report-engine").WeeklyReportData;
  message?: string;
};

export type BomExportResult = {
  status: "ok" | "error";
  csv?: string;
  filename?: string;
  message?: string;
};

type TenantContext = {
  tenantId: string;
  tenantDb: ReturnType<typeof createTenantDb>;
};

async function requireTenantContext(
  tenantSlug: string,
): Promise<TenantContext | null> {
  const context = await requireSharedTenantContext(tenantSlug, "/projects");
  if (!context) {
    return null;
  }
  return { tenantId: context.tenantId, tenantDb: context.tenantDb };
}

export async function getInformeCeroDataAction(
  tenantSlug: string,
  projectId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<InformeCeroResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { status: "error", message: "Debes iniciar sesión para continuar." };
    }
    const context = await requireTenantContext(tenantSlug);
    if (!context) {
      return { status: "error", message: "No tienes acceso a este negocio." };
    }
    const data = await context.tenantDb.reports.getInformeCeroData(projectId);
    if (!data) {
      return { status: "error", message: "Proyecto no encontrado o sin acceso." };
    }
    return { status: "ok", data };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al generar el Informe Cero.";
    return { status: "error", message };
  }
}

export async function getWeeklyReportDataAction(
  tenantSlug: string,
  projectId: string,
  weekNumber: number,
  year: number,
  _prevState: ActionState,
  _formData: FormData,
): Promise<WeeklyReportResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { status: "error", message: "Debes iniciar sesión para continuar." };
    }
    const context = await requireTenantContext(tenantSlug);
    if (!context) {
      return { status: "error", message: "No tienes acceso a este negocio." };
    }
    const data = await context.tenantDb.reports.getWeeklyReportData(
      projectId,
      weekNumber,
      year,
    );
    if (!data) {
      return { status: "error", message: "Proyecto no encontrado o sin acceso." };
    }
    return { status: "ok", data };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al generar el Informe Semanal.";
    return { status: "error", message };
  }
}

export async function exportBomCsvAction(
  tenantSlug: string,
  projectId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<BomExportResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { status: "error", message: "Debes iniciar sesión para continuar." };
    }
    const context = await requireTenantContext(tenantSlug);
    if (!context) {
      return { status: "error", message: "No tienes acceso a este negocio." };
    }
    const resources = await context.tenantDb.reports.getBomExportData(projectId);
    const { generateBomCsv } = await import("@/lib/construction/report-engine");
    const csv = generateBomCsv(resources);

    const project = await context.tenantDb.projects.get(projectId);
    const projectCode = project?.code ?? "PROYECTO";
    const filename = `BOM_${projectCode}_${new Date().toISOString().split("T")[0]}.csv`;

    return { status: "ok", csv, filename };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al exportar el BOM.";
    return { status: "error", message };
  }
}
