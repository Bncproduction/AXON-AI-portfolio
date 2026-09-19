import { SRC, isAvailable } from './sources.js'
import { money, num } from './format.js'

/**
 * Single source of truth for the transparency register: every number that
 * influences the estimate, with where it came from.
 */
export function collectAssumptions({ analysis, volume, estimates, params, drawing }) {
  const rows = []
  const push = (group, parameter, value, source, note) => rows.push({ group, parameter, value, source, note })

  if (drawing) {
    push('Drawing', 'Drg./Part No.', drawing.drawingNumber || '—', SRC.DRAWING, 'Title block / upload record.')
    push('Drawing', 'Part number', drawing.partNumber || '—', SRC.DRAWING, 'Title block / upload record.')
    push('Drawing', 'Revision', drawing.revision || '—', SRC.DRAWING, 'Costing is valid for this revision only.')
  }

  if (analysis) {
    const dims = analysis.dimensions || {}
    Object.entries({ length: 'Overall length', width: 'Overall width', height: 'Overall height', diameter: 'Diameter', thickness: 'Thickness', wallThickness: 'Wall thickness' })
      .forEach(([k, label]) => {
        const fld = dims[k]
        push('Geometry', label, isAvailable(fld) ? `${fld.value} mm` : 'Not Available in Drawing', fld?.source || SRC.NA, fld?.note || '')
      })
    const mat = analysis.material?.specification
    push('Material', 'Drawing material callout', isAvailable(mat) ? mat.value : 'Not Available in Drawing', mat?.source || SRC.NA, mat?.note || '')
    const tol = analysis.quality?.tolerances
    push('Quality', 'Tolerance class', isAvailable(tol) ? tol.value : 'Not Available in Drawing', tol?.source || SRC.NA, '')
    const ra = analysis.quality?.surfaceFinish
    push('Quality', 'Surface finish', isAvailable(ra) ? ra.value : 'Not Available in Drawing', ra?.source || SRC.NA, '')
    const w = analysis.weight
    push('Weight', 'Drawing mass callout', isAvailable(w) ? `${w.value} kg` : 'Not Available in Drawing', w?.source || SRC.NA, w?.note || '')
  }

  if (volume) {
    push('Weight', 'Estimated volume', `${num(volume.volumeCm3, 1)} cm³`,
      volume.source === SRC.USER ? SRC.USER : volume.priority === 1 ? SRC.DRAWING : SRC.AI, volume.basis)
    push('Weight', 'Solid fraction / envelope model', `${volume.method}`, SRC.ASSUMPTION,
      'Geometric simplification of the real part — the largest single source of volume error.')
  }

  estimates.forEach((e) => {
    push('Material price', `${e.materialName} price`, `${money(e.price)} /kg`, e.material.priceSource || SRC.ASSUMPTION,
      `Seeded indicative rate, last updated ${e.material.lastUpdated}. Not a live market feed.`)
    push('Material price', `${e.materialName} scrap allowance`, `${e.scrapPct} %`, SRC.ASSUMPTION,
      'Buy-to-fly / gating allowance assumed for the stock form.')
    push('Weight', `${e.materialName} estimated weight`, `${num(e.netWeightKg, 3)} kg`, e.weightSource || SRC.AI,
      'Volume × density unless a drawing mass callout applies.')
    push('Process', `${e.materialName} route`, e.recommendedProcess, SRC.AI,
      'Recommendation from drawing callouts, geometry and volume. Not an engineering approval.')
    push('Process', `${e.materialName} total cycle time`, `${num(e.totalCycleMin, 1)} min`, SRC.ASSUMPTION,
      `Modelled from ${num(e.route.analysisInputs.removalCm3, 0)} cm³ removal at ${e.route.analysisInputs.assumedMrr} cm³/min and finishing area.`)
    e.route.steps.filter((s) => s.rate > 0).forEach((s) => {
      push('Process', `${e.materialName} — ${s.name} rate`, `${money(s.rate)} /hr`, SRC.ASSUMPTION, 'Seeded job-shop machine hour rate.')
    })
  })

  if (params) {
    const P = [
      ['Labour rate', `${money(params.labourRate)} /hr`, 'Shop-floor direct labour, fully loaded.'],
      ['Energy cost', `${money(params.energyRatePerHr)} /hr`, 'Applied to machine running time only.'],
      ['Overhead %', `${params.overheadPct} %`, 'Factory + administrative overhead recovery.'],
      ['Profit %', `${params.profitPct} %`, 'Commercial margin — set by sales, not by engineering.'],
      ['Rejection %', `${params.rejectionPct} %`, 'Applied to the full manufacturing sub-total.'],
      ['Scrap recovery %', `${params.scrapRecoveryPct} %`, 'Credit taken on scrap material value.'],
      ['Tooling cost', `${money(params.toolingCost)} over ${params.toolingLifeQty.toLocaleString('en-IN')} pcs`, 'Amortisation basis for general tooling.'],
      ['Fixture cost', `${money(params.fixtureCost)} over ${params.fixtureLifeQty.toLocaleString('en-IN')} pcs`, 'Amortisation basis for fixtures.'],
      ['Inspection cost', `${money(params.inspectionCost)} /part`, 'In-process and final inspection.'],
      ['NDT cost', `${money(params.ndtCost)} /part`, 'MPI / DP / radiography as applicable.'],
      ['Packaging cost', `${money(params.packagingCost)} /part`, 'Standard returnable packaging assumed.'],
      ['Other manufacturing cost', `${money(params.otherCost)} /part`, 'Consumables and miscellaneous.'],
      ['Production quantity (lot)', params.lotQty.toLocaleString('en-IN'), 'Setup and batch charges amortised over this.'],
      ['Annual quantity', params.annualQty.toLocaleString('en-IN'), 'Drives process route selection and annual cost.'],
    ]
    P.forEach(([k, v, note]) => push('Commercial', k, v, SRC.USER, note))
  }

  return rows
}

export function assumptionCounts(rows) {
  return rows.reduce((acc, r) => { acc[r.source] = (acc[r.source] || 0) + 1; return acc }, {})
}
