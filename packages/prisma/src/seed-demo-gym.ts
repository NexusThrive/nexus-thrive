/**
 * Datos de DEMO de la plantilla Gym — para poder mostrar el producto.
 *
 * PRINCIPIOS
 * ----------
 * 1. DETERMINISTA. Sin `Math.random()` ni fechas absolutas: un LCG con semilla
 *    fija y fechas ancladas a `hoy`. Re-correr el seed debe dar SIEMPRE los
 *    mismos números — si el demo cambia cada vez, no sirve para enseñar ni
 *    para comparar screenshots.
 *
 * 2. ID-FIJOS en todo. Se hace upsert por id, no create: el seed tiene que ser
 *    idempotente, se corre varias veces contra la misma base.
 *
 * 3. COHERENTE CON LA DERIVA DE ESTADOS. `derivaEstadosClientes()` (dashboard)
 *    recalcula ACTIVO/VENCIDO a partir de `periodoFin` en cada visita, así que
 *    el estado sembrado y la fecha tienen que concordar: vencido = periodoFin
 *    en pasado. CONGELADO no lo toca la deriva, ese sí va explícito.
 *
 * 4. ALCANCE A LA ORG. Todo se crea con `orgId` de la org del demo. Nada de
 *    `planId` cruzando orgs (ver lib/modulos/clientes/consultas.ts).
 */

import type { PrismaClient, MetodoPago, CategoriaGasto } from "@prisma/client";

/** LCG determinista (Numerical Recipes). Devuelve [0,1). */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const DIA = 86400000;

function ancla() {
  const h = new Date();
  h.setHours(12, 0, 0, 0);
  return h;
}

/**
 * Toma un elemento por índice cíclico, con el tipo estrecho.
 * El repo tiene `noUncheckedIndexedAccess`, así que `lista[i]` es
 * `T | undefined`; esto concentrate el chequeo en un solo lugar y falla
 * ruidosamente si la lista está vacía en vez de sembrar `undefined`.
 */
function elegir<T>(lista: readonly T[], i: number): T {
  const v = lista[(((i % lista.length) + lista.length) % lista.length)];
  if (v === undefined) throw new Error("elegir() sobre lista vacía");
  return v;
}

/** Plans de membresía del gym. */
const PLANOS = [
  { id: "demo-gym-plan-mensual", nombre: "Mensual", precio: 90000, duracionDias: 30 },
  { id: "demo-gym-plan-trimestral", nombre: "Trimestral", precio: 240000, duracionDias: 90 },
  { id: "demo-gym-plan-anual", nombre: "Anual", precio: 890000, duracionDias: 365 },
];

/**
 * CASOS INTERESANTES — socios escritos a mano, los que le dan narrativa al
 * demo: los que están por vencer, los congelados con motivo real, los vencidos.
 * Sus notas son cosas que un gym real anota (lesiones, viajes, embarazos).
 */
interface Socio {
  nombre: string;
  documento: string;
  telefono: string;
  plan: string;
  /** Días respecto a hoy hasta que vence la membresía (negativo = ya venció). */
  expira: number;
  congelado?: boolean;
  nota?: string;
}

