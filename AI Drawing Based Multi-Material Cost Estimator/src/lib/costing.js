// ---------------------------------------------------------------------------
// COSTING ENGINE
// Pure functions — every page derives its numbers from here so that a change
// anywhere (rate, cycle time, %, quantity) propagates instantly and identically.
// ---------------------------------------------------------------------------

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

/** Cost of one process step, broken into auditable components. */
export function stepCost(step, ctx) {
  const { lotQty, labourRate, grossWeightKg, areaDm2, energyRatePerHr } = ctx
  const lot = Math.max(1, n(lotQty))
  const runHr = n(step.cycleMin) / 60
  const machine = runHr * n(step.rate)
  const setup = (n(step.setupMin) / 60) * n(step.rate) / lot
  const labour = runHr * n(labourRate) * n(step.labourFactor ?? 1)
  const energy = n(step.rate) > 0 ? runHr * n(energyRatePerHr) : 0
  const tooling = n(step.toolCostPerPart)

  let extras = 0
  const extraLines = (step.extras || []).map((e) => {
    let amt = 0
    if (e.basis === 'part') amt = n(e.amount)
    else if (e.basis === 'lot') amt = n(e.amount) / lot
    else if (e.basis === 'kg') amt = n(e.amount) * n(grossWeightKg)
    else if (e.basis === 'dm2') amt = n(e.amount) * n(areaDm2)
    extras += amt
    return { ...e, perPart: amt }
  })

  const direct = machine + setup + tooling + extras // excludes labour & energy (reported separately)
  return {
    uid: step.uid,
    name: step.name,
    category: step.category,
    machine, setup, tooling, extras, labour, energy,
    extraLines,
    direct,
    total: direct + labour + energy,
  }
}

/**
 * Full estimate for one material + route combination.
 * @returns a fully itemised, chart-ready cost object.
 */
