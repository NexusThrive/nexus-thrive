/**
 * Siembra una demo grande y coherente en un negocio (tenant) existente.
 *
 *   SEED_DATABASE_URL="postgresql://…" node scripts/presentacion/seed-demo.mjs \
 *     --tenant northline-market --name "Northline Market" --slug northline-market --yes
 *
 *   --dry-run   hace todo dentro de una transacción y termina con ROLLBACK.
 *   --no-clear  no borra los datos previos del negocio.
 *
 * Determinista: misma semilla → mismos datos. Solo toca el tenant indicado.
 */
import { Pool } from "pg";
import crypto from "node:crypto";

// ─────────────────────────────── argumentos ───────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? true) : fallback;
};
const flag = (name) => argv.includes(`--${name}`);
const TENANT_LOOKUP = String(arg("tenant", "northline-market"));
const NEW_NAME = String(arg("name", "Northline Market"));
const NEW_SLUG = String(arg("slug", "northline-market"));
const DRY = flag("dry-run");
const CLEAR = !flag("no-clear");
const URL = process.env.SEED_DATABASE_URL;
if (!URL) {
  console.error("Falta SEED_DATABASE_URL.");
  process.exit(1);
}
if (!flag("yes") && !DRY) {
  console.error("Falta --yes para confirmar la escritura. Usa --dry-run para probar sin guardar.");
  process.exit(1);
}

// ─────────────────────────────── utilidades ───────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261110);
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
const at = (msAgo) => new Date(NOW - msAgo);
const daysAgo = (n) => at(n * day);
const isoDate = (d) => d.toISOString().slice(0, 10);
const seq = (n) => String(n).padStart(4, "0");

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

// ─────────────────────────────── datos base ───────────────────────────────
const FIRST = ["María","Juan","Camila","Andrés","Valentina","Santiago","Laura","Carlos","Daniela","Felipe","Isabella","Sebastián","Natalia","Julián","Paula","Diego","Manuela","Tomás","Sara","Alejandro","Carolina","Nicolás","Juliana","Esteban","Ana","Miguel","Gabriela","Ricardo","Sofía","Jorge","Luisa","Óscar","Mariana","David","Catalina","Fernando","Elena","Mauricio","Adriana","Iván","Verónica","Hernán","Patricia","Raúl","Claudia","Alberto","Liliana","Gonzalo","Mónica","Rodrigo"];
const LAST = ["García","Rodríguez","Martínez","López","Gómez","Díaz","Torres","Vargas","Ramírez","Castro","Ospina","Peña","Rojas","Moreno","Herrera","Jiménez","Mendoza","Cárdenas","Salazar","Guerrero","Rincón","Navarro","Suárez","Ortega","Arias","Cortés","Romero","Acosta","Molina","Vega","Pardo","Quintero","Restrepo","Zapata","Arango","Mejía","Osorio","Franco","Bermúdez","Pulido"];
const CITIES = ["Bogotá","Medellín","Cali","Barranquilla","Cartagena","Bucaramanga","Pereira","Manizales","Santa Marta","Ibagué","Villavicencio","Cúcuta","Pasto","Armenia","Neiva"];
const name = () => `${pick(FIRST)} ${pick(LAST)} ${pick(LAST)}`;
const phone = () => `3${int(0, 2) === 0 ? "10" : pick(["20", "15", "16", "18", "13", "05"])}${String(int(1000000, 9999999))}`;
const email = (n) => {
  const slug = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").split(" ").filter(Boolean);
  return `${slug[0]}.${slug[1] ?? "co"}${int(1, 99)}@${pick(["gmail.com", "hotmail.com", "outlook.com", "yahoo.es"])}`;
};
const doc = () => String(int(1000000000, 1999999999));

const CATEGORIES = [
  { name: "Tecnología", items: [["Audífonos Bluetooth Nova", 189900, 96000], ["Parlante portátil Pulse", 249900, 132000], ["Cargador rápido 65W", 89900, 41000], ["Power bank 20.000 mAh", 139900, 69000], ["Mouse inalámbrico Slim", 69900, 31000], ["Teclado mecánico Compact", 219900, 112000], ["Hub USB-C 7 en 1", 159900, 78000], ["Webcam Full HD Studio", 179900, 88000], ["Soporte laptop aluminio", 99900, 42000], ["Lámpara LED de escritorio", 74900, 32000], ["Smartwatch Active 2", 329900, 178000], ["Base de carga inalámbrica", 79900, 34000]] },
  { name: "Hogar", items: [["Juego de sábanas Queen", 159900, 72000], ["Cobija microfibra King", 189900, 88000], ["Set de toallas 4 piezas", 119900, 52000], ["Cortina blackout 2 paneles", 139900, 61000], ["Alfombra sala 160x230", 299900, 148000], ["Organizador de closet", 89900, 38000], ["Espejo de cuerpo entero", 249900, 118000], ["Cojín decorativo lino", 49900, 19000], ["Mesa auxiliar nórdica", 219900, 102000], ["Set 3 materas cerámica", 89900, 36000], ["Difusor de aromas 300 ml", 69900, 28000], ["Reloj de pared minimalista", 59900, 24000]] },
  { name: "Cocina", items: [["Juego de ollas antiadherente", 349900, 176000], ["Licuadora 1.5 L Turbo", 229900, 108000], ["Air fryer 5.5 L", 399900, 212000], ["Cafetera de goteo 12 tazas", 189900, 89000], ["Set de cuchillos 6 piezas", 149900, 64000], ["Tabla de picar bambú", 59900, 22000], ["Organizador de especias", 69900, 26000], ["Vajilla 16 piezas", 279900, 132000], ["Termo acero 750 ml", 79900, 31000], ["Batidora de mano", 139900, 62000], ["Set 5 recipientes hermetic", 99900, 41000], ["Sanduchera eléctrica", 119900, 53000]] },
  { name: "Belleza", items: [["Sérum vitamina C 30 ml", 89900, 34000], ["Crema hidratante facial", 69900, 25000], ["Set brochas profesional", 119900, 46000], ["Secador iónico 2200W", 249900, 118000], ["Plancha de cabello cerámica", 199900, 92000], ["Perfume floral 100 ml", 189900, 78000], ["Mascarilla capilar keratina", 49900, 18000], ["Kit uñas semipermanente", 79900, 29000], ["Espejo LED de maquillaje", 139900, 58000], ["Organizador de cosméticos", 59900, 21000], ["Aceite corporal argán", 54900, 19000], ["Cepillo alisador", 109900, 44000]] },
  { name: "Deportes", items: [["Mancuernas ajustables 20 kg", 299900, 148000], ["Mat yoga antideslizante", 89900, 36000], ["Banda elástica set 5", 49900, 18000], ["Botella deportiva 1 L", 39900, 14000], ["Balón fútbol profesional", 89900, 38000], ["Guantes de entrenamiento", 59900, 23000], ["Cuerda para saltar", 34900, 12000], ["Chaleco reflectivo running", 69900, 27000], ["Rodillo de espuma", 64900, 25000], ["Set bandas de resistencia", 44900, 16000], ["Morral deportivo 25 L", 129900, 56000], ["Tenis running Trail", 289900, 148000]] },
  { name: "Papelería", items: [["Cuaderno ejecutivo A5", 34900, 12000], ["Set bolígrafos gel 10", 29900, 9000], ["Agenda 2026 semanal", 49900, 18000], ["Resaltadores pastel 6", 24900, 8000], ["Organizador de escritorio", 59900, 22000], ["Notas adhesivas pack", 19900, 6000], ["Calculadora científica", 69900, 28000], ["Carpeta archivador 3\"", 27900, 9500], ["Set marcadores pizarra", 32900, 11000], ["Libreta punteada", 39900, 14000], ["Dispensador de cinta", 24900, 7500], ["Kit escolar 24 piezas", 89900, 36000]] },
  { name: "Accesorios", items: [["Bolso tote cuero sintético", 179900, 78000], ["Billetera RFID", 89900, 34000], ["Gafas de sol polarizadas", 129900, 52000], ["Reloj minimalista acero", 249900, 112000], ["Cinturón reversible", 79900, 30000], ["Bufanda lana merino", 99900, 40000], ["Gorra bordada", 59900, 22000], ["Mochila antirrobo 20 L", 189900, 88000], ["Paraguas compacto", 49900, 18000], ["Llavero multifunción", 29900, 9000], ["Pañuelo seda estampado", 69900, 26000], ["Neceser de viaje", 74900, 29000]] },
  { name: "Mascotas", items: [["Cama ortopédica M", 149900, 68000], ["Comedero doble acero", 59900, 23000], ["Arnés ergonómico", 79900, 32000], ["Juguete interactivo", 39900, 14000], ["Cepillo deslanador", 44900, 16000], ["Transportadora plegable", 189900, 88000], ["Fuente de agua 2 L", 119900, 50000], ["Snacks naturales 500 g", 34900, 15000], ["Correa retráctil 5 m", 64900, 25000], ["Kit higiene dental", 39900, 13000], ["Rascador para gatos", 99900, 42000], ["Champú hipoalergénico", 32900, 12000]] },
];

const SUPPLIERS = [
  { legalName: "Distribuciones Andinas S.A.S.", tradeName: "DistriAndes", doc: "900123456", city: "Bogotá" },
  { legalName: "Importadora Pacífico Ltda.", tradeName: "ImportPacífico", doc: "901456789", city: "Cali" },
  { legalName: "Comercializadora El Roble S.A.S.", tradeName: "El Roble", doc: "900987654", city: "Medellín" },
  { legalName: "Suministros Global House", tradeName: "Global House", doc: "901222333", city: "Barranquilla" },
];

const TAG_POOL = ["VIP", "Mayorista", "Frecuente", "Corporativo", "Nuevo", "En riesgo", "Referido", "Instagram"];
const SOURCES = ["MANUAL", "WEB", "STORE", "REGISTRATION", "IMPORT", "WHATSAPP"];
const EXPENSE_CATS = ["Servicios", "Nómina", "Insumos", "Arriendo", "Otros"];

// ─────────────────────────────── tenant ───────────────────────────────
const tenantRes = await client.query(`SELECT * FROM "Tenant" WHERE slug = $1 OR name = $1 OR id = $1 LIMIT 1`, [TENANT_LOOKUP]);
const tenant = tenantRes.rows[0];
if (!tenant) {
  console.error(`No encontré el negocio «${TENANT_LOOKUP}».`);
  process.exit(1);
}
const T = tenant.id;
console.log(`Negocio: ${tenant.name} (${tenant.slug}) · ${T}`);

