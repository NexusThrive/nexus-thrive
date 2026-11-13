/**
 * Completa la demo de Northline Market con lo que falta para que se vea «llena»:
 * atributos de producto, terminales y ventas de punto de venta, cotizaciones
 * comerciales, cobros en línea (intenciones, intentos, liquidaciones) y más
 * oportunidades en el CRM.
 *
 *   SEED_DATABASE_URL="postgresql://…" node scripts/presentacion/seed-extra.mjs \
 *     --tenant northline-market --yes
 *
 * No borra nada: solo agrega. Si una sección ya tiene datos, la salta.
 */
import { Pool } from "pg";
import crypto from "node:crypto";

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? true) : fallback;
};
const flag = (name) => argv.includes(`--${name}`);
const TENANT_LOOKUP = String(arg("tenant", "northline-market"));
const DRY = flag("dry-run");
const URL = process.env.SEED_DATABASE_URL;
if (!URL) {
  console.error("Falta SEED_DATABASE_URL.");
  process.exit(1);
}
if (!flag("yes") && !DRY) {
  console.error("Falta --yes. Usa --dry-run para probar sin guardar.");
  process.exit(1);
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261111);
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickMany = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
};
const chance = (p) => rnd() < p;
const money = (n) => Math.round(n * 100) / 100;
const uuid = () => crypto.randomUUID();
const day = 86_400_000;
const NOW = Date.now();
const daysAgo = (n) => new Date(NOW - n * day);
const at = (msAgo) => new Date(NOW - msAgo);
const isoDate = (d) => d.toISOString().slice(0, 10);
const seq = (n) => String(n).padStart(4, "0");
const ref = () => `nm${crypto.randomBytes(7).toString("hex")}`;

const pool = new Pool({ connectionString: URL, max: 4 });
const client = await pool.connect();
const counts = {};
const bump = (t, n) => (counts[t] = (counts[t] ?? 0) + n);

