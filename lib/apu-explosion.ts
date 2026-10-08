/**
 * Motor de explosión de insumos (NEXUS THRIVE) — Fase 3.
 *
 * Convierte un presupuesto existente en la lista consolidada de recursos
 * (materiales, mano de obra, equipos y transporte) necesarios para ejecutar
 * la obra. Es la fuente de datos del reporte operativo (`/quotes/[id]/explosion`)
 * y de la exportación de lista de compras.
 *
 * Precisión financiera:
 *   Los `Decimal` de PostgreSQL se materializan como strings en este driver
 *   y todo cálculo pasa por el mismo motor de punto fijo de `apu-engine.ts`
 *   (`parseMoney`/`moneyToString`/`lineTotal`). Cero `number` en operaciones
 *   monetarias o de cantidades. Los resultados se serializan a strings para
 *   cruzar la frontera Server → Client.
 *
 * Fuente del APU (compatibilidad histórica):
 *   Prioridad 1 — `QuoteItem.apuSnapshot`: fotografía inmutable del APU que
 *                 se usó al cotizar (precios, consumos y desperdicios).
 *   Prioridad 2 — Composición APU vigente (`ApuActivity → ApuActivityComposition
 *                 → ApuItem`) SOLO para líneas sin snapshot válido.
 *   Nunca se mezclan precios del catálogo actual sobre un snapshot válido.
 *
 * Multi-tenant:
 *   Toda consulta filtra por `tenantId`; si el presupuesto no pertenece al
 *   tenant se devuelve `null` (el caller responde 404) sin revelar la
 *   existencia del recurso.
 */

import { db } from "@/prisma/db";
import {
  lineTotal,
  moneyToString,
  parseMoney,
  type ApuItemCategoryValue,
  type ApuSnapshot,
} from "@/lib/apu-engine";

/* ------------------------------------------------------------------ */
/* Tipos serializables (Server → Client)                               */
/* ------------------------------------------------------------------ */

/** Recurso consolidado de la explosión (una fila del reporte). */
export type ExplosionResource = {
  /** Id estable del ApuItem; null solo en snapshots legacy sin id. */
  itemId: string | null;
  code: string | null;
  name: string;
  unit: string;
  category: ApuItemCategoryValue;
  /** Cantidad total consolidada (ya con desperdicio). */
  quantity: string;
  /** Precio unitario — del snapshot cuando existe, si no del catálogo. */
  unitPrice: string;
  /** quantity × unitPrice (precisión exacta del motor). */
  estimatedCost: string;
};

/** Costos estimados por categoría (strings serializables). */
export type ExplosionTotals = {
  materials: string;
  labor: string;
  equipment: string;
  transport: string;
  global: string;
};

/** Resultado completo del motor. */
export type InsumosExplosion = {
  quote: {
    id: string;
    code: string;
    title: string;
  };
  /** De dónde se obtuvo la composición que alimenta la explosión. */
  source: "snapshot" | "catalog" | "mixed";
  materials: ExplosionResource[];
  labor: ExplosionResource[];
  equipment: ExplosionResource[];
  transport: ExplosionResource[];
  totals: ExplosionTotals;
};

export type CalculateInsumosExplosionInput = {
  tenantId: string;
  quoteId: string;
};

/* ------------------------------------------------------------------ */
/* Punto fijo (espejo del motor)                                       */
/* ------------------------------------------------------------------ */

/** Escala del motor: 1 unidad = 1_000_000 micro (6 decimales). */
const UNIT = BigInt(1_000_000);

/** División con redondeo half-up (valores no negativos). */
function roundDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / BigInt(2)) / denominator;
}

/**
 * Cantidad final de un componente:
 *   base = cantidadActividad × consumo
 *   final = base × (1 + desperdicio/100)
 * Redondeado half-up al micro, igual que `componentCost` del motor.
 * Devuelve `null` si alguna entrada no es un decimal válido o es negativa.
 */
export function computeFinalQuantity(
  activityQuantity: string,
  consumption: string,
  wastePercent: string,
): string | null {
  const qty = parseMoney(activityQuantity);
  const cons = parseMoney(consumption);
  const waste = parseMoney(wastePercent);
  if (
    qty === null ||
    cons === null ||
    waste === null ||
    qty < BigInt(0) ||
    cons < BigInt(0) ||
    waste < BigInt(0)
  ) {
    return null;
  }
  const factor = BigInt(100) * UNIT + waste;
  const micro = roundDiv(
    qty * cons * factor,
    BigInt(100) * UNIT * UNIT,
  );
  return moneyToString(micro);
}