await client.query("BEGIN");
try {
  if (CLEAR) await clearTenant(client, T);

  // ── perfil del negocio ───────────────────────────────────────────────
  await client.query(
    `UPDATE "Tenant" SET name=$1, slug=$2, plan='SIGNATURE', "planMonthlyUsdCents"=7900,
       "legalName"=$3, "taxId"=$4, address=$5, city=$6, "whatsappNumber"=$7, "websiteUrl"=$8,
       "instagramHandle"=$9, "googleBusinessUrl"=$10, "placeId"=$11, latitude=$12, longitude=$13,
       "tenantType"='COMPANY', "accountStage"='ACTIVE', "onboardingCompleted"=true, active=true,
       "accountingEnabled"=true, "einvoiceEnabled"=true, "registrationEnabled"=true,
       "paymentMethods"=ARRAY['WOMPI','NEQUI','CASH','TRANSFER'], "businessModels"=ARRAY['RETAIL'],
       "maxUsers"=NULL, "maxCustomers"=NULL, "teamSize"='11-50', activity='Comercio minorista',
       settings=$14, "updatedAt"=now()
     WHERE id=$15`,
    [
      NEW_NAME, NEW_SLUG,
      "Northline Market S.A.S.", "901555888-4", "Calle 85 # 15-32, Local 201", "Bogotá",
      "+57 601 742 8890", "https://northlinemarket.co", "@northlinemarket",
      "https://g.page/northline-market", "ChIJnorthlinebogota01", 4.71099, -74.07209,
      JSON.stringify({ currency: "COP", timezone: "America/Bogota", locale: "es-CO", fiscalYearStart: 1, invoiceFooter: "Gracias por comprar en Northline Market" }),
      T,
    ],
  );
  bump("Tenant", 1);

  // ── módulos encendidos ───────────────────────────────────────────────
  const MODULES = ["dashboard","crm","pos","orders","inventory","purchases","payments","finance","whatsapp","billing","accounting","einvoicing","receivables","taxes","website","google","growth","online_payments","quotes"];
  await client.query(`DELETE FROM "TenantModule" WHERE "tenantId"=$1`, [T]);
  await insert("TenantModule", MODULES.map((m) => ({ id: uuid(), tenantId: T, moduleName: m, active: true, createdAt: daysAgo(200), updatedAt: daysAgo(1) })));

  // ── equipo ───────────────────────────────────────────────────────────
  const owner = (await client.query(`SELECT * FROM "User" WHERE "tenantId"=$1 AND role='OWNER' ORDER BY "createdAt" LIMIT 1`, [T])).rows[0];
  const teamSpec = [
    { name: "Valentina Ríos", email: "valentina.rios@northlinemarket.co", role: "ADMIN", title: "Gerente de operaciones", phone: "3105550101" },
    { name: "Andrés Peña", email: "andres.pena@northlinemarket.co", role: "STAFF", title: "Jefe de bodega", phone: "3105550102" },
    { name: "Camila Torres", email: "camila.torres@northlinemarket.co", role: "ADVISOR", title: "Asesora comercial", phone: "3105550103" },
    { name: "Julián Ospina", email: "julian.ospina@northlinemarket.co", role: "RECEPTION", title: "Atención al cliente", phone: "3105550104" },
    { name: "Daniela Vargas", email: "daniela.vargas@northlinemarket.co", role: "STAFF", title: "Cajera", phone: "3105550105" },
    { name: "Sebastián Molina", email: "sebastian.molina@northlinemarket.co", role: "STAFF", title: "Cajero", phone: "3105550106" },
    { name: "Laura Cárdenas", email: "laura.cardenas@northlinemarket.co", role: "ADVISOR", title: "Community manager", phone: "3105550107" },
    { name: "Felipe Restrepo", email: "felipe.restrepo@northlinemarket.co", role: "ADMIN", title: "Contador", phone: "3105550108" },
    { name: "Manuela Quintero", email: "manuela.quintero@northlinemarket.co", role: "STAFF", title: "Auxiliar de inventario", phone: "3105550109" },
    { name: "Tomás Guerrero", email: "tomas.guerrero@northlinemarket.co", role: "STAFF", title: "Domiciliario", phone: "3105550110" },
  ];
  const users = [];
  for (const [i, m] of teamSpec.entries()) {
    const u = { id: uuid(), clerkUserId: `demo_${NEW_SLUG}_${i}`, email: m.email, name: m.name, role: m.role, tenantId: T, active: true, phone: m.phone, title: m.title, theme: i % 3 === 0 ? "dark" : "light", createdAt: daysAgo(190 - i * 9), updatedAt: daysAgo(2) };
    users.push(u);
  }
  await insert("User", users);
  const staff = [owner, ...users].filter(Boolean);
  const staffId = (i = 0) => staff[i % staff.length]?.id ?? owner?.id ?? null;

  // ── contactos del negocio ────────────────────────────────────────────
  await insert("TenantContact", [
    { id: uuid(), tenantId: T, name: "Valentina Ríos", purpose: "OPERATIONS", email: "valentina.rios@northlinemarket.co", phone: "6017428890", whatsapp: "+573105550101", hours: "Lun–Vie 8:00–18:00", preferredChannel: "WHATSAPP", notes: "Contacto principal para temas operativos.", createdAt: daysAgo(200), updatedAt: daysAgo(3) },
    { id: uuid(), tenantId: T, name: "Felipe Restrepo", purpose: "BILLING", email: "felipe.restrepo@northlinemarket.co", phone: "6017428891", whatsapp: "+573105550108", hours: "Lun–Vie 9:00–17:00", preferredChannel: "EMAIL", notes: "Facturación y cartera.", createdAt: daysAgo(200), updatedAt: daysAgo(3) },
    { id: uuid(), tenantId: T, name: "Julián Ospina", purpose: "SUPPORT", email: "julian.ospina@northlinemarket.co", phone: "6017428892", whatsapp: "+573105550104", hours: "Lun–Sáb 8:00–20:00", preferredChannel: "WHATSAPP", notes: "PQRS y posventa.", createdAt: daysAgo(200), updatedAt: daysAgo(3) },
  ]);

// ─────────────────────────── limpieza del tenant ───────────────────────────
async function clearTenant(c, tenantId) {
  const tables = (
    await c.query(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema='public' AND column_name='tenantId'
         AND table_name NOT IN ('Tenant', 'User')`,
    )
  ).rows.map((r) => r.table_name);
  const fks = (
    await c.query(
      `SELECT cl.relname AS child, pl.relname AS parent
       FROM pg_constraint con
       JOIN pg_class cl ON cl.oid = con.conrelid
       JOIN pg_class pl ON pl.oid = con.confrelid
       JOIN pg_namespace n ON n.oid = cl.relnamespace
       WHERE con.contype='f' AND n.nspname='public'`,
    )
  ).rows;
  const set = new Set(tables);
  const deps = new Map(tables.map((t) => [t, new Set()]));
  for (const { child, parent } of fks) {
    if (set.has(child) && set.has(parent) && child !== parent) deps.get(child).add(parent);
  }
  const order = [];
  const state = new Map();
  const visit = (t) => {
    if (state.get(t) === 2) return;
    if (state.get(t) === 1) return;
    state.set(t, 1);
    for (const p of deps.get(t) ?? []) visit(p);
    state.set(t, 2);
    order.push(t);
  };
  for (const t of tables) visit(t);
  // hijos primero: invertimos el orden topológico de padres→hijos
  for (const t of order.reverse()) {
    await c.query(`DELETE FROM "${t}" WHERE "tenantId" = $1`, [tenantId]);
  }
  await c.query(`DELETE FROM "User" WHERE "tenantId" = $1 AND role <> 'OWNER'`, [tenantId]);
}

// ─────────────────────────────── catálogo ───────────────────────────────
const catIds = {};
const categories = CATEGORIES.map((c, i) => {
  const id = uuid();
  catIds[c.name] = id;
  return { id, tenantId: T, name: c.name, parentId: null, position: i, createdAt: daysAgo(210) };
});
await insert("ProductCategory", categories);

const products = [];
let skuSeq = 1000;
for (const cat of CATEGORIES) {
  for (const [pname, price, cost] of cat.items) {
    skuSeq += 7;
    const stock = int(8, 240);
    products.push({
      id: uuid(), tenantId: T, name: pname, sku: `NM-${skuSeq}`, description: `${pname} de la línea ${cat.name} de Northline Market.`,
      category: cat.name, categoryId: catIds[cat.name], price: money(price), cost: money(cost), stock,
      minStock: int(4, 12), maxStock: 400, reorderPoint: int(10, 25), kind: "PRODUCT",
      taxCategory: "GRAVADO", taxRatePct: 19, unit: "unidad", unitCode: "EA", trackStock: true,
      publishedOnline: chance(0.75), sellable: true, purchasable: true, posEnabled: true,
      customizable: false, favorite: chance(0.18), active: true, brand: pick(["Northline", "Nova", "Casa Verde", "Lumen", "Andes", "Kaia"]),
      imageUrl: null, internalNotes: null, durationMinutes: null, durationDays: null, capacity: null,
      createdAt: daysAgo(int(30, 200)), updatedAt: daysAgo(int(0, 10)),
    });
  }
}
await insert("Product", products);

const variants = [];
const barcodes = [];
for (const p of products) {
  const isVariant = /Camis|Tenis|Silla|Sof|Mesa|Sábanas|Toalla|Cojín|Matera|Termo|Bolso|Mochila|Gorra|Bufanda|Arnés|Cama/.test(p.name);
  if (isVariant && chance(0.8)) {
    const opts = pick([["Negro", "Blanco", "Arena"], ["S", "M", "L"], ["Único"], ["Gris", "Azul", "Verde"]]);
    for (const [i, opt] of opts.entries()) {
      variants.push({
        id: uuid(), tenantId: T, productId: p.id, name: opt, sku: `${p.sku}-${opt.toUpperCase().slice(0, 3)}${i + 1}`,
        price: money(p.price * (1 + i * 0.02)), cost: p.cost, attributes: JSON.stringify({ color: opt }),
        active: true, createdAt: p.createdAt, updatedAt: p.updatedAt,
      });
    }
  }
  barcodes.push({ id: uuid(), tenantId: T, productId: p.id, variantId: null, code: `770${int(1000000000, 1999999999)}`, symbology: "EAN13", createdAt: p.createdAt });
}
await insert("ProductVariant", variants);
await insert("ProductBarcode", barcodes);

// ─────────────────────────── listas de precios ───────────────────────────
const priceListDefault = (await client.query(`SELECT id FROM "PriceList" WHERE "tenantId"=$1 AND "isDefault"=true LIMIT 1`, [T])).rows[0]?.id;
const priceListMayor = uuid();
const priceListVIP = uuid();
await insert("PriceList", [
  { id: priceListMayor, tenantId: T, name: "Mayorista", currency: "COP", isDefault: false, active: true, createdAt: daysAgo(180), updatedAt: daysAgo(2) },
  { id: priceListVIP, tenantId: T, name: "Clientes VIP", currency: "COP", isDefault: false, active: true, createdAt: daysAgo(180), updatedAt: daysAgo(2) },
]);
await insert("PriceListItem", products.map((p) => ({ id: uuid(), tenantId: T, priceListId: priceListMayor, productId: p.id, variantId: null, price: money(p.price * 0.82), updatedAt: daysAgo(2) })));
await insert("PriceListItem", products.map((p) => ({ id: uuid(), tenantId: T, priceListId: priceListVIP, productId: p.id, variantId: null, price: money(p.price * 0.92), updatedAt: daysAgo(2) })));

// ─────────────────────────────── clientes ───────────────────────────────
const customerRows = [];
const partyRows = [];
const partyRoleRows = [];
const N_CUSTOMERS = 240;
for (let i = 0; i < N_CUSTOMERS; i++) {
  const n = name();
  const p = phone();
  const kind = chance(0.16) ? "COMPANY" : "PERSON";
  const legal = kind === "COMPANY" ? pick(["Comercializadora", "Inversiones", "Grupo", "Estudio", "Taller"]) + " " + pick(LAST) + " S.A.S." : n;
  const partyId = uuid();
  const city = pick(CITIES);
  partyRows.push({
    id: partyId, tenantId: T, kind, documentType: kind === "COMPANY" ? "NIT" : "CC",
    documentNumber: doc(), checkDigit: String(int(0, 9)), legalName: legal, tradeName: kind === "COMPANY" ? legal.replace(" S.A.S.", "") : null,
    email: email(legal), phone: `+57${p}`, addressLine: `Calle ${int(10, 170)} # ${int(1, 90)}-${int(1, 99)}`, region: "Cundinamarca",
    city, taxResponsibility: kind === "COMPANY" ? "O-48" : "R-99-PN", contactName: n, contactPhone: `+57${p}`, contactEmail: email(n),
    createdAt: daysAgo(int(1, 200)), updatedAt: daysAgo(int(0, 30)), active: true, countryCode: "CO",
  });
  partyRoleRows.push({ id: uuid(), tenantId: T, partyId, role: "CUSTOMER", createdAt: daysAgo(int(1, 200)) });
  customerRows.push({
    id: uuid(), tenantId: T, name: legal, email: email(legal), phone: p, phoneNorm: `57${p}`, documentId: doc(), city,
    birthDate: chance(0.4) ? new Date(NOW - int(7000, 20000) * day) : null, active: true,
    stage: pick(["CUSTOMER", "CUSTOMER", "CUSTOMER", "RECURRING", "PROSPECT"]), source: pick(SOURCES),
    tags: pickMany(TAG_POOL, int(0, 2)), partyId, ownerId: staffId(int(0, staff.length - 1)),
    priceListId: chance(0.15) ? priceListVIP : chance(0.12) ? priceListMayor : priceListDefault ?? null,
    profile: JSON.stringify({ canal: pick(["tienda", "web", "whatsapp"]), preferencia: pick(["mañana", "tarde", "noche"]) }),
    consentAt: chance(0.8) ? daysAgo(int(10, 180)) : null, optOutAt: chance(0.05) ? daysAgo(int(1, 40)) : null,
    accessCode: `NM${int(10000, 99999)}`, nfcUid: chance(0.2) ? `04:${int(10, 99)}:${int(10, 99)}:${int(10, 99)}` : null,
    photoId: null, createdAt: chance(0.03) ? at(int(0, 6) * 3600_000) : daysAgo(int(1, 200)), updatedAt: daysAgo(int(0, 20)),
  });
}
await insert("Party", partyRows);
await insert("PartyRole", partyRoleRows);
await insert("Customer", customerRows);

// grupos de clientes
const groupVIP = uuid();
const groupMayor = uuid();
await insert("CustomerGroup", [
  { id: groupVIP, tenantId: T, name: "VIP", icon: "star", priceListId: priceListVIP, createdAt: daysAgo(170) },
  { id: groupMayor, tenantId: T, name: "Mayoristas", icon: "building", priceListId: priceListMayor, createdAt: daysAgo(170) },
]);
await insert("CustomerGroupMember", customerRows.filter((_, i) => i % 11 === 0).map((c) => ({ id: uuid(), tenantId: T, groupId: groupVIP, customerId: c.id, createdAt: daysAgo(int(5, 90)) })));
await insert("CustomerGroupMember", customerRows.filter((_, i) => i % 17 === 0).map((c) => ({ id: uuid(), tenantId: T, groupId: groupMayor, customerId: c.id, createdAt: daysAgo(int(5, 90)) })));

const NOTES = [
  "Prefiere contacto por WhatsApp después de las 3 p. m.",
  "Cliente recurrente, compra para regalo corporativo.",
  "Solicita factura electrónica siempre.",
  "Tiene descuento acordado por volumen.",
  "Pidió seguimiento de su última compra.",
  "Vive en el norte de la ciudad, envío por coordinar.",
  "Interesada en la nueva línea de hogar.",
  "Cliente mayorista: compra por caja cerrada.",
];
const customerNotes = [];
for (const c of customerRows) {
  if (!chance(0.35)) continue;
  customerNotes.push({ id: uuid(), tenantId: T, customerId: c.id, content: pick(NOTES), createdBy: staffId(int(0, staff.length - 1)), createdAt: daysAgo(int(1, 150)), updatedAt: daysAgo(int(0, 30)) });
}
await insert("CustomerNote", customerNotes);

// ─────────────────────────────── inventario ───────────────────────────────
const whMain = uuid();
const whStore = uuid();
await insert("Warehouse", [
  { id: whMain, tenantId: T, name: "Bodega Principal", code: "BOG-01", address: "Calle 85 # 15-32, Bogotá", isDefault: true, active: true, createdAt: daysAgo(210), updatedAt: daysAgo(2) },
  { id: whStore, tenantId: T, name: "Tienda Centro", code: "BOG-02", address: "Carrera 7 # 45-12, Bogotá", isDefault: false, active: true, createdAt: daysAgo(180), updatedAt: daysAgo(2) },
]);

const stockLevels = [];
for (const p of products) {
  const a = Math.max(0, Math.floor(p.stock * 0.7));
  stockLevels.push({ id: uuid(), tenantId: T, productId: p.id, variantId: null, variantKey: "", warehouseId: whMain, quantity: a, avgCost: p.cost, updatedAt: daysAgo(int(0, 5)) });
  stockLevels.push({ id: uuid(), tenantId: T, productId: p.id, variantId: null, variantKey: "", warehouseId: whStore, quantity: p.stock - a, avgCost: p.cost, updatedAt: daysAgo(int(0, 5)) });
}
await insert("StockLevel", stockLevels);

const stockMovements = [];
for (let i = 0; i < 420; i++) {
  const p = pick(products);
  const kind = pick(["IN", "IN", "OUT", "OUT", "OUT", "ADJUST"]);
  stockMovements.push({
    id: uuid(), tenantId: T, productId: p.id, variantId: null, warehouseId: chance(0.65) ? whMain : whStore,
    kind, quantity: kind === "OUT" ? -int(1, 12) : int(1, 40), unitCost: p.cost, balanceAfter: int(0, 220),
    reason: kind === "IN" ? "Compra a proveedor" : kind === "OUT" ? "Venta en mostrador" : "Ajuste por conteo",
    note: null, documentType: kind === "IN" ? "PURCHASE_ORDER" : kind === "OUT" ? "INVOICE" : "STOCK_COUNT",
    documentId: null, paymentId: null, createdById: staffId(int(0, staff.length - 1)), createdAt: daysAgo(int(0, 180)),
  });
}
await insert("StockMovement", stockMovements);

const stockCountId = uuid();
await insert("StockCount", [{ id: stockCountId, tenantId: T, number: 1, warehouseId: whMain, status: "CLOSED", note: "Conteo cíclico de octubre", createdById: staffId(1), createdAt: daysAgo(22), completedAt: daysAgo(21) }]);
await insert("StockCountLine", products.slice(0, 30).map((p) => ({ id: uuid(), tenantId: T, countId: stockCountId, productId: p.id, expected: p.stock, counted: p.stock + int(-2, 2), adjustment: int(-2, 2) })));

const transferId = uuid();
await insert("StockTransfer", [{ id: transferId, tenantId: T, number: 1, fromWarehouseId: whMain, toWarehouseId: whStore, note: "Reposición semanal", createdById: staffId(1), createdAt: daysAgo(12) }]);
await insert("StockTransferLine", products.slice(0, 18).map((p) => ({ id: uuid(), tenantId: T, transferId, productId: p.id, variantId: null, quantity: int(2, 10), unitCost: p.cost })));

// ─────────────────────────────── proveedores ───────────────────────────────
const supplierParties = [];
for (const s of SUPPLIERS) {
  const id = uuid();
  supplierParties.push(id);
  await insert("Party", [{
    id, tenantId: T, kind: "COMPANY", documentType: "NIT", documentNumber: s.doc, checkDigit: String(int(0, 9)),
    legalName: s.legalName, tradeName: s.tradeName, email: `compras@${s.tradeName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "")}.co`,
    phone: `+57${phone()}`, addressLine: `Zona Industrial ${int(1, 40)}`, region: "Cundinamarca", city: s.city,
    taxResponsibility: "O-48", contactName: name(), contactPhone: `+57${phone()}`,
    createdAt: daysAgo(210), updatedAt: daysAgo(10), active: true, countryCode: "CO",
  }]);
  await insert("PartyRole", [{ id: uuid(), tenantId: T, partyId: id, role: "SUPPLIER", createdAt: daysAgo(210) }]);
}

const purchaseOrders = [];
const purchaseLines = [];
const supplierInvoices = [];
const supplierPayments = [];
let ocNum = 0;
for (let i = 0; i < 16; i++) {
  const poId = uuid();
  const supplier = pick(supplierParties);
  const lines = pickMany(products, int(3, 8));
  let subtotal = 0;
  for (const p of lines) {
    const qty = int(10, 60);
    const unitCost = money(p.cost * (0.95 + rnd() * 0.1));
    subtotal += qty * unitCost;
    purchaseLines.push({ id: uuid(), tenantId: T, orderId: poId, productId: p.id, variantId: null, quantity: qty, receivedQuantity: qty, unitCost, taxRatePct: 19 });
  }
  const tax = money(subtotal * 0.19);
  ocNum += 1;
  const status = pick(["RECEIVED", "RECEIVED", "RECEIVED", "PARTIAL", "ORDERED"]);
  purchaseOrders.push({
    id: poId, tenantId: T, number: ocNum, supplierPartyId: supplier, warehouseId: whMain, status,
    subtotal: money(subtotal), taxTotal: tax, total: money(subtotal + tax),
    expectedDate: isoDate(daysAgo(-int(1, 20))), note: "Reposición de inventario",
    createdById: staffId(1), createdAt: daysAgo(int(5, 170)), updatedAt: daysAgo(int(0, 5)),
  });
  if (status === "RECEIVED" || status === "PARTIAL") {
    const siId = uuid();
    supplierInvoices.push({
      id: siId, tenantId: T, supplierPartyId: supplier, purchaseOrderId: poId, number: `FV-${int(1000, 9999)}`,
      issueDate: isoDate(daysAgo(int(3, 160))), dueDate: isoDate(daysAgo(-int(5, 30))), cufe: uuid().replace(/-/g, ""),
      subtotal: money(subtotal), taxTotal: tax, total: money(subtotal + tax), paidTotal: 0, status: "REGISTERED", createdAt: daysAgo(int(3, 160)),
    });
    if (chance(0.7)) {
      supplierPayments.push({ id: uuid(), tenantId: T, supplierInvoiceId: siId, amount: money(subtotal + tax), method: pick(["TRANSFER", "CASH"]), note: "Pago de factura de proveedor", createdById: staffId(2), createdAt: daysAgo(int(1, 40)) });
    }
  }
}
await insert("PurchaseOrder", purchaseOrders);
await insert("PurchaseOrderLine", purchaseLines);
await insert("SupplierInvoice", supplierInvoices);
await insert("SupplierPayment", supplierPayments);

// ─────────────────────────── ventas y cobros ───────────────────────────
const invoiceRows = [];
const invoiceLineRows = [];
const paymentRows = [];
const allocationRows = [];
const fiscalRows = [];
const obligationRows = [];
const N_INVOICES = 560;
let invoiceNumber = 0;
let paymentNumber = 0;
let obligationSeq = 0;

for (let i = 0; i < N_INVOICES; i++) {
  const ago = chance(0.13) ? int(0, 2) : int(0, 180);
  const issuedAt = daysAgo(ago);
  const customer = pick(customerRows);
  const lineCount = int(1, 5);
  const chosen = pickMany(products, lineCount);
  let subtotal = 0;
  const invId = uuid();
  const kind = chance(0.06) ? "BILL" : chance(0.03) ? "CREDIT_NOTE" : "SALE";
  const lines = chosen.map((p) => {
    const qty = int(1, 4);
    const unitPrice = money(p.price);
    const total = money(qty * unitPrice);
    subtotal += total;
    invoiceLineRows.push({ id: uuid(), invoiceId: invId, productId: p.id, description: p.name, quantity: qty, unitPrice, discountPct: chance(0.15) ? int(5, 15) : 0, taxRatePct: 19, total });
    return total;
  });
  const taxTotal = money(subtotal * 0.19);
  const total = money(subtotal + taxTotal);
  invoiceNumber += 1;
  const roll = rnd();
  const status = kind === "CREDIT_NOTE" ? "ISSUED" : roll < 0.78 ? "PAID" : roll < 0.96 ? "ISSUED" : "VOID";
  const paidTotal = status === "PAID" ? total : status === "ISSUED" && kind === "BILL" && chance(0.35) ? money(total * 0.4) : 0;
  invoiceRows.push({
    id: invId, tenantId: T, kind, number: invoiceNumber, prefix: kind === "SALE" ? "FV" : kind === "BILL" ? "CC" : "NC",
    customerId: customer.id, customerName: customer.name, customerDoc: customer.documentId,
    issueDate: issuedAt, dueDate: new Date(issuedAt.getTime() + (kind === "BILL" ? 30 : 0) * day),
    subtotal: money(subtotal), discountTotal: 0, taxTotal, tipTotal: 0, withholdingTotal: 0, total, paidTotal,
    status, notes: null, createdById: staffId(int(0, staff.length - 1)), originType: kind === "SALE" ? "POS" : null,
    originId: null, sourceDocumentId: null, projectId: null, resolutionId: null, paymentId: null,
    withholdings: null, voidReason: status === "VOID" ? "Anulada por error de digitación" : null,
    createdAt: issuedAt, updatedAt: issuedAt,
  });

  if (status === "PAID" && kind !== "CREDIT_NOTE") {
    paymentNumber += 1;
    const payId = uuid();
    paymentRows.push({
      id: payId, tenantId: T, customerId: customer.id, invoiceId: invId, amount: total, status: "APPROVED",
      provider: pick(["CASH", "CASH", "TRANSFER", "WOMPI", "NEQUI"]), receiptNumber: paymentNumber,
      providerRefId: null, sourceType: "INVOICE", sourceId: invId, description: `Pago factura ${kind === "SALE" ? "FV" : "CC"}-${seq(invoiceNumber)}`,
      notes: null, cashSessionId: null, membershipId: null, voidedAt: null, voidReason: null,
      createdAt: new Date(issuedAt.getTime() + int(0, 3) * 3600_000), updatedAt: issuedAt,
    });
    allocationRows.push({ id: uuid(), tenantId: T, paymentId: payId, targetType: "INVOICE", targetId: invId, amount: total, createdAt: issuedAt });
  }

  if (status === "ISSUED" && kind !== "CREDIT_NOTE" && (kind === "BILL" || chance(0.5))) {
    obligationSeq += 1;
    obligationRows.push({
      id: uuid(), tenantId: T, originType: "INVOICE", originId: invId, customerId: customer.id,
      debtorName: customer.name, description: `Saldo ${kind === "BILL" ? "cuenta de cobro" : "factura"} ${seq(invoiceNumber)}`,
      amount: total, paidTotal, status: paidTotal > 0 ? "PARTIAL" : "OPEN",
      dueDate: new Date(issuedAt.getTime() + int(15, 45) * day), createdAt: issuedAt, updatedAt: issuedAt,
    });
  }

  if (kind === "SALE" && chance(0.9)) {
    fiscalRows.push({
      id: uuid(), tenantId: T, invoiceId: invId, kind: "INVOICE", status: pick(["ACCEPTED", "ACCEPTED", "ACCEPTED", "SENT"]),
      provider: "dian_mock", providerRef: uuid(), cufe: uuid().replace(/-/g, ""), payload: JSON.stringify({ total, currency: "COP" }),
      attempts: 1, lastAttemptAt: issuedAt, rejectReason: null, supplierInvoiceId: null, createdAt: issuedAt, updatedAt: issuedAt,
    });
  }
}
await insert("Invoice", invoiceRows);
await insert("InvoiceLine", invoiceLineRows);
await insert("Payment", paymentRows);
await insert("PaymentAllocation", allocationRows);
await insert("FiscalDocument", fiscalRows);
await insert("Obligation", obligationRows);

// resoluciones de numeración
await insert("NumberingResolution", [
  { id: uuid(), tenantId: T, documentKind: "SALE", prefix: "FV", resolutionNumber: "18760000001234", rangeFrom: 1, rangeTo: 5000, nextNumber: invoiceNumber + 1, validFrom: daysAgo(200), validTo: daysAgo(-400), active: true, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, documentKind: "BILL", prefix: "CC", resolutionNumber: "18760000001235", rangeFrom: 1, rangeTo: 2000, nextNumber: 220, validFrom: daysAgo(200), validTo: daysAgo(-400), active: true, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, documentKind: "CREDIT_NOTE", prefix: "NC", resolutionNumber: "18760000001236", rangeFrom: 1, rangeTo: 1000, nextNumber: 45, validFrom: daysAgo(200), validTo: daysAgo(-400), active: true, createdAt: daysAgo(200) },
]);

// ─────────────────────────────── gastos y caja ───────────────────────────────
const boxMain = uuid();
const boxStore = uuid();
await insert("CashBox", [
  { id: boxMain, tenantId: T, name: "Caja principal", fundAmount: 500000, responsibleUserId: staffId(5), active: true, createdAt: daysAgo(200), updatedAt: daysAgo(2) },
  { id: boxStore, tenantId: T, name: "Caja tienda centro", fundAmount: 300000, responsibleUserId: staffId(6), active: true, createdAt: daysAgo(180), updatedAt: daysAgo(2) },
]);

const sessions = [];
const movements = [];
for (let i = 0; i < 46; i++) {
  const box = chance(0.6) ? boxMain : boxStore;
  const opened = daysAgo(int(1, 60));
  const sessionId = uuid();
  const opening = int(200000, 500000);
  const expected = opening + int(300000, 2600000);
  sessions.push({
    id: sessionId, tenantId: T, boxId: box, terminalId: null, openedById: staffId(int(5, 6)),
    openedAt: opened, openingAmount: opening, closedAt: new Date(opened.getTime() + 9 * 3600_000),
    closedById: staffId(int(5, 6)), countedAmount: expected + int(-15000, 15000), expectedAmount: expected,
    difference: int(-15000, 15000), closingNotes: "Cierre de turno sin novedades", 
  });
  movements.push({ id: uuid(), tenantId: T, sessionId, kind: "OPENING", amount: opening, description: "Apertura de caja", beneficiary: null, createdById: staffId(5), expenseId: null, paymentId: null, createdAt: opened });
  for (let m = 0; m < int(2, 6); m++) {
    movements.push({
      id: uuid(), tenantId: T, sessionId, kind: pick(["INCOME", "INCOME", "EXPENSE", "VOUCHER"]),
      amount: int(20000, 900000), description: pick(["Venta de mostrador", "Pago de domicilio", "Compra de insumos", "Vale de caja"]),
      beneficiary: pick(["Mensajería urbana", "Papelería El Lápiz", "Cafetería", "Proveedor menor"]),
      createdById: staffId(int(5, 6)), expenseId: null, paymentId: null, createdAt: new Date(opened.getTime() + int(1, 8) * 3600_000),
    });
  }
  movements.push({ id: uuid(), tenantId: T, sessionId, kind: "REPLENISH", amount: int(100000, 400000), description: "Reposición de fondo", beneficiary: null, createdById: staffId(5), expenseId: null, paymentId: null, createdAt: new Date(opened.getTime() + 8 * 3600_000) });
}
await insert("CashSession", sessions);
await insert("CashMovement", movements);

const EXPENSE_DESCRIPTIONS = {
  Servicios: ["Energía eléctrica", "Internet y telefonía", "Acueducto y alcantarillado", "Aseo y vigilancia", "Software de facturación"],
  Nómina: ["Nómina quincenal", "Prestaciones sociales", "Seguridad social", "Auxilio de transporte", "Bonificación de metas"],
  Insumos: ["Empaques y bolsas", "Material de exhibición", "Insumos de aseo", "Papelería interna", "Etiquetas y códigos"],
  Arriendo: ["Arriendo local principal", "Arriendo bodega", "Administración del local", "Parqueadero bodega"],
  Otros: ["Mantenimiento de equipos", "Publicidad en redes", "Transporte y domicilios", "Comisiones bancarias", "Capacitación del equipo"],
};
const expenses = [];
for (let i = 0; i < 148; i++) {
  const cat = pick(EXPENSE_CATS);
  const amount = cat === "Arriendo" ? int(1800000, 3200000) : cat === "Nómina" ? int(900000, 4800000) : int(45000, 950000);
  expenses.push({
    id: uuid(), tenantId: T, category: cat, description: pick(EXPENSE_DESCRIPTIONS[cat]), amount: money(amount),
    date: daysAgo(int(0, 180)), paidFrom: pick(["BANK", "BANK", "CASH"]), supplier: chance(0.4) ? pick(SUPPLIERS).tradeName : null,
    createdById: staffId(int(0, staff.length - 1)), cashSessionId: null, projectId: null,
    voidedAt: chance(0.03) ? daysAgo(int(1, 20)) : null, voidReason: null, createdAt: daysAgo(int(0, 180)), updatedAt: daysAgo(int(0, 5)),
  });
}
await insert("Expense", expenses);

await insert("FinancialAccount", [
  { id: uuid(), tenantId: T, name: "Caja general", kind: "CASH", ledgerAccount: "1105", provider: null, feePct: 0, feeFixed: 0, feeVatPct: 0, active: true, createdAt: daysAgo(200), updatedAt: daysAgo(5) },
  { id: uuid(), tenantId: T, name: "Banco Bogotá · Cta. corriente", kind: "BANK", ledgerAccount: "1110", provider: null, feePct: 0, feeFixed: 0, feeVatPct: 0, active: true, createdAt: daysAgo(200), updatedAt: daysAgo(5) },
  { id: uuid(), tenantId: T, name: "Wompi", kind: "GATEWAY", ledgerAccount: "1340", provider: "wompi", feePct: 2.95, feeFixed: 900, feeVatPct: 19, active: true, createdAt: daysAgo(200), updatedAt: daysAgo(5) },
  { id: uuid(), tenantId: T, name: "Nequi", kind: "WALLET", ledgerAccount: "1120", provider: "nequi", feePct: 1.5, feeFixed: 0, feeVatPct: 19, active: true, createdAt: daysAgo(200), updatedAt: daysAgo(5) },
]);

const bankLines = [];
for (let i = 0; i < 60; i++) {
  const amount = int(50000, 2500000);
  bankLines.push({
    id: uuid(), tenantId: T, batch: `EXT-${isoDate(daysAgo(int(0, 40)))}`, day: isoDate(daysAgo(int(0, 40))),
    description: pick(["Transferencia recibida", "Pago proveedor", "Comisión bancaria", "Abono cliente", "Pago nómina"]),
    reference: `TRX${int(100000, 999999)}`, amount: money(amount), fingerprint: `fp-${uuid()}`,
    status: pick(["MATCHED", "MATCHED", "UNMATCHED"]), matchType: chance(0.7) ? "PAYMENT" : null,
    matchId: null, matchConfidence: chance(0.7) ? "HIGH" : null, confirmedAt: null, confirmedById: null, createdAt: daysAgo(int(0, 40)),
  });
}
await insert("BankStatementLine", bankLines);

// ─────────────────────────────── cotizaciones ───────────────────────────────
const quotes = [];
const quoteItems = [];
let quoteCode = 0;
for (let i = 0; i < 22; i++) {
  const qId = uuid();
  const customer = pick(customerRows);
  const chosen = pickMany(products, int(2, 6));
  let directCost = 0;
  const items = chosen.map((p) => {
    const qty = int(1, 8);
    const unitCost = p.cost;
    directCost += qty * unitCost;
    return { id: uuid(), quoteId: qId, name: p.name, quantity: qty, unit: "unidad", unitCost, totalCost: money(qty * unitCost), activityId: null, apuSnapshot: null };
  });
  quoteItems.push(...items);
  const util = 10;
  const admin = 15;
  const tax = 19;
  const totalAmount = money(directCost * (1 + util / 100) * (1 + admin / 100) * (1 + tax / 100));
  quoteCode += 1;
  quotes.push({
    id: qId, tenantId: T, code: `COT-${seq(quoteCode)}`, customerId: customer.id, title: `Cotización ${pick(["dotación de oficina", "regalo corporativo", "kit de bienvenida", "reposición de mobiliario"])}`,
    status: pick(["DRAFT", "SENT", "SENT", "APPROVED", "REJECTED"]), directCost: money(directCost), utilPercent: util, adminPercent: admin,
    imprevPercent: 5, taxPercent: tax, totalAmount, validUntil: daysAgo(-int(5, 30)), sentAt: chance(0.7) ? daysAgo(int(1, 60)) : null,
    decidedAt: chance(0.3) ? daysAgo(int(1, 30)) : null, decidedByName: chance(0.3) ? name() : null,
    decisionNote: null, projectId: null, version: 1, budgetRevision: null, showApuDetail: false, snapshot: null,
    createdAt: daysAgo(int(1, 90)), updatedAt: daysAgo(int(0, 10)),
  });
}
await insert("Quote", quotes);
await insert("QuoteItem", quoteItems);

// ─────────────────────────── tienda en línea y entregas ───────────────────────────
const storeOrders = [];
const storeLines = [];
const deliveries = [];
let storeNumber = 0;
for (let i = 0; i < 78; i++) {
  const customer = pick(customerRows);
  const oId = uuid();
  const chosen = pickMany(products, int(1, 4));
  let total = 0;
  for (const p of chosen) {
    const qty = int(1, 3);
    total += p.price * qty;
    storeLines.push({ id: uuid(), tenantId: T, orderId: oId, productId: p.id, name: p.name, quantity: qty, unitPrice: money(p.price), taxRatePct: 19 });
  }
  storeNumber += 1;
  const created = daysAgo(int(0, 120));
  const status = pick(["PAID", "PAID", "PAID", "PENDING_PAYMENT", "CANCELED", "ABANDONED"]);
  const fulfillment = status === "PAID" ? pick(["DELIVERED", "DELIVERED", "SHIPPED", "READY", "CONFIRMED"]) : "RECEIVED";
  storeOrders.push({
    id: oId, tenantId: T, number: storeNumber, customerId: customer.id, customerName: customer.name,
    phone: customer.phone, email: customer.email, address: `${pick(["Calle", "Carrera", "Diagonal"])} ${int(10, 170)} # ${int(1, 90)}-${int(1, 99)}`,
    city: customer.city, notes: chance(0.2) ? "Dejar en portería." : null, total: money(total), status, fulfillment,
    paidAt: status === "PAID" ? created : null, channel: pick(["WEB", "WEB", "WEB", "WHATSAPP", "API"]),
    externalId: null, origin: JSON.stringify({ source: pick(["instagram", "google", "directo", "facebook"]), medium: "social", campaign: pick(["siembra", "regalos", "hogar", "tech"]) }),
    intentId: null, documentId: null, quoteId: null, review: null, abandonedNotifiedAt: null,
    createdAt: created,
  });
  if (status === "PAID" && chance(0.75)) {
    deliveries.push({
      id: uuid(), tenantId: T, orderId: oId, method: pick(["DOMICILIO", "RECOGIDA", "MENSAJERIA"]), carrier: pick(["Servientrega", "Interrapidísimo", "Mensajería propia", "Envío nacional"]),
      trackingCode: `NM${int(1000000, 9999999)}`, scheduledFor: new Date(created.getTime() + int(1, 5) * day),
      deliveredAt: fulfillment === "DELIVERED" ? new Date(created.getTime() + int(1, 6) * day) : null,
      receivedBy: fulfillment === "DELIVERED" ? name() : null, note: null, createdAt: created,
    });
  }
}
await insert("StoreOrder", storeOrders);
await insert("StoreOrderLine", storeLines);
await insert("Delivery", deliveries);

// ─────────────────────────────── agenda ───────────────────────────────
const bookings = [];
for (let i = 0; i < 40; i++) {
  const start = daysAgo(int(-20, 60));
  const customer = pick(customerRows);
  const p = pick(products);
  bookings.push({
    id: uuid(), tenantId: T, customerId: customer.id, serviceName: pick(["Asesoría de decoración", "Entrega programada", "Instalación a domicilio", "Visita a bodega", "Retiro en tienda"]),
    startDate: start, endDate: new Date(start.getTime() + 3600_000), status: pick(["CONFIRMED", "COMPLETED", "PENDING", "CANCELLED"]),
    totalAmount: BigInt(int(0, 180000)), notes: null, productId: p.id, staffUserId: staffId(int(0, staff.length - 1)),
    partySize: int(1, 3), kind: pick(["APPOINTMENT", "DELIVERY", "VISIT"]), reminderSentAt: chance(0.5) ? start : null,
    createdAt: daysAgo(int(0, 70)), updatedAt: daysAgo(int(0, 5)),
  });
}
await insert("Booking", bookings);

// ─────────────────────────────── CRM ───────────────────────────────
const stageDefs = [
  { name: "Nuevo", position: 0, probability: 20, isWon: false },
  { name: "Contactado", position: 1, probability: 30, isWon: false },
  { name: "Calificado", position: 2, probability: 45, isWon: false },
  { name: "Propuesta enviada", position: 3, probability: 65, isWon: false },
  { name: "Negociación", position: 4, probability: 80, isWon: false },
  { name: "Ganado", position: 5, probability: 100, isWon: true },
  { name: "Perdido", position: 6, probability: 0, isWon: false },
];
const stages = stageDefs.map((s) => ({ id: uuid(), tenantId: T, ...s, createdAt: daysAgo(200) }));
await insert("CrmStage", stages);
await insert("CrmTag", TAG_POOL.map((t) => ({ id: uuid(), tenantId: T, name: t, createdAt: daysAgo(200) })));
await insert("CrmLostReason", [
  { id: uuid(), tenantId: T, name: "Precio", position: 0, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, name: "Eligió a la competencia", position: 1, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, name: "Sin respuesta", position: 2, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, name: "No era el momento", position: 3, createdAt: daysAgo(200) },
]);

const opportunities = [];
const oppEvents = [];
const tasks = [];
const INTERESTS = ["Dotación de oficina", "Regalo corporativo", "Remodelación de sala", "Kit de bienvenida", "Equipos de cómputo", "Decoración de temporada", "Reposición de inventario", "Mobiliario para cafetería"];
for (let i = 0; i < 58; i++) {
  const customer = pick(customerRows);
  const stage = pick(stages);
  const oId = uuid();
  const created = daysAgo(int(1, 150));
  const value = int(350000, 18500000);
  const status = stage.isWon ? "WON" : stage.name === "Perdido" ? "LOST" : "OPEN";
  opportunities.push({
    id: oId, tenantId: T, customerId: customer.id, leadId: null, stage: stage.isWon ? "WON" : stage.name === "Perdido" ? "LOST" : "OPEN",
    stageId: stage.id, status, position: i, priority: int(0, 2), probability: stage.probability, interest: pick(INTERESTS),
    description: pick(["Cliente pide cotización formal.", "Solicita muestras antes de decidir.", "Compra recurrente mensual.", "Proyecto con fecha de entrega en diciembre.", "Necesita aprobación de gerencia."]),
    estimatedValue: money(value), ownerId: staffId(int(0, staff.length - 1)), source: pick(["WEB", "WHATSAPP", "REFERIDO", "INSTAGRAM", "TIENDA"]),
    expectedClose: isoDate(daysAgo(-int(3, 45))), nextAction: pick(["Llamar para seguimiento", "Enviar cotización", "Agendar visita", "Confirmar forma de pago", "Enviar catálogo actualizado"]),
    nextActionAt: daysAgo(-int(0, 10)), tags: pickMany(TAG_POOL, int(0, 2)), teamId: null, orderId: null,
    lostReason: status === "LOST" ? pick(["Precio", "Eligió a la competencia", "Sin respuesta"]) : null,
    closedAt: status === "OPEN" ? null : daysAgo(int(1, 30)), stageSince: created, createdAt: created, updatedAt: daysAgo(int(0, 10)),
  });
  oppEvents.push({ id: uuid(), tenantId: T, opportunityId: oId, kind: "CREATED", authorId: staffId(2), data: JSON.stringify({ stage: "Nuevo" }), createdAt: created });
  if (chance(0.7)) oppEvents.push({ id: uuid(), tenantId: T, opportunityId: oId, kind: "STAGE_CHANGED", authorId: staffId(2), data: JSON.stringify({ from: "Nuevo", to: stage.name }), createdAt: daysAgo(int(0, 60)) });
  if (chance(0.5)) oppEvents.push({ id: uuid(), tenantId: T, opportunityId: oId, kind: "NOTE", authorId: staffId(2), data: JSON.stringify({ body: pick(["Cliente confirmó interés.", "Pidió descuento por volumen.", "Se envió propuesta por correo.", "Quedó de responder el lunes."]) }), createdAt: daysAgo(int(0, 30)) });
}
await insert("Opportunity", opportunities);
await insert("OpportunityEvent", oppEvents);

const TASK_TITLES = ["Llamar al cliente", "Enviar cotización", "Confirmar pago", "Agendar visita", "Preparar muestra", "Revisar inventario", "Cerrar venta", "Enviar catálogo", "Hacer seguimiento", "Coordinar entrega"];
for (let i = 0; i < 88; i++) {
  const done = chance(0.45);
  const due = chance(0.16) ? at(int(0, 6) * 3600_000) : daysAgo(int(-15, 25));
  tasks.push({
    id: uuid(), tenantId: T, title: pick(TASK_TITLES), notes: chance(0.4) ? pick(["Llamar después de las 10 a. m.", "Enviar por WhatsApp.", "Cliente pidió factura electrónica.", "Coordinar con bodega."]) : null,
    status: done ? "DONE" : pick(["OPEN", "OPEN", "IN_PROGRESS"]), kind: pick(["CALL", "EMAIL", "MEETING", "TASK"]),
    dueAt: due, dueDay: isoDate(due), assigneeId: staffId(int(0, staff.length - 1)), createdById: staffId(int(0, staff.length - 1)),
    customerId: chance(0.6) ? pick(customerRows).id : null, opportunityId: chance(0.5) ? pick(opportunities).id : null, projectId: null,
    doneAt: done ? daysAgo(int(0, 20)) : null, doneById: done ? staffId(int(0, staff.length - 1)) : null,
    createdAt: daysAgo(int(0, 90)),
  });
}
await insert("Task", tasks);

// formularios y leads entrantes (web)
const formId = uuid();
await insert("LeadForm", [{ id: formId, tenantId: T, name: "Formulario del sitio web", campaign: "siembra-2026", publicKey: `pk_${uuid().replace(/-/g, "").slice(0, 20)}`, enabled: true, allowedOrigins: ["https://northlinemarket.co"], createdAt: daysAgo(120) }]);
const contactLeads = [];
for (let i = 0; i < 34; i++) {
  const n = name();
  contactLeads.push({
    id: uuid(), tenantId: T, name: n, phone: phone(), email: email(n),
    message: pick(["Quiero cotizar una dotación para mi oficina.", "¿Tienen disponible el sofá en gris?", "Necesito 20 kits de regalo corporativo.", "¿Hacen envíos a Medellín?", "Me interesa el plan mayorista."]),
    origin: JSON.stringify({ source: pick(["instagram", "google", "facebook", "directo"]), form: "sitio-web" }), createdAt: daysAgo(int(0, 90)),
  });
}
await insert("ContactLead", contactLeads);

// ─────────────────────────────── WhatsApp ───────────────────────────────
const waConn = uuid();
await insert("ExternalConnection", [{
  id: waConn, tenantId: T, kind: "MESSAGING", provider: "whatsapp", environment: "production", status: "CONNECTED",
  credentialsEnc: null, credentialsKeyId: null, config: JSON.stringify({ phoneNumberId: "1029384756", displayName: "Northline Market", wabaId: "998877665544" }),
  lastCheckedAt: daysAgo(0), lastError: null, createdAt: daysAgo(200), updatedAt: daysAgo(0),
}]);
await insert("ExternalConnection", [
  { id: uuid(), tenantId: T, kind: "PAYMENT", provider: "wompi", environment: "production", status: "CONNECTED", credentialsEnc: null, credentialsKeyId: null, config: JSON.stringify({ merchantId: "northline-wompi" }), lastCheckedAt: daysAgo(1), lastError: null, createdAt: daysAgo(190), updatedAt: daysAgo(1) },
  { id: uuid(), tenantId: T, kind: "EINVOICE", provider: "dian_mock", environment: "production", status: "CONNECTED", credentialsEnc: null, credentialsKeyId: null, config: JSON.stringify({ nit: "901555888-4", resolution: "18760000001234" }), lastCheckedAt: daysAgo(1), lastError: null, createdAt: daysAgo(190), updatedAt: daysAgo(1) },
]);

const WA_THREADS = [
  ["¿Hola, tienen disponible el air fryer de 5.5 litros?", "¡Hola! Sí, lo tenemos disponible en tienda y con envío el mismo día en Bogotá."],
  ["Quiero hacer un pedido de 20 kits de regalo corporativo.", "Perfecto, te preparo la cotización con descuento por volumen y te la envío hoy."],
  ["¿Cuánto cuesta el envío a Medellín?", "El envío a Medellín tiene un costo de $18.000 y llega en 2 días hábiles."],
  ["Necesito cambiar la dirección de entrega de mi pedido.", "Claro, compárteme la nueva dirección y lo actualizamos antes del despacho."],
  ["¿Aceptan pago con Nequi?", "Sí, aceptamos Nequi, transferencia, tarjeta y efectivo en tienda."],
  ["¿La cobija King viene en otro color?", "Tenemos gris perla, beige y azul noche. ¿Cuál prefieres?"],
  ["Mi pedido llegó incompleto, falta un cojín.", "Lamento el inconveniente. Ya genero el envío del faltante sin costo."],
  ["¿Tienen factura electrónica?", "Sí, todas las compras generan factura electrónica automáticamente."],
  ["Quiero saber si el sofá está en promoción.", "Está con 15% de descuento hasta el domingo. Te reservo la unidad."],
  ["¿Puedo recoger en la tienda del centro?", "Sí, puedes elegir recogida en tienda al finalizar la compra."],
  ["Gracias por la atención, quedó hermoso.", "¡Gracias a ti! Nos alegra que te haya gustado. Cualquier cosa estamos aquí."],
  ["¿Hacen instalación de la lámpara?", "Sí, la instalación tiene un costo adicional de $45.000 en Bogotá."],
  ["Necesito la cotización para aprobación de gerencia.", "Claro, te envío el PDF con la validez de 15 días."],
  ["¿Tienen stock del smartwatch en negro?", "Sí, quedan 12 unidades en negro y 5 en plateado."],
  ["¿Cuál es el horario de la tienda?", "Lun–Sáb de 9:00 a. m. a 8:00 p. m. y domingo de 11:00 a. m. a 5:00 p. m."],
  ["Me interesa el plan mayorista para mi negocio.", "Te comparto las condiciones: desde 30 unidades con 18% de descuento."],
  ["¿El envío es gratis?", "En compras superiores a $250.000 el envío es gratis en ciudades principales."],
  ["¿Puedo pagar contra entrega?", "Sí, en Bogotá manejamos pago contra entrega con recargo de $6.000."],
  ["Se dañó el secador a los 15 días.", "Cubrimos garantía. Trae el producto y la factura y lo revisamos de inmediato."],
  ["¿Tienen sillas ergonómicas para oficina?", "Sí, tenemos dos modelos desde $689.000 con entrega e instalación."],
  ["Quiero cancelar mi pedido.", "Entendido. Procedo con la cancelación y el reembolso al medio de pago original."],
  ["¿Manejan descuento por pago en efectivo?", "Sí, 5% de descuento adicional pagando en efectivo en tienda."],
  ["¿Puedo ver el catálogo completo?", "Te envío el enlace del catálogo en línea con todos los productos disponibles."],
  ["El pedido dice entregado pero no lo recibí.", "Voy a verificar con la transportadora y te confirmo en menos de 2 horas."],
];
const conversations = [];
const messages = [];
for (const [i, [inbound, outbound]] of WA_THREADS.entries()) {
  const customer = customerRows[(i * 7) % customerRows.length];
  const handle = customer.phoneNorm;
  const convId = uuid();
  const start = daysAgo(int(0, 25));
  const lastIn = new Date(start.getTime() + int(0, 3) * 3600_000);
  conversations.push({
    id: convId, tenantId: T, channel: "WHATSAPP", connectionId: waConn, contactHandle: handle, contactName: customer.name,
    customerId: customer.id, status: pick(["OPEN", "OPEN", "PENDING", "CLOSED"]), unread: int(0, 3),
    lastMessageAt: new Date(lastIn.getTime() + 600_000), lastInboundAt: lastIn, createdAt: start,
  });
  messages.push({ id: uuid(), tenantId: T, conversationId: convId, direction: "INBOUND", body: inbound, status: "RECEIVED", externalId: `wamid.${uuid().replace(/-/g, "")}`, error: null, createdById: null, createdAt: lastIn });
  messages.push({ id: uuid(), tenantId: T, conversationId: convId, direction: "OUTBOUND", body: outbound, status: "DELIVERED", externalId: `wamid.${uuid().replace(/-/g, "")}`, error: null, createdById: staffId(int(0, staff.length - 1)), createdAt: new Date(lastIn.getTime() + 600_000) });
  if (chance(0.5)) messages.push({ id: uuid(), tenantId: T, conversationId: convId, direction: "INBOUND", body: pick(["Perfecto, gracias.", "Listo, quedo atento.", "¿Me confirmas el valor total?", "¿Puedo pagar con tarjeta?", "Muchas gracias."]), status: "RECEIVED", externalId: `wamid.${uuid().replace(/-/g, "")}`, error: null, createdById: null, createdAt: new Date(lastIn.getTime() + 1_200_000) });
}
await insert("BusinessConversation", conversations);
await insert("BusinessMessage", messages);

const noticeRows = [];
for (let i = 0; i < 40; i++) {
  noticeRows.push({
    id: uuid(), tenantId: T, customerId: pick(customerRows).id, event: pick(["ORDER_PAID", "ORDER_SHIPPED", "INVOICE_DUE", "REVIEW_REQUEST"]),
    templateKey: pick(["pedido_pagado", "pedido_enviado", "factura_por_vencer", "resena"]), sourceId: null, messageId: null,
    variables: JSON.stringify({ nombre: name(), numero: `FV-${int(100, 900)}` }), status: pick(["SENT", "SENT", "PENDING", "FAILED"]),
    reason: null, processedAt: daysAgo(int(0, 20)), createdAt: daysAgo(int(0, 25)),
  });
}
await insert("WhatsappNotice", noticeRows);

// ─────────────────────────────── soporte ───────────────────────────────
const tickets = [];
const ticketMessages = [];
const surveys = [];
// `SupportTicket` es único por (year, seq) en TODA la base, no por negocio:
// arrancamos después del máximo existente para no chocar con otros tenants.
let ticketSeq = Number((await client.query(`SELECT COALESCE(max(seq), 900)::int AS n FROM "SupportTicket" WHERE year = 2026`)).rows[0].n);
for (let i = 0; i < 30; i++) {
  const tId = uuid();
  const customer = pick(customerRows);
  const created = daysAgo(int(0, 90));
  const status = pick(["NEW", "OPEN", "OPEN", "WAITING_CUSTOMER", "RESOLVED", "RESOLVED", "CLOSED"]);
  const subject = pick(["Pedido incompleto", "Producto defectuoso", "Solicitud de garantía", "Cobro duplicado", "Cambio de dirección de envío", "Consulta de factura", "Demora en la entrega", "Solicitud de devolución"]);
  ticketSeq += 1;
  tickets.push({
    id: tId, tenantId: T, seq: ticketSeq, year: 2026, category: pick(["Pedido", "Producto", "Pago", "Garantía", "Envío"]),
    channel: pick(["WHATSAPP", "EMAIL", "WEB", "PHONE"]), priority: pick(["LOW", "NORMAL", "NORMAL", "HIGH", "URGENT"]),
    status, subject, description: `${subject}. El cliente ${customer.name} reporta la novedad y solicita solución.`,
    requesterName: customer.name, requesterContact: customer.phone, assigneeId: staffId(int(0, staff.length - 1)),
    solution: status === "RESOLVED" || status === "CLOSED" ? "Se gestionó con el área correspondiente y se dio respuesta al cliente." : null,
    firstResponseAt: chance(0.8) ? new Date(created.getTime() + int(1, 20) * 3600_000) : null,
    resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date(created.getTime() + int(1, 5) * day) : null,
    closedAt: status === "CLOSED" ? new Date(created.getTime() + int(2, 8) * day) : null,
    createdAt: created, updatedAt: daysAgo(int(0, 5)),
  });
  ticketMessages.push({ id: uuid(), ticketId: tId, authorName: customer.name, authorStaffId: null, body: `Hola, tengo un problema: ${subject.toLowerCase()}. ¿Me pueden ayudar?`, internal: false, createdAt: created });
  ticketMessages.push({ id: uuid(), ticketId: tId, authorName: pick(staff).name ?? "Equipo Northline", authorStaffId: staffId(int(0, staff.length - 1)), body: pick(["Hola, gracias por escribirnos. Ya estamos revisando tu caso.", "Lamentamos el inconveniente. Vamos a solucionarlo hoy mismo.", "Te comparto el número de radicado y el tiempo estimado de respuesta."]), internal: false, createdAt: new Date(created.getTime() + 2 * 3600_000) });
  if (status === "RESOLVED" || status === "CLOSED") {
    ticketMessages.push({ id: uuid(), ticketId: tId, authorName: pick(staff).name ?? "Equipo Northline", authorStaffId: staffId(int(0, staff.length - 1)), body: "Caso resuelto. Quedamos atentos a cualquier novedad.", internal: false, createdAt: new Date(created.getTime() + 2 * day) });
    if (chance(0.7)) {
      const score = int(3, 5);
      surveys.push({
        id: uuid(), tenantId: T, ticketId: tId, token: uuid().replace(/-/g, ""), assigneeId: staffId(int(0, staff.length - 1)),
        score, nps: score >= 5 ? 10 : score === 4 ? 8 : 6, comment: pick(["Excelente atención.", "Muy rápido, gracias.", "Todo bien.", "Podrían mejorar el tiempo de respuesta.", "Quedé muy satisfecho."]),
        sentAt: new Date(created.getTime() + 2 * day), answeredAt: chance(0.8) ? new Date(created.getTime() + 3 * day) : null, createdAt: created,
      });
    }
  }
}
await insert("SupportTicket", tickets);
await insert("TicketMessage", ticketMessages);
await insert("SatisfactionSurvey", surveys);

// ─────────────────────────── sitio, Google y reseñas ───────────────────────────
await insert("SiteConfig", [{
  id: uuid(), tenantId: T, enabled: true, siteSlug: NEW_SLUG, template: "moderna",
  title: "Northline Market · Hogar, tecnología y regalos",
  description: "Tienda de diseño y tecnología en Bogotá. Productos para el hogar, accesorios y regalos corporativos con entrega el mismo día.",
  heroTitle: "Diseño que se siente en casa",
  heroSubtitle: "Tecnología, hogar y detalles que hacen la diferencia. Envío gratis en compras superiores a $250.000.",
  about: "Somos una tienda bogotana que cura piezas de diseño, tecnología y bienestar para espacios reales. Atendemos personas y empresas con asesoría personalizada, entrega el mismo día y garantía respaldada.",
  accent: "#1F6F5C", showCatalog: true, showMap: true, createdAt: daysAgo(200), updatedAt: daysAgo(1),
}]);
await insert("GoogleListing", [{
  id: uuid(), tenantId: T, placeId: "ChIJnorthlinebogota01", name: "Northline Market", address: "Calle 85 # 15-32, Bogotá",
  phone: "+57 601 742 8890", website: "https://northlinemarket.co", rating: 4.7, ratingCount: 284,
  status: "CONNECTED", lastError: null, syncedAt: daysAgo(0), createdAt: daysAgo(200),
}]);

const REVIEW_TEXTS = [
  ["La atención fue impecable y el envío llegó antes de lo esperado.", 5],
  ["Me encantó la calidad de la cobija. Volveré a comprar.", 5],
  ["Buen producto, aunque el empaque llegó un poco golpeado.", 4],
  ["El air fryer funciona perfecto. Excelente relación precio-calidad.", 5],
  ["Tardaron un día más de lo prometido, pero valió la pena.", 4],
  ["El equipo de la tienda me ayudó a elegir el regalo ideal.", 5],
  ["El sofá es hermoso, tal cual la foto.", 5],
  ["Tuve un inconveniente y lo resolvieron rápido por WhatsApp.", 4],
  ["Muy buena variedad y precios justos.", 5],
  ["La instalación quedó perfecta.", 5],
  ["Podrían mejorar el seguimiento del envío.", 3],
  ["Los audífonos suenan increíble.", 5],
];
const reviews = [];
for (let i = 0; i < 64; i++) {
  const [comment, rating] = pick(REVIEW_TEXTS);
  reviews.push({
    id: uuid(), tenantId: T, customerName: name(), rating, comment, source: pick(["GOOGLE", "GOOGLE", "INTERNAL", "WHATSAPP"]),
    status: pick(["NEW", "HANDLED", "HANDLED", "IGNORED"]), contact: chance(0.5) ? email("cliente northline") : null,
    handledAt: chance(0.6) ? daysAgo(int(0, 20)) : null, createdAt: daysAgo(int(0, 120)),
  });
}
await insert("Review", reviews);

await insert("TrackedLink", [
  { id: uuid(), tenantId: T, name: "Instagram · siembra", code: "nm-inst", path: "", utmSource: "instagram", utmMedium: "social", utmCampaign: "siembra", clicks: 1840, spend: 320000, active: true, createdAt: daysAgo(120) },
  { id: uuid(), tenantId: T, name: "Google Ads · hogar", code: "nm-gg-hogar", path: "catalogo", utmSource: "google", utmMedium: "cpc", utmCampaign: "hogar", clicks: 962, spend: 780000, active: true, createdAt: daysAgo(90) },
  { id: uuid(), tenantId: T, name: "WhatsApp · regalos", code: "nm-wa-regalos", path: "", utmSource: "whatsapp", utmMedium: "messaging", utmCampaign: "regalos", clicks: 430, spend: 0, active: true, createdAt: daysAgo(60) },
  { id: uuid(), tenantId: T, name: "Facebook · tecnología", code: "nm-fb-tech", path: "catalogo", utmSource: "facebook", utmMedium: "social", utmCampaign: "tecnologia", clicks: 611, spend: 210000, active: true, createdAt: daysAgo(45) },
  { id: uuid(), tenantId: T, name: "Email · clientes VIP", code: "nm-mail-vip", path: "", utmSource: "newsletter", utmMedium: "email", utmCampaign: "vip", clicks: 287, spend: 0, active: true, createdAt: daysAgo(30) },
  { id: uuid(), tenantId: T, name: "TikTok · lanzamiento", code: "nm-tt-launch", path: "catalogo", utmSource: "tiktok", utmMedium: "social", utmCampaign: "lanzamiento", clicks: 1204, spend: 150000, active: false, createdAt: daysAgo(20) },
]);

// ─────────────────────────────── contabilidad ───────────────────────────────
const periods = [];
for (let m = 0; m < 7; m++) {
  const d = new Date(Date.UTC(2026, 10 - m, 1));
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const closed = m > 0;
  periods.push({
    id: uuid(), tenantId: T, year, month, status: closed ? "CLOSED" : "OPEN",
    closedById: closed ? staffId(0) : null, closedAt: closed ? new Date(Date.UTC(year, month, 1) + 5 * day) : null,
    note: closed ? "Periodo cerrado" : "Periodo en curso", reopenedAt: null, createdAt: new Date(Date.UTC(year, month - 1, 1)),
  });
}
await insert("AccountingPeriod", periods);
await insert("CostCenter", [
  { id: uuid(), tenantId: T, code: "CC-01", name: "Ventas", kind: "CENTER", active: true, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, code: "CC-02", name: "Bodega y logística", kind: "CENTER", active: true, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, code: "CC-03", name: "Administración", kind: "CENTER", active: true, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, code: "CC-04", name: "Marketing", kind: "CENTER", active: true, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, code: "CC-05", name: "Tienda centro", kind: "CENTER", active: true, createdAt: daysAgo(200) },
]);
await insert("TaxRate", [
  { id: uuid(), tenantId: T, code: "IVA19", name: "IVA general 19%", kind: "VAT", ratePct: 19, minBase: 0, active: true, validFrom: daysAgo(400), validTo: null, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, code: "IVA5", name: "IVA 5%", kind: "VAT", ratePct: 5, minBase: 0, active: true, validFrom: daysAgo(400), validTo: null, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, code: "INC8", name: "Impuesto nacional al consumo 8%", kind: "CONSUMPTION", ratePct: 8, minBase: 0, active: true, validFrom: daysAgo(400), validTo: null, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, code: "RFTE2.5", name: "Retención en la fuente 2.5%", kind: "WITHHOLDING", ratePct: 2.5, minBase: 0, active: true, validFrom: daysAgo(400), validTo: null, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, code: "RETEIVA15", name: "ReteIVA 15%", kind: "WITHHOLDING", ratePct: 15, minBase: 0, active: true, validFrom: daysAgo(400), validTo: null, createdAt: daysAgo(200) },
  { id: uuid(), tenantId: T, code: "ICA0.966", name: "ICA Bogotá 0.966%", kind: "OTHER", ratePct: 0.966, minBase: 0, active: true, validFrom: daysAgo(400), validTo: null, createdAt: daysAgo(200) },
]);

const entries = [];
const entryLines = [];
let entryNumber = 0;
const saleInvoices = invoiceRows.filter((r) => r.kind === "SALE").slice(0, 300);
const addEntry = (date, description, event, sourceType, sourceId, lines) => {
  entryNumber += 1;
  const eId = uuid();
  const hash = crypto.createHash("sha256").update(`${T}|${entryNumber}|${description}`).digest("hex").slice(0, 32);
  entries.push({ id: eId, tenantId: T, number: entryNumber, date: isoDate(date), description, event, sourceType, sourceId, hash, reversalOfId: null, createdById: staffId(0), createdAt: date });
  for (const l of lines) {
    entryLines.push({ id: uuid(), tenantId: T, entryId: eId, accountCode: l.account, debit: money(l.debit ?? 0), credit: money(l.credit ?? 0), label: l.label ?? null, partyId: l.partyId ?? null, costCenterId: null });
  }
};
for (const inv of saleInvoices) {
  addEntry(inv.issueDate, `Venta ${inv.prefix}-${seq(inv.number)} · ${inv.customerName}`, "SALE", "INVOICE", inv.id, [
    { account: "1305", debit: inv.total, label: "Cliente" },
    { account: "4135", credit: inv.subtotal, label: "Ingreso por ventas" },
    { account: "2408", credit: inv.taxTotal, label: "IVA generado" },
  ]);
  const cost = money(inv.subtotal * 0.48);
  addEntry(inv.issueDate, `Costo de venta ${inv.prefix}-${seq(inv.number)}`, "SALE_COST", "INVOICE", inv.id, [
    { account: "6135", debit: cost, label: "Costo de ventas" },
    { account: "1435", credit: cost, label: "Inventario" },
  ]);
  if (inv.status === "PAID") {
    addEntry(new Date(inv.issueDate.getTime() + 3600_000), `Cobro ${inv.prefix}-${seq(inv.number)}`, "PAYMENT_RECEIVED", "INVOICE", inv.id, [
      { account: "1105", debit: inv.total, label: "Caja o banco" },
      { account: "1305", credit: inv.total, label: "Cliente" },
    ]);
  }
}
for (const e of expenses.slice(0, 120)) {
  addEntry(e.date, `${e.category} · ${e.description}`, "EXPENSE_PAID", "EXPENSE", e.id, [
    { account: "5195", debit: e.amount, label: "Gasto" },
    { account: "1105", credit: e.amount, label: "Caja o banco" },
  ]);
}
await insert("JournalEntry", entries);
await insert("JournalLine", entryLines);

// ─────────────────────────────── facturación NEXUS ───────────────────────────────
let sub = (await client.query(`SELECT id FROM "Subscription" WHERE "tenantId"=$1 LIMIT 1`, [T])).rows[0];
if (!sub) {
  sub = { id: uuid() };
  await insert("Subscription", [{ id: sub.id, tenantId: T, plan: "SIGNATURE", status: "ACTIVE", priceUsdCents: 7900, billingCycle: "MONTHLY", currentPeriodStart: daysAgo(9), currentPeriodEnd: daysAgo(-21), notes: "Plan Signature activo", cancelledAt: null, cancelReason: null, createdAt: daysAgo(200), updatedAt: daysAgo(0) }]);
}
if (sub) {
  await client.query(`UPDATE "Subscription" SET plan='SIGNATURE', status='ACTIVE', "priceUsdCents"=7900, "billingCycle"='MONTHLY', "currentPeriodStart"=$2, "currentPeriodEnd"=$3, notes='Plan Signature activo', "updatedAt"=now() WHERE id=$1`, [sub.id, daysAgo(9), daysAgo(-21)]);
  const charges = [];
  for (let i = 3; i >= 1; i--) {
    const start = daysAgo(i * 30);
    const end = daysAgo((i - 1) * 30);
    charges.push({
      id: uuid(), subscriptionId: sub.id, tenantId: T, amountUsdCents: 7900, status: "PAID", method: pick(["CARD", "TRANSFER"]),
      reference: `NX-${2026}${String(11 - i).padStart(2, "0")}-${int(1000, 9999)}`, dueAt: end, periodStart: start, periodEnd: end,
      paidAt: end, confirmedAt: end, confirmedById: null, recordedById: null, noticeSentAt: null, refundedAt: null, refundReason: null, voidReason: null,
      notes: "Suscripción mensual Signature", createdAt: start, updatedAt: end,
    });
  }
  const nowStart = daysAgo(9);
  charges.push({
    id: uuid(), subscriptionId: sub.id, tenantId: T, amountUsdCents: 7900, status: "PENDING", method: "CARD",
    reference: `NX-202612-${int(1000, 9999)}`, dueAt: daysAgo(-21), periodStart: nowStart, periodEnd: daysAgo(-21),
    paidAt: null, confirmedAt: null, confirmedById: null, recordedById: null, noticeSentAt: null, refundedAt: null, refundReason: null, voidReason: null,
    notes: "Suscripción mensual Signature", createdAt: nowStart, updatedAt: nowStart,
  });
  await insert("Charge", charges);
}

const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
await insert("UsageCounter", [
  { id: uuid(), tenantId: T, meter: "customers", period, quantity: customerRows.length, limitQuantity: null, updatedAt: daysAgo(0) },
  { id: uuid(), tenantId: T, meter: "users", period, quantity: staff.length, limitQuantity: null, updatedAt: daysAgo(0) },
  { id: uuid(), tenantId: T, meter: "invoices", period, quantity: invoiceRows.length, limitQuantity: null, updatedAt: daysAgo(0) },
  { id: uuid(), tenantId: T, meter: "whatsapp_messages", period, quantity: messages.length, limitQuantity: null, updatedAt: daysAgo(0) },
  { id: uuid(), tenantId: T, meter: "storage_mb", period, quantity: 1840, limitQuantity: null, updatedAt: daysAgo(0) },
  { id: uuid(), tenantId: T, meter: "api_calls", period, quantity: 12840, limitQuantity: null, updatedAt: daysAgo(0) },
]);

// ─────────────────────────────── cierre ───────────────────────────────
if (DRY) {
  await client.query("ROLLBACK");
  console.log("\nDRY-RUN: rollback hecho. Nada se guardó.");
} else {
  await client.query("COMMIT");
  console.log("\nDatos sembrados y confirmados.");
}
console.log("\nFilas por tabla:");
for (const [t, n] of Object.entries(counts).sort()) console.log(`  ${t.padEnd(24)} ${n}`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("\nError — se revirtió todo:", err.message);
  console.error(err.detail ?? "", err.hint ?? "");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