async function insert(table, rows) {
  if (!rows || rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const CHUNK = Math.max(1, Math.floor(3000 / cols.length));
  for (let start = 0; start < rows.length; start += CHUNK) {
    const slice = rows.slice(start, start + CHUNK);
    const values = [];
    const params = [];
    let p = 1;
    for (const row of slice) {
      values.push(`(${cols.map(() => `$${p++}`).join(",")})`);
      for (const c of cols) params.push(row[c] ?? null);
    }
    await client.query(
      `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES ${values.join(",")}`,
      params,
    );
  }
  bump(table, rows.length);
}

const t = (await client.query(`SELECT * FROM "Tenant" WHERE slug=$1 OR name=$1 OR id=$1 LIMIT 1`, [TENANT_LOOKUP])).rows[0];
if (!t) {
  console.error(`No encontré el negocio «${TENANT_LOOKUP}».`);
  process.exit(1);
}
const T = t.id;
console.log(`Negocio: ${t.name} (${t.slug}) · ${T}`);

const products = (await client.query(`SELECT id, name, price, cost, sku, category FROM "Product" WHERE "tenantId"=$1 AND active=true ORDER BY name`, [T])).rows;
const customers = (await client.query(`SELECT id, name, email, phone, city FROM "Customer" WHERE "tenantId"=$1 AND active=true ORDER BY name`, [T])).rows;
const staff = (await client.query(`SELECT id, name, email, role FROM "User" WHERE "tenantId"=$1 AND active=true ORDER BY "createdAt"`, [T])).rows;
const staffId = (i = 0) => staff[i % staff.length]?.id ?? null;
if (!products.length || !customers.length) {
  console.error("El negocio no tiene catálogo o clientes. Corre primero seed-demo.mjs.");
  process.exit(1);
}

await client.query("BEGIN");
try {
  // ─────────────────────────── atributos de producto ───────────────────────────
  const attrCount = Number((await client.query(`SELECT count(*)::int AS n FROM "ProductAttribute" WHERE "tenantId"=$1`, [T])).rows[0].n);
  if (attrCount === 0) {
    const attrs = [
      { name: "Color", display: "COLOR", variantMode: "ALWAYS", values: [["Negro", "#111111"], ["Blanco", "#FFFFFF"], ["Gris", "#9CA3AF"], ["Azul", "#1D4ED8"], ["Verde", "#15803D"], ["Beige", "#D6C7A1"], ["Rosado", "#EC4899"], ["Café", "#7C4A2D"]] },
      { name: "Talla", display: "BUTTONS", variantMode: "ALWAYS", values: [["XS", null], ["S", null], ["M", null], ["L", null], ["XL", null], ["XXL", null]] },
      { name: "Material", display: "SELECT", variantMode: "ALWAYS", values: [["Algodón", null], ["Poliéster", null], ["Cuero", null], ["Madera", null], ["Acero inoxidable", null], ["Vidrio", null]] },
      { name: "Capacidad", display: "SELECT", variantMode: "ALWAYS", values: [["500 ml", null], ["750 ml", null], ["1 L", null], ["1.5 L", null], ["2 L", null]] },
      { name: "Acabado", display: "SELECT", variantMode: "NEVER", values: [["Mate", null], ["Brillante", null], ["Satinado", null]] },
    ];
    const attrRows = [];
    const valueRows = [];
    const valueIds = {};
    for (const [position, a] of attrs.entries()) {
      const id = uuid();
      attrRows.push({ id, tenantId: T, name: a.name, display: a.display, variantMode: a.variantMode, position, createdAt: daysAgo(200) });
      valueIds[a.name] = [];
      for (const [vp, [name, hex]] of a.values.entries()) {
        const vid = uuid();
        valueRows.push({ id: vid, tenantId: T, attributeId: id, name, colorHex: hex, position: vp });
        valueIds[a.name].push(vid);
      }
    }
    await insert("ProductAttribute", attrRows);
    await insert("ProductAttributeValue", valueRows);

    const byName = (n) => valueIds[n];
    const lines = [];
    const pickValues = (attr, n) => pickMany(byName(attr), n);
    for (const p of products) {
      const n = p.name.toLowerCase();
      if (/cobija|coj[ií]n|s[aá]bana|toalla|cortina|alfombra|matera|bolso|mochila|gorra|bufanda|paraguas|neceser|billetera|tenis|cama|arn[eé]s|correa|rascador|chaleco/.test(n)) {
        lines.push({ id: uuid(), tenantId: T, productId: p.id, attributeId: attrRows[0].id, valueIds: pickValues("Color", int(2, 4)) });
      }
      if (/tenis|camis|chaleco|guante|bufanda|gorra|s[aá]bana|toalla|coj[ií]n/.test(n)) {
        lines.push({ id: uuid(), tenantId: T, productId: p.id, attributeId: attrRows[1].id, valueIds: pickValues("Talla", int(2, 4)) });
      }
      if (/mesa|silla|sof[aá]|madera|tabla|cama|organizador|espejo|reloj|matera/.test(n)) {
        lines.push({ id: uuid(), tenantId: T, productId: p.id, attributeId: attrRows[2].id, valueIds: pickValues("Material", int(1, 3)) });
      }
      if (/termo|botella|licuadora|cafetera|air fryer|fuente|difusor|recipiente|olla/.test(n)) {
        lines.push({ id: uuid(), tenantId: T, productId: p.id, attributeId: attrRows[3].id, valueIds: pickValues("Capacidad", int(1, 3)) });
      }
      if (/aud[ií]fonos|parlante|smartwatch|cargador|teclado|mouse|hub|webcam|base|soporte|l[aá]mpara/.test(n)) {
        lines.push({ id: uuid(), tenantId: T, productId: p.id, attributeId: attrRows[4].id, valueIds: pickValues("Acabado", int(1, 2)) });
      }
    }
    await insert("ProductAttributeLine", lines);

    // Variantes para productos que aún no tienen: una por combinación (máx. 12).
    const existing = new Set(
      (await client.query(`SELECT DISTINCT "productId" FROM "ProductVariant" WHERE "tenantId"=$1`, [T])).rows.map((r) => r.productId),
    );
    const valueName = new Map(valueRows.map((v) => [v.id, v.name]));
    const byProduct = new Map();
    for (const l of lines) byProduct.set(l.productId, [...(byProduct.get(l.productId) ?? []), l]);
    const newVariants = [];
    for (const [productId, plines] of byProduct) {
      if (existing.has(productId)) continue;
      const product = products.find((p) => p.id === productId);
      const combos = [];
      const walk = (idx, acc) => {
        if (combos.length >= 12) return;
        if (idx === plines.length) {
          if (acc.length) combos.push([...acc]);
          return;
        }
        for (const vid of plines[idx].valueIds) walk(idx + 1, [...acc, vid]);
      };
      walk(0, []);
      for (const combo of combos) {
        const label = combo.map((v) => valueName.get(v)).join(" · ");
        newVariants.push({
          id: uuid(), tenantId: T, productId, name: label, sku: `${product.sku}-${combo.length}-${int(100, 999)}`,
          price: money(Number(product.price)), cost: money(Number(product.cost)), attributes: JSON.stringify(Object.fromEntries(combo.map((v) => [valueName.get(v), true]))),
          active: true, createdAt: daysAgo(int(30, 120)), updatedAt: daysAgo(int(0, 5)),
        });
      }
    }
    await insert("ProductVariant", newVariants);
  }

  // ─────────────────────────── punto de venta ───────────────────────────
  const termCount = Number((await client.query(`SELECT count(*)::int AS n FROM "PosTerminal" WHERE "tenantId"=$1`, [T])).rows[0].n);
  if (termCount === 0) {
    const warehouses = (await client.query(`SELECT id, name FROM "Warehouse" WHERE "tenantId"=$1 ORDER BY "isDefault" DESC`, [T])).rows;
    const wh = warehouses[0]?.id ?? null;
    const terminals = [];
    const boxes = [];
    for (const [i, name] of ["Caja Principal", "Caja Tienda Centro"].entries()) {
      const boxId = uuid();
      boxes.push({ id: boxId, tenantId: T, name: `Caja · ${name}`, fundAmount: money(i === 0 ? 500000 : 300000), responsibleUserId: staffId(5 + i), active: true, createdAt: daysAgo(180), updatedAt: daysAgo(1) });
      terminals.push({ id: uuid(), tenantId: T, name, boxId, warehouseId: warehouses[i]?.id ?? wh, active: true, createdAt: daysAgo(180) });
    }
    await insert("CashBox", boxes);
    await insert("PosTerminal", terminals);

    const cashiers = staff.filter((u) => ["STAFF", "ADMIN", "RECEPTION"].includes(u.role));
    const sessions = [];
    const movements = [];
    for (let i = 0; i < 42; i++) {
      const term = terminals[i % terminals.length];
      const box = boxes[i % boxes.length];
      const opened = daysAgo(int(1, 55));
      const opening = int(150000, 400000);
      const expected = opening + int(250000, 2400000);
      const counted = expected + int(-12000, 12000);
      const sessionId = uuid();
      sessions.push({
        id: sessionId, tenantId: T, boxId: box.id, terminalId: term.id, openedById: pick(cashiers).id,
        openedAt: opened, openingAmount: opening, closedAt: new Date(opened.getTime() + 9 * 3600_000),
        closedById: pick(cashiers).id, countedAmount: counted, expectedAmount: expected,
        difference: counted - expected, closingNotes: pick(["Cierre sin novedades", "Cuadre con diferencia mínima", "Se dejó base para el próximo turno"]),
      });
      movements.push({ id: uuid(), tenantId: T, sessionId, kind: "OPENING", amount: opening, description: "Apertura de turno", beneficiary: null, createdById: sessions.at(-1).openedById, expenseId: null, paymentId: null, createdAt: opened });
      movements.push({ id: uuid(), tenantId: T, sessionId, kind: "INCOME", amount: int(100000, 800000), description: "Ventas del turno", beneficiary: null, createdById: sessions.at(-1).openedById, expenseId: null, paymentId: null, createdAt: new Date(opened.getTime() + 5 * 3600_000) });
    }
    const openSession = uuid();
    sessions.push({
      id: openSession, tenantId: T, boxId: boxes[0].id, terminalId: terminals[0].id, openedById: staffId(5),
      openedAt: at(2 * 3600_000), openingAmount: 300000, closedAt: null, closedById: null,
      countedAmount: null, expectedAmount: null, difference: null, closingNotes: null,
    });
    await insert("CashSession", sessions);
    await insert("CashMovement", movements);

    const closed = sessions.filter((s) => s.closedAt);
    const maxInvoice = Number((await client.query(`SELECT COALESCE(max(number),0)::int AS n FROM "Invoice" WHERE "tenantId"=$1 AND kind='SALE'`, [T])).rows[0].n);
    const maxReceipt = Number((await client.query(`SELECT COALESCE(max("receiptNumber"),0)::int AS n FROM "Payment" WHERE "tenantId"=$1`, [T])).rows[0].n);
    const invoices = [];
    const invoiceLines = [];
    const payments = [];
    let invNumber = Math.max(maxInvoice, 9000);
    let receipt = maxReceipt;
    const METHODS = [
      { provider: "CASH", label: "Efectivo" },
      { provider: "TRANSFER", label: "Transferencia" },
      { provider: "WOMPI", label: "Tarjeta" },
      { provider: "NEQUI", label: "Nequi" },
    ];
    for (let i = 0; i < 220; i++) {
      const session = pick(closed);
      const terminal = terminals.find((x) => x.id === session.terminalId) ?? terminals[0];
      const createdAt = new Date(session.openedAt.getTime() + int(1, 8) * 3600_000);
      const lines = pickMany(products, int(1, 5));
      const invId = uuid();
      let subtotal = 0;
      for (const p of lines) {
        const qty = int(1, 3);
        const unit = money(Number(p.price));
        const total = money(unit * qty);
        subtotal += total;
        invoiceLines.push({ id: uuid(), invoiceId: invId, productId: p.id, description: p.name, quantity: qty, unitPrice: unit, discountPct: chance(0.12) ? int(5, 10) : 0, taxRatePct: 19, total });
      }
      const tax = money(subtotal * 0.19);
      const total = money(subtotal + tax);
      invNumber += 1;
      invoices.push({
        id: invId, tenantId: T, kind: "SALE", number: invNumber, prefix: "POS", customerId: chance(0.35) ? pick(customers).id : null,
        customerName: "Cliente de mostrador", customerDoc: null, issueDate: createdAt, dueDate: null,
        subtotal: money(subtotal), discountTotal: 0, taxTotal: tax, tipTotal: chance(0.2) ? int(2000, 12000) : 0, withholdingTotal: 0,
        total, paidTotal: total, status: "PAID", notes: null, createdById: session.openedById,
        originType: "POS", originId: terminal.id, sourceDocumentId: null, projectId: null, resolutionId: null, paymentId: null,
        withholdings: null, voidReason: null, createdAt, updatedAt: createdAt,
      });
      const parts = chance(0.15) ? 2 : 1;
      let left = total;
      for (let part = 0; part < parts; part++) {
        const amount = part === parts - 1 ? left : money(left * 0.5);
        left = money(left - amount);
        const method = pick(METHODS);
        receipt += 1;
        payments.push({
          id: uuid(), tenantId: T, customerId: null, invoiceId: invId, amount, status: "APPROVED", provider: method.provider,
          receiptNumber: receipt, providerRefId: `pos:demo:${uuid()}`, sourceType: "POS", sourceId: invId,
          description: `Venta POS ${terminal.name}`, notes: method.label, cashSessionId: method.provider === "CASH" ? session.id : null,
          membershipId: null, voidedAt: null, voidReason: null, createdAt, updatedAt: createdAt,
        });
      }
    }
    await insert("Invoice", invoices);
    await insert("InvoiceLine", invoiceLines);
    await insert("Payment", payments);
  }

  // ─────────────────────────── cotizaciones comerciales ───────────────────────────
  const sqCount = Number((await client.query(`SELECT count(*)::int AS n FROM "SalesQuote" WHERE "tenantId"=$1`, [T])).rows[0].n);
  if (sqCount === 0) {
    const TITLES = ["Dotación de oficina", "Regalo corporativo de fin de año", "Kit de bienvenida para nuevos empleados", "Amoblamiento de sala de juntas", "Reposición de menaje", "Decoración de recepción", "Equipos para trabajo remoto", "Insumos para cafetería", "Adecuación de showroom", "Detalles para evento"];
    const STATUSES = ["DRAFT", "DRAFT", "SENT", "SENT", "SENT", "APPROVED", "APPROVED", "REJECTED", "SUPERSEDED"];
    const quotes = [];
    const lines = [];
    for (let i = 0; i < 52; i++) {
      const qId = uuid();
      const customer = pick(customers);
      const chosen = pickMany(products, int(2, 6));
      let subtotal = 0;
      for (const p of chosen) {
        const qty = int(2, 24);
        const unit = money(Number(p.price) * (chance(0.5) ? 0.95 : 1));
        const taxRatePct = 19;
        const lineTotal = money(qty * unit);
        subtotal += lineTotal;
        lines.push({ id: uuid(), tenantId: T, quoteId: qId, productId: p.id, name: p.name, quantity: qty, unitPrice: unit, taxRatePct });
      }
      const taxTotal = money(subtotal * 0.19);
      const total = money(subtotal + taxTotal);
      const status = pick(STATUSES);
      const createdAt = daysAgo(int(0, 90));
      quotes.push({
        id: qId, tenantId: T, number: i + 1, customerId: customer.id, title: pick(TITLES), status,
        depositPct: pick([0, 30, 50, 50, 100]), validUntil: isoDate(daysAgo(-int(5, 40))),
        notes: pick(["Precios sujetos a disponibilidad.", "Incluye entrega en Bogotá.", "Descuento válido por volumen.", "Tiempo de entrega: 5 días hábiles."]),
        subtotal: money(subtotal), taxTotal, total,
        sentAt: status === "DRAFT" ? null : createdAt, decidedAt: ["APPROVED", "REJECTED", "SUPERSEDED"].includes(status) ? new Date(createdAt.getTime() + int(1, 10) * day) : null,
        decidedByName: ["APPROVED", "REJECTED", "SUPERSEDED"].includes(status) ? pick(customers).name : null,
        decisionNote: status === "REJECTED" ? pick(["El cliente eligió otra opción.", "El presupuesto quedó por encima.", "Se pospuso la compra."]) : null,
        orderId: null, createdById: staffId(int(0, staff.length - 1)), createdAt, updatedAt: daysAgo(int(0, 5)),
      });
    }
    await insert("SalesQuote", quotes);
    await insert("SalesQuoteLine", lines);
  }

  // ─────────────────────────── cobros en línea ───────────────────────────
  const piCount = Number((await client.query(`SELECT count(*)::int AS n FROM "PaymentIntent" WHERE "tenantId"=$1`, [T])).rows[0].n);
  if (piCount === 0) {
    const accounts = (await client.query(`SELECT id, provider FROM "FinancialAccount" WHERE "tenantId"=$1 AND kind IN ('GATEWAY','WALLET')`, [T])).rows;
    const bills = (await client.query(`SELECT id, total, "paidTotal", "customerName" FROM "Invoice" WHERE "tenantId"=$1 AND kind='BILL' AND status='ISSUED' LIMIT 30`, [T])).rows;
    const intents = [];
    const attempts = [];
    const refunds = [];
    const settlements = [];
    const DESCRIPTIONS = ["Anticipo pedido de oficina", "Saldo cotización COT-0012", "Abono kit corporativo", "Pago pedido en línea", "Cuota inicial mobiliario", "Saldo cuenta de cobro", "Reserva de producto", "Pago de domicilio y empaque"];
    const STATUSES = ["PENDING", "PENDING", "PENDING", "PAID", "PAID", "PAID", "PAID", "EXPIRED", "REJECTED"];
    for (let i = 0; i < 48; i++) {
      const account = pick(accounts);
      const provider = account?.provider ?? "wompi";
      const status = pick(STATUSES);
      const createdAt = daysAgo(int(0, 45));
      const amount = int(180000, 6800000);
      const feePct = provider === "nequi" ? 1.5 : 2.95;
      const fee = money(amount * (feePct / 100) + (provider === "nequi" ? 0 : 900));
      const bill = chance(0.4) ? pick(bills) : null;
      const paidAt = status === "PAID" ? new Date(createdAt.getTime() + int(1, 30) * 3600_000) : null;
      const id = uuid();
      intents.push({
        id, tenantId: T, reference: ref(), amount: money(bill ? Math.min(amount, Number(bill.total)) : amount),
        description: bill ? `Saldo ${bill["customerName"]}` : pick(DESCRIPTIONS), status,
        channel: pick(["LINK", "LINK", "QR"]), provider, customerId: bill ? null : pick(customers).id,
        invoiceId: bill?.id ?? null, expiresAt: new Date(createdAt.getTime() + 48 * 3600_000), paidAt,
        confirmedBy: status === "PAID" ? "webhook" : null,
        evidence: null, proofNote: status === "PENDING" && chance(0.4) ? pick(["Transferí desde Bancolombia, adjunto comprobante.", "Pago realizado por Nequi.", "Ya hice la consignación."]) : null,
        proofAt: status === "PENDING" && chance(0.4) ? new Date(createdAt.getTime() + int(1, 10) * 3600_000) : null,
        rejectionReason: status === "REJECTED" ? pick(["El comprobante no coincide con el valor.", "Pago no encontrado en el extracto."]) : null,
        feeEstimated: status === "PAID" ? fee : null, netExpected: status === "PAID" ? money(amount - fee) : null,
        financialAccountId: account?.id ?? null, settlementId: null, providerRefId: status === "PAID" ? `wompi_${crypto.randomBytes(6).toString("hex")}` : null,
        paymentId: null, refundedTotal: 0, createdById: staffId(int(0, staff.length - 1)), createdAt,
      });
      if (status === "REJECTED") {
        for (let a = 0; a < int(1, 3); a++) {
          attempts.push({ id: uuid(), tenantId: T, intentId: id, provider, externalId: `att_${crypto.randomBytes(6).toString("hex")}`, result: pick(["DECLINED", "ERROR"]), amount: money(amount), createdAt: new Date(createdAt.getTime() + a * 600_000) });
        }
      }
      if (status === "PAID" && chance(0.12)) {
        const refundAmount = money(amount * pick([0.5, 1]));
        refunds.push({ id: uuid(), tenantId: T, intentId: id, amount: refundAmount, reason: pick(["El cliente canceló el pedido.", "Devolución parcial acordada.", "Cobro duplicado."]), createdById: staffId(0), createdAt: new Date(paidAt.getTime() + int(1, 5) * day) });
        intents.at(-1).refundedTotal = refundAmount;
        intents.at(-1).status = "PAID";
      }
    }
    for (let i = 0; i < 8; i++) {
      const gross = int(800000, 9500000);
      const fee = money(gross * 0.0295 + 900);
      settlements.push({
        id: uuid(), tenantId: T, provider: pick(["wompi", "wompi", "nequi"]), externalRef: `set_${crypto.randomBytes(7).toString("hex")}`,
        day: isoDate(daysAgo(int(1, 40))), gross: money(gross), feeEstimated: fee, feeReal: money(fee + int(-3000, 3000)),
        netReceived: money(gross - fee), difference: int(-3000, 3000), itemCount: int(3, 25), accounted: chance(0.6),
        createdById: staffId(0), createdAt: daysAgo(int(1, 40)),
      });
    }
    await insert("PaymentIntent", intents);
    await insert("PaymentAttempt", attempts);
    await insert("PaymentRefund", refunds);
    await insert("ProviderSettlement", settlements);
  }

  // ─────────────────────────── CRM: más oportunidades ───────────────────────────
  const oppCount = Number((await client.query(`SELECT count(*)::int AS n FROM "Opportunity" WHERE "tenantId"=$1`, [T])).rows[0].n);
  if (oppCount < 120) {
    const stages = (await client.query(`SELECT id, name, probability, "isWon" FROM "CrmStage" WHERE "tenantId"=$1 ORDER BY position`, [T])).rows;
    const tags = (await client.query(`SELECT name FROM "CrmTag" WHERE "tenantId"=$1`, [T])).rows.map((r) => r.name);
    const INTERESTS = ["Dotación de oficina", "Regalo corporativo", "Remodelación de sala", "Kit de bienvenida", "Equipos de cómputo", "Decoración de temporada", "Reposición de inventario", "Mobiliario para cafetería", "Adecuación de Airbnb", "Insumos para restaurante", "Detalles para matrimonio", "Ambientación de oficina"];
    const SOURCES = ["WEB", "WHATSAPP", "REFERIDO", "INSTAGRAM", "TIENDA", "GOOGLE", "FERIA"];
    const ACTIONS = ["Llamar para seguimiento", "Enviar cotización", "Agendar visita", "Confirmar forma de pago", "Enviar catálogo actualizado", "Presentar propuesta", "Coordinar muestra"];
    const opps = [];
    const events = [];
    const tasks = [];
    const need = 130 - oppCount;
    for (let i = 0; i < need; i++) {
      const customer = pick(customers);
      const stage = pick(stages);
      const id = uuid();
      const createdAt = daysAgo(int(1, 160));
      const value = int(280000, 24000000);
      const status = stage.isWon ? "WON" : stage.name === "Perdido" ? "LOST" : "OPEN";
      opps.push({
        id, tenantId: T, customerId: customer.id, leadId: null,
        stage: status, stageId: stage.id, status, position: oppCount + i, priority: int(0, 2), probability: stage.probability,
        interest: pick(INTERESTS), description: pick(["Cliente pide cotización formal.", "Solicita muestras antes de decidir.", "Compra recurrente mensual.", "Proyecto con fecha de entrega en diciembre.", "Necesita aprobación de gerencia.", "Compara con otra proveedor.", "Quiere factura a 30 días."]),
        estimatedValue: money(value), ownerId: staffId(int(0, staff.length - 1)), source: pick(SOURCES),
        expectedClose: isoDate(daysAgo(-int(3, 60))), nextAction: status === "OPEN" ? pick(ACTIONS) : null,
        nextActionAt: status === "OPEN" ? daysAgo(-int(0, 12)) : null, tags: pickMany(tags, int(0, 2)), teamId: null, orderId: null,
        lostReason: status === "LOST" ? pick(["Precio", "Eligió a la competencia", "Sin respuesta"]) : null,
        closedAt: status === "OPEN" ? null : daysAgo(int(1, 40)), stageSince: createdAt, createdAt, updatedAt: daysAgo(int(0, 8)),
      });
      events.push({ id: uuid(), tenantId: T, opportunityId: id, kind: "CREATED", authorId: staffId(2), data: JSON.stringify({ stage: "Nuevo" }), createdAt });
      if (chance(0.65)) events.push({ id: uuid(), tenantId: T, opportunityId: id, kind: "STAGE_CHANGED", authorId: staffId(2), data: JSON.stringify({ from: "Nuevo", to: stage.name }), createdAt: daysAgo(int(0, 50)) });
      if (chance(0.45)) events.push({ id: uuid(), tenantId: T, opportunityId: id, kind: "NOTE", authorId: staffId(2), data: JSON.stringify({ body: pick(["Cliente confirmó interés.", "Pidió descuento por volumen.", "Se envió propuesta por correo.", "Quedó de responder el lunes.", "Se agendó visita a la oficina."]) }), createdAt: daysAgo(int(0, 25)) });
      if (chance(0.6)) {
        const done = chance(0.4);
        const due = daysAgo(int(-10, 20));
        tasks.push({
          id: uuid(), tenantId: T, title: pick(ACTIONS), notes: chance(0.4) ? "Coordinar con el cliente por WhatsApp." : null,
          status: done ? "DONE" : "OPEN", kind: pick(["CALL", "EMAIL", "MEETING", "TASK"]), dueAt: due, dueDay: isoDate(due),
          assigneeId: staffId(int(0, staff.length - 1)), createdById: staffId(int(0, staff.length - 1)),
          customerId: customer.id, opportunityId: id, projectId: null, doneAt: done ? daysAgo(int(0, 15)) : null,
          doneById: done ? staffId(int(0, staff.length - 1)) : null, createdAt: daysAgo(int(0, 60)),
        });
      }
    }
    await insert("Opportunity", opps);
    await insert("OpportunityEvent", events);
    await insert("Task", tasks);
  }

  // ─────────────────────────── medios de pago del negocio ───────────────────────────
  const pmCount = Number((await client.query(`SELECT count(*)::int AS n FROM "PaymentMethodSetting" WHERE "tenantId"=$1`, [T])).rows[0].n);
  if (pmCount === 0) {
    const methods = [
      { kind: "CASH", name: "Efectivo", instructions: null },
      { kind: "TRANSFER", name: "Transferencia Bancolombia", instructions: "Cuenta de ahorros 123-456789-01 · Northline Market SAS" },
      { kind: "TRANSFER", name: "Nequi", instructions: "Envía el pago al 300 123 4567 y adjunta el comprobante." },
      { kind: "TRANSFER", name: "Tarjeta débito/crédito", instructions: "Pago con datáfono en tienda." },
      { kind: "TRANSFER", name: "Daviplata", instructions: "Pago por Daviplata al 300 123 4567." },
      { kind: "CREDIT", name: "Crédito 30 días", instructions: "Sujeto a aprobación de cupo." },
    ];
    await insert(
      "PaymentMethodSetting",
      methods.map((m, position) => ({ id: uuid(), tenantId: T, kind: m.kind, name: m.name, instructions: m.instructions, active: true, position, createdAt: daysAgo(180), updatedAt: daysAgo(10) })),
    );
  }

  // ─────────────────────────── turno abierto del dueño ───────────────────────────
  const owner = (await client.query(`SELECT id FROM "User" WHERE "tenantId"=$1 AND role='OWNER' AND active=true ORDER BY "createdAt" LIMIT 1`, [T])).rows[0];
  if (owner) {
    const mine = await client.query(`SELECT 1 FROM "CashSession" WHERE "tenantId"=$1 AND "openedById"=$2 AND "closedAt" IS NULL AND "terminalId" IS NOT NULL LIMIT 1`, [T, owner.id]);
    if (mine.rowCount === 0) {
      const free = await client.query(
        `SELECT t.id, t.name, t."boxId" FROM "PosTerminal" t
          WHERE t."tenantId"=$1 AND t.active=true
            AND NOT EXISTS (SELECT 1 FROM "CashSession" s WHERE s."terminalId"=t.id AND s."closedAt" IS NULL)
          ORDER BY t."createdAt" LIMIT 1`,
        [T],
      );
      const terminal = free.rows[0];
      if (terminal) {
        const opened = at(90 * 60_000);
        const sessionId = uuid();
        await insert("CashSession", [{
          id: sessionId, tenantId: T, boxId: terminal.boxId, terminalId: terminal.id, openedById: owner.id,
          openedAt: opened, openingAmount: 300000, closedAt: null, closedById: null,
          countedAmount: null, expectedAmount: null, difference: null, closingNotes: null,
        }]);
        await insert("CashMovement", [{
          id: uuid(), tenantId: T, sessionId, kind: "OPENING", amount: 300000, description: "Apertura de turno",
          beneficiary: null, createdById: owner.id, expenseId: null, paymentId: null, createdAt: opened,
        }]);
      }
    }
  }

  if (DRY) {
    await client.query("ROLLBACK");
    console.log("\nDRY-RUN: rollback hecho. Nada se guardó.");
  } else {
    await client.query("COMMIT");
    console.log("\nDatos adicionales sembrados y confirmados.");
  }
  console.log("\nFilas agregadas:");
  for (const [table, n] of Object.entries(counts).sort()) console.log(`  ${table.padEnd(24)} ${n}`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("\nError — se revirtió todo:", err.message);
  console.error(err.detail ?? "", err.hint ?? "");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