const CASOS: Socio[] = [
  // Por vencer en ≤7 días — son los que llenan "Renovaciones próximas".
  { nombre: "Mariana Restrepo", documento: "1018472593", telefono: "3105550142", plan: "demo-gym-plan-mensual", expira: 3 },
  { nombre: "Julián Herrera", documento: "80192384", telefono: "3205550198", plan: "demo-gym-plan-mensual", expira: 5 },
  { nombre: "Laura Ospina", documento: "52998774", telefono: "3155550111", plan: "demo-gym-plan-trimestral", expira: 6 },
  { nombre: "Valentina Ríos", documento: "1094883021", telefono: "3185550159", plan: "demo-gym-plan-mensual", expira: 2 },
  { nombre: "Andrés Villamil", documento: "79220451", telefono: "3005550164", plan: "demo-gym-plan-mensual", expira: 13 },

  // Plan anual — se renueva cada 365 días, deja de aparecer en "por vencer".
  { nombre: "Carolina Buitrago", documento: "1152233987", telefono: "3115550127", plan: "demo-gym-plan-anual", expira: 240 },
  { nombre: "Camilo Zuluaga", documento: "16770344", telefono: "3195550172", plan: "demo-gym-plan-anual", expira: 120 },

  // Congelados: la deriva de estados NO los toca, así que van explícitos.
  { nombre: "Isabella Torres", documento: "1023345988", telefono: "3125550188", plan: "demo-gym-plan-mensual", expira: 31, congelado: true, nota: "Pausa por viaje hasta diciembre" },
  { nombre: "Tomás Escobar", documento: "79122456", telefono: "3055550131", plan: "demo-gym-plan-mensual", expira: 15, congelado: true, nota: "Lesión de rodilla — physioterapia" },
  { nombre: "Nicolás Parra", documento: "1013229987", telefono: "3165550122", plan: "demo-gym-plan-mensual", expira: 28, congelado: true, nota: "Embarazada — sin pesas" },
  { nombre: "Sofía Arenas", documento: "52991188", telefono: "3075550176", plan: "demo-gym-plan-trimestral", expira: 61, congelado: true },
  { nombre: "Manuela Londoño", documento: "43112207", telefono: "3045550195", plan: "demo-gym-plan-mensual", expira: 9, congelado: true },

  // Vencidos: la deriva los marca VENCIDO a partir de `periodoFin` en pasado.
  { nombre: "Ricardo Alexander Non", documento: "79001122", telefono: "3005550101", plan: "demo-gym-plan-mensual", expira: -4 },
  { nombre: "Paula Andrea Gómez", documento: "52998812", telefono: "3115550170", plan: "demo-gym-plan-mensual", expira: -9 },
  { nombre: "Óscar Iván Díaz", documento: "80122345", telefono: "3155550133", plan: "demo-gym-plan-trimestral", expira: -22 },
  { nombre: "Claudia Salamanca", documento: "1022299887", telefono: "3185550107", plan: "demo-gym-plan-mensual", expira: -35 },
  { nombre: "Héctor Mauricio Ruiz", documento: "79112233", telefono: "3195550121", plan: "demo-gym-plan-mensual", expira: -51 },
  { nombre: "Yeimy Tatiana Cruz", documento: "52997766", telefono: "3075550148", plan: "demo-gym-plan-anual", expira: -70 },
];

/** Nombre y apellido para llenar el resto del padrón de forma determinista. */
const NOMBRES = [
  "Laura", "Andrés", "Daniela", "Felipe", "Camilo", "Valentina", "Sebastián", "Isabella",
  "Mateo", "Sofía", "Nicolás", "Manuela", "Santiago", "Carolina", "Sebastián", "Valentina",
  "Juan", "Lucía", "David", "Mariana", "Julián", "Ana", "Carlos", "Paula",
  "Andrés", "Sara", "Miguel", "Daniel", "Juliana", "Alejandro", "Camila", "Juan",
  "Sofía", "Esteban", "Isabel", "Felipe", "Laura", "Nicolás", "Valeria", "Andrés",
];
const APELLIDOS = [
  "Restrepo", "Herrera", "Ospina", "Villamil", "Buitrago", "Quintero", "Mejía", "Cardona",
  "Ríos", "Zuluaga", "Torres", "Escobar", "Arenas", "Parra", "Londoño", "Gómez",
  "Díaz", "Salamanca", "Ruiz", "Cruz", "Bedoya", "Cardona", "Marín", "Duque",
  "Gallego", "Salazar", "Hoyos", "Correa", "Mejía", "Castaño", "Prieto", "Osorio",
  "Valencia", "Lozano", "Arango", "Piedra", "Narváez", "Ceballos", "Agudelo", "Restrepo",
];

