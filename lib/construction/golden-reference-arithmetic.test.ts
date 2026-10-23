// verifica la aritmética de referencia, NO el motor
import { describe, test, expect } from "vitest"


const SCALE = 1_000_000n
const mul = (a: bigint, b: bigint) => (a * b) / SCALE // micro × micro → micro

// Concreto 3000 psi, 12,5 m³. Todo en micro-unidades (1_000_000 = 1,0).
const CANTIDAD = 12_500_000n
const LINEAS = {
  cemento:  { performance: 7_000_000n, price: 28_000_000_000n },
  arena:    { performance:   550_000n, price: 85_000_000_000n },
  grava:    { performance:   850_000n, price: 95_000_000_000n },
  oficial:  { performance:   600_000n, price: 90_000_000_000n },
  ayudante: { performance: 1_200_000n, price: 60_000_000_000n },
}

// costo de línea = performance × (1 + waste) × precio, una sola división por SCALE²
const lineCost = (perf: bigint, price: bigint, waste = 0n) =>
  (perf * (SCALE + waste) * price) / (SCALE * SCALE)

const unitario = (cementoWaste = 0n) =>
  lineCost(LINEAS.cemento.performance, LINEAS.cemento.price, cementoWaste) +
  lineCost(LINEAS.arena.performance, LINEAS.arena.price) +
  lineCost(LINEAS.grava.performance, LINEAS.grava.price) +
  lineCost(LINEAS.oficial.performance, LINEAS.oficial.price) +
  lineCost(LINEAS.ayudante.performance, LINEAS.ayudante.price)

// AIU: admin 10 %, imprevistos 5 %, utilidad 5 %, IVA 19 % solo sobre la utilidad
const aiu = (directo: bigint) => {
  const admin = mul(directo, 100_000n)
  const imprev = mul(directo, 50_000n)
  const utilidad = mul(directo, 50_000n)
  const iva = mul(utilidad, 190_000n)
  return { admin, imprev, utilidad, iva, total: directo + admin + imprev + utilidad + iva }
}

describe("Casos dorados - aritmética de referencia", () => {
  test("Caso 1: sin desperdicio - unitario 449.500, directo 5.618.750, total 6.795.878,125", () => {
    expect(unitario()).toBe(449_500_000_000n)

    const directo = mul(unitario(), CANTIDAD)
    expect(directo).toBe(5_618_750_000_000n)

    const r = aiu(directo)
    expect(r.admin).toBe(561_875_000_000n)
    expect(r.imprev).toBe(280_937_500_000n)
    expect(r.utilidad).toBe(280_937_500_000n)
    expect(r.iva).toBe(53_378_125_000n)
    expect(r.total).toBe(6_795_878_125_000n)
  })

  test("Caso 2: 10 % de desperdicio solo en cemento - unitario 469.100, total 7.092.205,625", () => {
    const waste = 100_000n // 10 %
    expect(lineCost(7_000_000n, 28_000_000_000n, waste)).toBe(215_600_000_000n)
    expect(unitario(waste)).toBe(469_100_000_000n)

    const directo = mul(unitario(waste), CANTIDAD)
    expect(directo).toBe(5_863_750_000_000n)

    const r = aiu(directo)
    expect(r.admin).toBe(586_375_000_000n)
    expect(r.imprev).toBe(293_187_500_000n)
    expect(r.utilidad).toBe(293_187_500_000n)
    expect(r.iva).toBe(55_705_625_000n)
    expect(r.total).toBe(7_092_205_625_000n)
  })

  test("El desperdicio solo en cemento suma 19.600 al unitario y 245.000 al directo", () => {
    const diffUnitario = unitario(100_000n) - unitario()
    expect(diffUnitario).toBe(19_600_000_000n) // 7 × 10 % × 28.000
    expect(mul(diffUnitario, CANTIDAD)).toBe(245_000_000_000n)
    expect(mul(unitario(100_000n), CANTIDAD) - mul(unitario(), CANTIDAD)).toBe(245_000_000_000n)
  })

  test("BOM cemento con 10 %: 12,5 × 7 × 1,1 = 96,25 bultos", () => {
    const qty = (LINEAS.cemento.performance * CANTIDAD * (SCALE + 100_000n)) / (SCALE * SCALE)
    expect(qty).toBe(96_250_000n)
  })

  test("BOM arena sin desperdicio: 0,55 × 12,5 = 6,875 m³", () => {
    expect(mul(LINEAS.arena.performance, CANTIDAD)).toBe(6_875_000n)
  })

  test("El 10 % en una sola línea NO es 10 % de toda la partida", () => {
    const diezPorCientoDeTodo = mul(mul(unitario(), CANTIDAD), 1_100_000n)
    expect(diezPorCientoDeTodo).toBe(6_180_625_000_000n)
    expect(diezPorCientoDeTodo).not.toBe(mul(unitario(100_000n), CANTIDAD))
  })
})