export function computeEstimate({ material, route, netWeightKg, areaDm2, params }) {
  const p = params
  const lotQty = Math.max(1, n(p.lotQty))
  const scrapPct = n(p.scrapPct ?? material.scrapAllowancePct)
  const netW = n(netWeightKg)
  const grossW = netW * (1 + scrapPct / 100)

  const price = n(material.price) * (1 + n(p.materialPriceDeltaPct) / 100)
  const materialCost = grossW * price
  const scrapRecovery = (grossW - netW) * n(price) * (n(p.scrapRecoveryPct) / 100)

  const ctx = {
    lotQty,
    labourRate: n(p.labourRate),
    grossWeightKg: grossW,
    areaDm2: n(areaDm2),
    energyRatePerHr: n(p.energyRatePerHr),
  }

  // What-if levers from the simulator. An absolute minute change is shared out
  // across the operations in proportion to their own cycle time.
  const baseCycle = (route?.steps || []).reduce((a, s) => a + n(s.cycleMin), 0)
  const absShare = n(p.cycleTimeDeltaMin)

  const steps = (route?.steps || []).map((s) => {
    const adj = { ...s }
    let c = n(s.cycleMin)
    if (p.cycleTimeDeltaPct) c = c * (1 + n(p.cycleTimeDeltaPct) / 100)
    if (absShare && baseCycle > 0) c = c + absShare * (n(s.cycleMin) / baseCycle)
    adj.cycleMin = Math.max(0, c)
    if (p.machineRateDeltaPct) adj.rate = n(s.rate) * (1 + n(p.machineRateDeltaPct) / 100)
    return stepCost(adj, ctx)
  })

  const sumBy = (fn) => steps.filter(fn).reduce((a, s) => a + s.direct, 0)
  const machiningCost = sumBy((s) => s.category === 'Machining')
  const processCost = sumBy((s) => ['Casting', 'Forging', 'Fabrication', 'Moulding'].includes(s.category))
  const heatTreatmentCost = sumBy((s) => s.category === 'Heat Treatment') * (1 + n(p.htDeltaPct) / 100)
  const surfaceTreatmentCost = sumBy((s) => s.category === 'Surface Treatment') * (1 + n(p.stDeltaPct) / 100)
  const labourCost = steps.reduce((a, s) => a + s.labour, 0) * (1 + n(p.labourRateDeltaPct) / 100)
  const energyCost = steps.reduce((a, s) => a + s.energy, 0)

  const toolingCost = n(p.toolingCost) / Math.max(1, n(p.toolingLifeQty))
  const fixtureCost = n(p.fixtureCost) / Math.max(1, n(p.fixtureLifeQty))
  const inspectionCost = n(p.inspectionCost)
  const ndtCost = n(p.ndtCost)
  const packagingCost = n(p.packagingCost)
  const otherCost = n(p.otherCost)
  const qualityCost = inspectionCost + ndtCost

  const subtotal =
    materialCost - scrapRecovery + processCost + machiningCost + labourCost + energyCost +
    toolingCost + fixtureCost + heatTreatmentCost + surfaceTreatmentCost +
    qualityCost + packagingCost + otherCost

  const rejectionCost = subtotal * (n(p.rejectionPct) / 100)
  const manufacturingCost = subtotal + rejectionCost
  const overhead = manufacturingCost * (n(p.overheadPct) / 100)
  const profit = (manufacturingCost + overhead) * (n(p.profitPct) / 100)
  const total = manufacturingCost + overhead + profit

  const totalCycleMin = Math.max(0, baseCycle * (1 + n(p.cycleTimeDeltaPct) / 100) + absShare)

  return {
    materialId: material.id,
    materialName: material.name,
    materialGrade: material.grade,
    density: material.density,
    price,
    netWeightKg: Number(netW.toFixed(3)),
    grossWeightKg: Number(grossW.toFixed(3)),
    scrapPct,
    recommendedProcess: route?.recommended || '—',
    steps,
    lines: {
      materialCost,
      scrapRecovery,
      processCost,
      machiningCost,
      labourCost,
      energyCost,
      toolingCost,
      fixtureCost,
      heatTreatmentCost,
      surfaceTreatmentCost,
      inspectionCost,
      ndtCost,
      qualityCost,
      packagingCost,
      otherCost,
      rejectionCost,
      overhead,
      profit,
    },
    subtotal,
    manufacturingCost,
    total,
    totalCycleMin,
    batchCost: total * lotQty,
    annualCost: total * Math.max(0, n(p.annualQty)),
    lotQty,
    annualQty: n(p.annualQty),
  }
}

/** Breakdown rows for the KPI card / pie chart (section 10). */
export function breakdownRows(est) {
  if (!est) return []
  const L = est.lines
  return [
    { key: 'Material', value: L.materialCost - L.scrapRecovery },
    { key: 'Process', value: L.processCost },
    { key: 'Machining', value: L.machiningCost },
    { key: 'Labour', value: L.labourCost + L.energyCost },
    { key: 'Tooling', value: L.toolingCost + L.fixtureCost },
    { key: 'Quality', value: L.qualityCost },
    { key: 'Heat Treatment', value: L.heatTreatmentCost },
    { key: 'Surface Treatment', value: L.surfaceTreatmentCost },
    { key: 'Scrap / Rejection', value: L.rejectionCost },
    { key: 'Overhead', value: L.overhead },
    { key: 'Profit', value: L.profit },
  ].filter((r) => Math.abs(r.value) > 0.005)
}

export const DEFAULT_PARAMS = {
  lotQty: 500,
  annualQty: 6000,
  labourRate: 320,
  energyRatePerHr: 95,
  overheadPct: 18,
  profitPct: 12,
  rejectionPct: 3,
  scrapPct: null, // null = use the material's own default allowance
  scrapRecoveryPct: 35,
  toolingCost: 45000,
  toolingLifeQty: 12000,
  fixtureCost: 60000,
  fixtureLifeQty: 20000,
  inspectionCost: 14,
  ndtCost: 9,
  packagingCost: 11,
  otherCost: 6,
  // what-if deltas (simulator)
  materialPriceDeltaPct: 0,
  cycleTimeDeltaPct: 0,
  cycleTimeDeltaMin: 0,
  machineRateDeltaPct: 0,
  labourRateDeltaPct: 0,
  htDeltaPct: 0,
  stDeltaPct: 0,
}
