import { Building2, Link2, MapPin, MapPinned, Pencil, Receipt, Store, User, Users } from "lucide-react";
import type { ReactNode } from "react";
import { getVerticalIcon } from "@/lib/admin/vertical-icons";
import { MODULE_LABELS, VERTICAL_LABELS, type ModuleValue, type VerticalValue } from "@/lib/admin-catalogs";
import { MODULE_ICONS } from "@/lib/onboarding/module-meta";
import { PLANS, type Billing, type PlanKey } from "@/lib/plans/catalog";
import { formatUsdCents, type PlanQuote } from "@/lib/plans/quote";

export type ReviewData = {
  tenantType: "INDIVIDUAL" | "COMPANY" | null;
  name: string;
  legalName?: string;
  taxId?: string;
  slug: string;
  vertical: VerticalValue | null;
  teamSize?: string;
  address?: string;
  city: string;
  plan: PlanKey;
  billing: Billing;
  quote: PlanQuote;
};

function Row({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <dt className="w-28 shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{value}</dd>
    </div>
  );
}

function Card({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-[14.5px] font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          data-press=""
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium text-accent-text transition-colors hover:bg-surface-muted"
        >
          <Pencil aria-hidden="true" className="size-3.5" /> Editar
        </button>
      </header>
      <div className="px-4 py-1.5">{children}</div>
    </section>
  );
}

/** Paso "Confirma tus datos": negocio y plan en tarjetas con "Editar" que lleva al paso. */
export function OnboardingReview({
  data,
  teamSizeLabel,
  onEdit,
}: {
  data: ReviewData;
  teamSizeLabel?: string;
  onEdit: (step: "profile" | "business" | "plan") => void;
}) {
  const visual = data.vertical ? getVerticalIcon(data.vertical) : null;
  return (
    <div className="grid grid-cols-1 gap-3.5">
      <Card title="Tu negocio" onEdit={() => onEdit("business")}>
        <dl className="divide-y divide-border">
          <Row
            icon={data.tenantType === "COMPANY" ? Building2 : User}
            label="Perfil"
            value={data.tenantType === "COMPANY" ? "Empresa" : "Emprendedor / persona natural"}
          />
          <Row icon={Store} label="Nombre" value={data.name} />
          {data.legalName ? <Row icon={Building2} label="Razón social" value={data.legalName} /> : null}
          {data.taxId ? <Row icon={Receipt} label="NIT / RUT" value={data.taxId} /> : null}
          <Row icon={Link2} label="Enlace" value={<span className="font-mono text-[12.5px]">nexusthrive.co/{data.slug}</span>} />
          {data.vertical && visual ? <Row icon={visual.icon} label="Rubro" value={VERTICAL_LABELS[data.vertical]} /> : null}
          {teamSizeLabel ? <Row icon={Users} label="Equipo" value={teamSizeLabel} /> : null}
          {data.address ? <Row icon={MapPinned} label="Dirección" value={data.address === "REMOTE" ? "Sin local físico" : data.address} /> : null}
          <Row icon={MapPin} label="Ciudad" value={data.city} />
        </dl>
      </Card>

      <Card title="Tu plan" onEdit={() => onEdit("plan")}>
        <div className="flex items-end justify-between gap-3 py-3">
          <div>
            <p className="font-display text-[17px] font-bold">
              Thrive <span className="text-accent-text">{PLANS[data.plan].name}</span>
            </p>
            <p className="text-[12.5px] text-muted-foreground">
              {data.billing === "ANNUAL" ? `Anual · ${formatUsdCents(data.quote.yearlyCents)} al año` : "Mensual"} · sin cobro todavía
            </p>
          </div>
          <p className="flex items-baseline gap-1">
            <span className="font-display text-[26px] font-bold tabular-nums">{formatUsdCents(data.quote.monthlyCents)}</span>
            <span className="text-[12px] text-muted-foreground">USD/mes</span>
          </p>
        </div>
        <ul className="flex flex-wrap gap-1.5 border-t border-border py-3">
          {data.quote.modules.map((m: ModuleValue) => {
            const Icon = MODULE_ICONS[m];
            return (
              <li key={m} className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-muted px-2 py-1 text-[12px] font-medium">
                <Icon aria-hidden="true" className="size-3.5 text-accent-text" />
                {MODULE_LABELS[m]}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