/** Tamaño del padrón. Un gym de barrio con ~70 socios es creíble; con 24 la
 *  cuenta no cierra — los gastos fijos de un local no bajan de ~5M/mes. */
const PADRON = 88;

/**
 * Arma el padrón completo: los casos escritos a mano + el resto generado.
 * Determinista (usa el LCG), sin repetir nombre completo, y con vencimiento
 * repartido entre 8 y 39 días para que "Renovaciones próximas" no se llene
 * de 20 socios de golpe.
 */
function armarPadron(rnd: () => number): Socio[] {
  const usados = new Set(CASOS.map((s) => s.nombre));
  const planes = [
    "demo-gym-plan-mensual",
    "demo-gym-plan-mensual",
    "demo-gym-plan-mensual",
    "demo-gym-plan-trimestral",
    "demo-gym-plan-anual",
  ];

  for (let i = CASOS.length; i < PADRON; i++) {
    let nombre = "";
    for (let intento = 0; intento < 50; intento++) {
      const n = `${elegir(NOMBRES, Math.floor(rnd() * NOMBRES.length))} ${elegir(APELLIDOS, Math.floor(rnd() * APELLIDOS.length))}`;
      if (!usados.has(n)) { nombre = n; break; }
    }
    if (!nombre) throw new Error("no se pudo generar nombre único para el padrón");
    usados.add(nombre);

    // El plan anual reparte el ingreso en 12 meses: un gym real tiene una
    // mezcla, no todo mensual.
    const plan = elegir(planes, Math.floor(rnd() * planes.length));
    // Documento colombiano: 8-10 dígitos, único dentro del padrón.
    const documento = String(80000000 + Math.floor(rnd() * 19999999));

    CASOS.push({
      nombre,
      documento,
      telefono: `3${String(10 + Math.floor(rnd() * 40)).padStart(2, "0")}555${String(1000 + Math.floor(rnd() * 8999))}`,
      plan,
      expira: 8 + Math.floor(rnd() * 32),
    });
  }
  return CASOS;
}


const METODOS: MetodoPago[] = ["EFECTIVO", "TARJETA", "NEQUI", "TRANSFERENCIA", "EFECTIVO", "TARJETA"];

/**
 * Gastos fijos mensuales de un local de barrio con 88 socios: ≈ 4,2M/mes
 * contra ≈ 5,4M de ingresos, o sea un margen chico y sano (~20%).
 * Calibrado a MEDIDA, no a ojo: la primera versión uso cifras de un gym
 * grande con un padron de barrio y el balance salia en -10M/mes.
 *
 * Cada uno tiene su DÍA del mes, no todos el mismo: el arriendo se paga
 * temprano, la nómina a mitad de mes y quincenal, los servicios al final.
 * Con todo cargado el día 5 la vista "última semana" mostraba $0 en gastos
 * casi siempre, y el demo parecía un negocio sin erogaciones.
 */
const GASTOS_FIJOS: { categoria: CategoriaGasto; monto: number; descripcion: string; dia: number }[] = [
  { categoria: "ARRIENDO", monto: 2_100_000, descripcion: "Arriendo del local", dia: 1 },
  { categoria: "NOMINA", monto: 1_150_000, descripcion: "Nomina — primera quincena", dia: 15 },
  { categoria: "NOMINA", monto: 1_150_000, descripcion: "Nomina — segunda quincena", dia: 28 },
  { categoria: "SERVICIOS", monto: 280_000, descripcion: "Agua, luz e internet", dia: 22 },
];

