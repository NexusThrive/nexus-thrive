import type { Metadata } from "next";
import { requirePageContext } from "@/lib/core/tenancy/context";
import { AppHome } from "@/components/organisms/app-home";

export const metadata: Metadata = { title: "Aplicaciones" };

/** Entrada del negocio: la pantalla de aplicaciones (App Home). El dashboard de cifras vive en Inicio (/inicio). */
export default async function AppHomePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  await requirePageContext(tenant);
  return <AppHome />;
}