/* ------------------------------------------------------------------ */
/* Consolidación                                                       */
/* ------------------------------------------------------------------ */

/** Clave estable: por itemId; en snapshots legacy usa nombre normalizado. */
function stableKey(component: {
  itemId: string | null;
  name: string;
  unit: string;
  category: ApuItemCategoryValue;
}): string {
  if (component.itemId) {
    return `id:${component.itemId}`;
  }
  const name = component.name.trim().toLowerCase().replace(/\s+/g, " ");
  const unit = component.unit.trim().toLowerCase();
  return `key:${name}|${unit}|${component.category}`;
}

/** Componente normalizado (snapshot o catálogo vigente). */
type ComponentSource = {
  itemId: string | null;
  code: string | null;
  name: string;
  unit: string;
  category: ApuItemCategoryValue;
  unitPrice: string;
  consumption: string;
  wastePercent: string;
};

type Accumulated = {
  micro: bigint;
  costMicro: bigint;
  unitPrice: string;
  first: ExplosionResource;
};

function pushContribution(
  map: Map<string, Accumulated>,
  component: ComponentSource,
  activityQuantity: string,
): void {
  const finalQuantity = computeFinalQuantity(
    activityQuantity,
    component.consumption,
    component.wastePercent,
  );
  if (finalQuantity === null) {
    return; // dato heredado inválido: no rompe la explosión, se omite
  }

  const price = parseMoney(component.unitPrice);
  if (price === null || price < BigInt(0)) {
    return;
  }
  const costMicro = lineTotal(finalQuantity, component.unitPrice);

  const key = stableKey(component);
  const existing = map.get(key);
  if (existing) {
    existing.micro += parseMoney(finalQuantity) ?? BigInt(0);
    existing.costMicro += costMicro;
    map.set(key, existing);
    return;
  }

  map.set(key, {
    micro: parseMoney(finalQuantity) ?? BigInt(0),
    costMicro,
    unitPrice: component.unitPrice,
    first: {
      itemId: component.itemId,
      code: component.code,
      name: component.name,
      unit: component.unit,
      category: component.category,
      quantity: finalQuantity,
      unitPrice: component.unitPrice,
      estimatedCost: moneyToString(costMicro),
    },
  });
}

/* ------------------------------------------------------------------ */
/* Carga de composición vigente (Prioridad 2, sin N+1)                 */
/* ------------------------------------------------------------------ */

type LiveCompositionRow = {
  activityId: string;
  item: {
    id: string;
    tenantId: string;
    code: string | null;
    name: string;
    unit: string;
    category: ApuItemCategoryValue;
    unitPrice: string;
  } | null;
  consumption: string;
  wastePercent: string;
};

/**
 * Lee la composición APU vigente de varias actividades en DOS consultas
 * (una para validar pertenencia al tenant, otra para las composiciones
 * con su insumo). Devuelve mapa activityId → componentes.
 */
