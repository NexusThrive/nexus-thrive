import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LEAD_STAGES, type LeadStageValue } from "@/lib/ops/crm-rules";
import type { LeadRow } from "@/lib/ops/leads";
import LeadBoard from "./lead-board";

const lead = (id: string, company: string, stage: LeadStageValue, extra: Partial<LeadRow> = {}): LeadRow => ({
  id, company, stage,
  contactName: "Camila Ruiz", phone: null, email: null, vertical: "gym", city: "Bogotá", source: "Referido",
  ownerId: "s1", ownerName: "Ana Torres", nextStep: "Llamar para agendar demo", nextStepDate: "2026-10-28",
  valueUsdCents: 4900, plan: null, notes: null, lostReason: null, tenantId: null,
  stageChangedAt: "2026-10-20T10:00:00Z", createdAt: "2026-10-01T10:00:00Z", ...extra,
});

const SAMPLE: LeadRow[] = [
  lead("l1", "Gimnasio Norte", "NEW"),
  lead("l2", "Spa Centro", "NEW", { nextStepDate: "2026-10-30", ownerName: null, ownerId: null }),
  lead("l3", "Constructora Andina", "QUALIFIED", { valueUsdCents: 19900 }),
  lead("l4", "Clínica Salud", "DEMO", { nextStepDate: "2026-10-20" }),
  lead("l5", "Museo del Oro", "PROPOSAL"),
];
const STAGES = LEAD_STAGES.map((s) => ({ value: s.value, label: s.label }));

function Demo({ canEdit = true, failMove = false }: { canEdit?: boolean; failMove?: boolean }) {
  const [leads, setLeads] = useState(SAMPLE);
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  return (
    <div className="overflow-x-auto pb-2">
      <LeadBoard
        leads={leads}
        stages={STAGES}
        today="2026-10-23"
        canEdit={canEdit}
        savingIds={saving}
        onMove={(l, stage) => {
          // Mismo patrón que CrmView: optimista, y si falla vuelve.
          setLeads((cur) => cur.map((x) => (x.id === l.id ? { ...x, stage } : x)));
          setSaving((s) => new Set(s).add(l.id));
          window.setTimeout(() => {
            if (failMove) setLeads((cur) => cur.map((x) => (x.id === l.id ? { ...x, stage: l.stage } : x)));
            setSaving((s) => {
              const n = new Set(s);
              n.delete(l.id);
              return n;
            });
          }, 600);
        }}
      />
    </div>
  );
}

const meta = {
  title: "Páginas/CRM comercial/LeadBoard",
  component: LeadBoard,
  args: { leads: SAMPLE, stages: STAGES, today: "2026-10-23", canEdit: true, savingIds: new Set<string>(), onMove: () => {} },
  argTypes: { leads: { control: false }, stages: { control: false }, savingIds: { control: false }, onMove: { control: false } },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Tablero del embudo del Operations Center. Los leads se arrastran entre **etapas activas** (el asa de la izquierda de cada tarjeta). Alternativas sin arrastrar: el menú «Mover a» de la tarjeta y, con teclado, Espacio para tomar el lead, ← → para cambiar de columna, Espacio para soltar y Esc para cancelar (se anuncia cada paso). Ganar o perder no se suelta: hay que abrir el lead (negocio vinculado o motivo). El orden dentro de la columna es por fecha del próximo paso: el modelo no guarda posición. En la app, el cambio es optimista y vuelve atrás si el servidor lo rechaza o si otra persona ya lo movió.",
      },
    },
  },
} satisfies Meta<typeof LeadBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <div className="p-4"><Demo /></div> };
export const ReadOnly: Story = { render: () => <div className="p-4"><Demo canEdit={false} /></div> };
export const SaveFails: Story = { render: () => <div className="p-4"><Demo failMove /></div> };