/** Gastos que aparecen de vez en cuando a lo largo del año. */
const GASTOS_VARIABLES: { categoria: CategoriaGasto; monto: number; descripcion: string }[] = [
  { categoria: "MANTENIMIENTO", monto: 285_000, descripcion: "Mantenimiento de maquinas" },
  { categoria: "PUBLICIDAD", monto: 240_000, descripcion: "Pauta en redes sociales" },
  { categoria: "MANTENIMIENTO", monto: 410_000, descripcion: "Cambio de duchas y griferia" },
  { categoria: "PUBLICIDAD", monto: 520_000, descripcion: "Campana de fin de ano" },
  { categoria: "OTROS", monto: 95_000, descripcion: "Elementos de aseo y cafeteria" },
  { categoria: "MANTENIMIENTO", monto: 190_000, descripcion: "Reparacion del sistema de sonido" },
];

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export async function seedGym(prisma: PrismaClient, orgId: string) {
  const rnd = lcg(20260927); // semilla fija
  const hoy = ancla();
  const d = (n: number) => new Date(hoy.getTime() + n * DIA);
  // Pagos no más viejos que ~13 meses: más allá no entra en ningún rango del
  // dashboard (semana / mes / año) y solo infla la base.
  const earliest = new Date(hoy.getTime() - 400 * DIA);

  // ---------- Planes ----------
  for (const p of PLANOS) {
    await prisma.plan.upsert({
      where: { id: p.id },
      update: { nombre: p.nombre, precio: p.precio, duracionDias: p.duracionDias, activo: true },
      create: {
        id: p.id,
        orgId,
        nombre: p.nombre,
        precio: p.precio,
        duracionDias: p.duracionDias,
      },
    });
  }
  const planPorId = new Map(PLANOS.map((p) => [p.id, p]));

  // ---------- Socios ----------
  // `registros` guarda el socio YA resuelto junto a su id, para que el bucle de
  // pagos no tenga que buscarlo por índice (frágil y además `undefined`-able).
  const padron = armarPadron(rnd);
  const registros: { socio: Socio; id: string }[] = [];

  for (const [i, s] of padron.entries()) {
    const id = `demo-gym-cli-${String(i + 1).padStart(2, "0")}`;
    const periodoFin = d(s.expira);
    // La deriva recalcula ACTIVO/VENCIDO desde periodoFin, así que se siembra
    // lo que corresponde y no se depende de que la primera visita lo arregle.
    const estado = s.congelado ? "CONGELADO" : s.expira < 0 ? "VENCIDO" : "ACTIVO";
    // Ingreso ~4-9 meses antes del vencimiento: da historial de pagos.
    const ingreso = d(s.expira - 150 - Math.floor(rnd() * 150));

    await prisma.cliente.upsert({
      where: { id },
      update: {
        nombre: s.nombre,
        documento: s.documento,
        telefono: s.telefono,
        planId: s.plan,
        estado,
        periodoFin,
        nota: s.nota ?? null,
      },
      create: {
        id,
        orgId,
        nombre: s.nombre,
        documento: s.documento,
        telefono: s.telefono,
        email: null,
        planId: s.plan,
        estado,
        fechaIngreso: ingreso,
        periodoFin,
        nota: s.nota ?? null,
      },
    });
    registros.push({ socio: s, id });
  }

  // ---------- Pagos (histórico de ~13 meses) ----------
  // El último cobro de cada socio coincide con el INICIO de su período actual:
  //   últimoPago = periodoFin − duración del plan
  // y de ahí se camina hacia atrás un ciclo por cobro. Es lo que hace que los
  // ingresos cubran el mismo período que los gastos.
  //
  // Antes se caminaba desde `expira` con 4 ciclos fijos: un socio mensual
  // apenas daba 4 meses de historial frente a 12 meses de gastos, y el balance
  // anual salía en −30M. La demo parecía un negocio quebrado.
  let pagos = 0;
  for (const { socio: soc, id: clienteId } of registros) {
    const plan = planPorId.get(soc.plan);
    if (!plan) throw new Error(`plan desconocido en el socio ${soc.nombre}: ${soc.plan}`);

    // Los congelados no cobran: es el motivo de estar congelados.
    if (soc.congelado) continue;

    const ultimoPago = d(soc.expira - plan.duracionDias);
    let ciclo = 0;
    for (let pagadoEl = ultimoPago; pagadoEl >= earliest; pagadoEl = new Date(pagadoEl.getTime() - plan.duracionDias * DIA)) {
      // Nunca un cobro en el futuro (un plan anual "vence" dentro de un año,
      // pero su último cobro fue en el pasado).
      if (pagadoEl > hoy) continue;
      ciclo++;

      const id = `${clienteId}-p${ciclo}`;
      const metodo = elegir(METODOS, Math.floor(rnd() * METODOS.length));
      await prisma.pago.upsert({
        where: { id },
        update: { monto: plan.precio, metodo, anulado: false, motivoAnulacion: null },
        create: {
          id,
          orgId,
          clienteId,
          monto: plan.precio,
          metodo,
          concepto: `${plan.nombre} — ${MESES[pagadoEl.getMonth()]} ${pagadoEl.getFullYear()}`,
          periodoInicio: pagadoEl,
          periodoFin: new Date(pagadoEl.getTime() + plan.duracionDias * DIA),
          pagadoEl,
        },
      });
      pagos++;
    }
  }

  // Un pago anulado: la regla del producto es que un pago NUNCA se borra, se
  // anula con motivo. Sin uno sembrado la demo no muestra esa regla.
  const anuladoId = "demo-gym-pago-anulado";
  const planMensual = planPorId.get("demo-gym-plan-mensual")!;
  const primerSocio = elegir(registros, 0);
  await prisma.pago.upsert({
    where: { id: anuladoId },
    update: { anulado: true, motivoAnulacion: "Cobro duplicado en efectivo — se devolvió" },
    create: {
      id: anuladoId,
      orgId,
      clienteId: primerSocio.id,
      monto: planMensual.precio,
      metodo: "EFECTIVO",
      concepto: "Mensualidad — cobro duplicado",
      periodoInicio: d(-62),
      periodoFin: d(-32),
      pagadoEl: d(-60),
      anulado: true,
      motivoAnulacion: "Cobro duplicado en efectivo — se devolvió",
    },
  });

  // ---------- Gastos (últimos 12 meses) ----------
  let gastos = 0;
  for (let m = 11; m >= 0; m--) {
    for (const g of GASTOS_FIJOS) {
      // El día va en el id porque hay dos nóminas en el mismo mes: con solo la
      // categoría, la segunda sobrescribía a la primera.
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - m, g.dia, 9, 0, 0);
      if (fecha > hoy) continue;

      // Pequeña variación para que no se vea unnplanned perfectly.
      const monto = Math.round(g.monto * (0.97 + rnd() * 0.06));
      const id = `demo-gym-gas-${m}-${g.categoria.toLowerCase()}-${g.dia}`;
      await prisma.gasto.upsert({
        where: { id },
        update: { monto, descripcion: g.descripcion, anulado: false },
        create: { id, orgId, categoria: g.categoria, monto, descripcion: g.descripcion, fecha },
      });
      gastos++;
    }

    // Un gasto variable cada ~2 meses, en una fecha propia (no atada a los
    // días de los fijos) para que no coincida siempre con la nómina.
    if (m % 2 === 0) {
      const g = elegir(GASTOS_VARIABLES, Math.floor(rnd() * GASTOS_VARIABLES.length));
      const monto = Math.round(g.monto * (0.9 + rnd() * 0.2));
      const diaVar = 8 + Math.floor(rnd() * 18);
      const fechaVar = new Date(hoy.getFullYear(), hoy.getMonth() - m, diaVar, 11, 0, 0);
      if (fechaVar > hoy) continue;
      const id = `demo-gym-gasvar-${m}`;
      await prisma.gasto.upsert({
        where: { id },
        update: { monto, descripcion: g.descripcion },
        create: { id, orgId, categoria: g.categoria, monto, descripcion: g.descripcion, fecha: fechaVar },
      });
      gastos++;
    }
  }

  return { clientes: padron.length, pagos: pagos + 1, gastos };
}