async function loadLiveCompositions(
  tenantId: string,
  activityIds: string[],
): Promise<Map<string, ComponentSource[]>> {
  const uniqueIds = [...new Set(activityIds)];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const validActivities = await db.orm.public.ApuActivity.where({ tenantId })
    .where((activity) => activity.id.in(uniqueIds))
    .select("id")
    .all();
  if (validActivities.length === 0) {
    return new Map();
  }
  const validSet = new Set(validActivities.map((row) => row.id));

  const compositions = (await db.orm.public.ApuActivityComposition.where(
    (composition) => composition.activityId.in([...validSet]),
  )
    .include("item", (item) =>
      item.select(
        "id",
        "tenantId",
        "code",
        "name",
        "unit",
        "category",
        "unitPrice",
      ),
    )
    .all()) as unknown as LiveCompositionRow[];

  const map = new Map<string, ComponentSource[]>();
  for (const composition of compositions) {
    // Defensa en profundidad: un insumo de OUTRO tenant jamás entra.
    if (!composition.item || composition.item.tenantId !== tenantId) {
      continue;
    }
    const components = map.get(composition.activityId) ?? [];
    components.push({
      itemId: composition.item.id,
      code: composition.item.code,
      name: composition.item.name,
      unit: composition.item.unit,
      category: composition.item.category,
      unitPrice: String(composition.item.unitPrice),
      consumption: String(composition.consumption),
      wastePercent: String(composition.wastePercent),
    });
    map.set(composition.activityId, components);
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Motor principal                                                     */
/* ------------------------------------------------------------------ */

/**
 * Calcula la explosión de insumos de un presupuesto.
 *
 * Devuelve `null` cuando el presupuesto no existe o no pertenece al tenant
 * (el caller responde 404). Si el presupuesto existe pero no hay APU
 * disponible, devuelve un resultado con todos los grupos vacíos.
 */
export async function calculateInsumosExplosion({
  tenantId,
  quoteId,
}: CalculateInsumosExplosionInput): Promise<InsumosExplosion | null> {
  const quote = await db.orm.public.Quote.where({ id: quoteId, tenantId })
    .select("id", "code", "title")
    .first();
  if (!quote) {
    return null;
  }

  const quoteItems = await db.orm.public.QuoteItem.where({ quoteId }).all();

  const snapshotItems: typeof quoteItems = [];
  const fallbackActivityIds: string[] = [];
  for (const item of quoteItems) {
    const snapshot = (item.apuSnapshot as ApuSnapshot | null) ?? null;
    if (
      snapshot &&
      Array.isArray(snapshot.components) &&
      snapshot.components.length > 0
    ) {
      snapshotItems.push(item);
    } else if (item.activityId) {
      fallbackActivityIds.push(item.activityId);
    }
  }

  const live = await loadLiveCompositions(tenantId, fallbackActivityIds);

  const accumulator = new Map<string, Accumulated>();
  const snapshotUsed = snapshotItems.length > 0;
  let catalogUsed = false;

  // Prioridad 1: snapshot inmutable al cotizar.
  for (const item of snapshotItems) {
    const snapshot = (item.apuSnapshot as ApuSnapshot) ?? null;
    if (!snapshot || !Array.isArray(snapshot.components)) {
      continue;
    }
    const quantity = String(item.quantity);
    for (const component of snapshot.components) {
      pushContribution(
        accumulator,
        {
          itemId: component.itemId ?? null,
          code: component.code ?? null,
          name: component.name,
          unit: component.unit,
          category: component.category,
          unitPrice: component.unitPrice,
          consumption: component.consumption,
          wastePercent: component.wastePercent,
        },
        quantity,
      );
    }
  }

  // Prioridad 2: composición APU vigente (solo líneas sin snapshot).
  for (const item of quoteItems) {
    if (!item.activityId || !live.has(item.activityId)) {
      continue;
    }
    const components = live.get(item.activityId);
    if (!components || components.length === 0) {
      continue;
    }
    catalogUsed = true;
    const quantity = String(item.quantity);
    for (const component of components) {
      pushContribution(accumulator, component, quantity);
    }
  }

  // Consolidación por categoría + totales.
  const byCategory = (
    predicate: (category: ApuItemCategoryValue) => boolean,
  ): ExplosionResource[] => {
    const rows: ExplosionResource[] = [];
    for (const accumulated of accumulator.values()) {
      const { first } = accumulated;
      if (!predicate(first.category)) {
        continue;
      }
      rows.push({
        ...first,
        quantity: moneyToString(accumulated.micro),
        estimatedCost: moneyToString(accumulated.costMicro),
      });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
  };

  const materials = byCategory((category) => category === "MATERIAL");
  const labor = byCategory((category) => category === "MANO_DE_OBRA");
  const equipment = byCategory((category) => category === "EQUIPO");
  const transport = byCategory((category) => category === "TRANSPORTE");

  const sumCost = (rows: ExplosionResource[]): string => {
    let total = BigInt(0);
    for (const row of rows) {
      total += parseMoney(row.estimatedCost) ?? BigInt(0);
    }
    return moneyToString(total);
  };

  const materialsCost = sumCost(materials);
  const laborCost = sumCost(labor);
  const equipmentCost = sumCost(equipment);
  const transportCost = sumCost(transport);

  const allRows = [
    ...materials,
    ...labor,
    ...equipment,
    ...transport,
  ];
  let globalMicro = BigInt(0);
  for (const row of allRows) {
    globalMicro += parseMoney(row.estimatedCost) ?? BigInt(0);
  }
  const globalCost = moneyToString(globalMicro);

  const source: InsumosExplosion["source"] =
    snapshotUsed && catalogUsed
      ? "mixed"
      : snapshotUsed
        ? "snapshot"
        : "catalog";

  return {
    quote: {
      id: quote.id,
      code: quote.code,
      title: quote.title,
    },
    source,
    materials,
    labor,
    equipment,
    transport,
    totals: {
      materials: materialsCost,
      labor: laborCost,
      equipment: equipmentCost,
      transport: transportCost,
      global: globalCost,
    },
  };
}

/** Número total de recursos distintos en la explosión. */
export function explosionResourceCount(explosion: InsumosExplosion): number {
  return (
    explosion.materials.length +
    explosion.labor.length +
    explosion.equipment.length +
    explosion.transport.length
  );
}