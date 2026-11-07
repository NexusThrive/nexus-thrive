import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { customerOptions } from "@/lib/business/customers/customers-db";
import { listTasks, projectOptions, teamOptions } from "@/lib/business/customers/tasks-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { todayCO } from "@/lib/foundation/dates/plain-date";
import TasksView from "./_components/tasks-view";

export const metadata: Metadata = { title: "Tareas" };

/** Tareas: lo que hay que hacer, con fecha y responsable. «Mis tareas» y «Vencidas» funcionan en el celular. */
export default async function TareasPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/tareas");
  if (!ctx) notFound();
  const today = todayCO();
  const [mine, overdue, all, team, customers, projects] = await Promise.all([listTasks(ctx.tenantId, "mine", ctx.memberId, today), listTasks(ctx.tenantId, "overdue", ctx.memberId, today), listTasks(ctx.tenantId, "all", ctx.memberId, today), teamOptions(ctx.tenantId), customerOptions(ctx.tenantId), projectOptions(ctx.tenantId)]);
  return (
    <div className="grid gap-5">
      <PageHeader title="Tareas" description="Que nadie olvide el siguiente paso: por cliente, por proyecto y por persona." />
      <TasksView slug={tenant} mine={mine} overdue={overdue} all={all} team={team} customers={customers} projects={projects} today={today} me={ctx.memberId} />
    </div>
  );
}
