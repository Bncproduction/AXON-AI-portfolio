import { SAMPLE_DRAWINGS } from '../data/sampleDrawings.js'
import { MATERIAL_MASTER, MATERIAL_CALLOUT_MAP, materialById } from '../data/materials.js'
import { processById } from '../data/processes.js'
import { SRC, f, na, isAvailable } from './sources.js'
import { boundingVolumeCm3 } from './geometry.js'

// ---------------------------------------------------------------------------
// PROTOTYPE ANALYSIS ENGINE
// This build ships a deterministic, rule-based analysis engine seeded with
// sample drawing data so the full workflow can be demonstrated offline.
// It never fabricates a dimension: anything it cannot derive is returned as
// "Not Available in Drawing" and must be supplied by the user.
// ---------------------------------------------------------------------------

export const ENGINE_MODE = 'Prototype rule-based engine (offline). No external OCR/CAD/ERP/price feed connected.'

/** Pick the sample extraction that best matches the uploaded file name. */
export function matchSample(fileName = '') {
  const n = fileName.toLowerCase()
  if (/shaft|spindle|axle|turn/.test(n)) return SAMPLE_DRAWINGS[1]
  if (/bracket|sheet|plate|dxf|panel|cover/.test(n)) return SAMPLE_DRAWINGS[2]
  if (/hous|body|casting|pump|valve|manifold/.test(n)) return SAMPLE_DRAWINGS[0]
  // deterministic fallback so repeated analysis of the same file is stable
  const sum = [...n].reduce((a, c) => a + c.charCodeAt(0), 0)
  return SAMPLE_DRAWINGS[sum % SAMPLE_DRAWINGS.length]
}

/**
 * Read what the file name itself discloses, so the upload form is not empty
 * before the drawing has been analyzed. This is a naming-convention guess,
 * never a substitute for the title block — the UI labels it as such and every
 * field stays editable.
 */
export function parseFileName(fileName = '') {
  const stem = fileName.replace(/\.[^.]+$/, '')
  const out = { drawingNumber: '', partNumber: '', revision: '', partName: '' }

  // Word boundaries are useless here: "_" counts as a word character, so \b
  // never fires in BNC-2291-R3_Pump. Use explicit alphanumeric lookarounds.
  const NOT_BEFORE = '(?<![A-Za-z0-9])'
  const NOT_AFTER = '(?![A-Za-z0-9])'

  // Revision: _R3, -REV2, (Rev B)
  const rev = stem.match(new RegExp(`[_\\-\\s(]re?v?[._\\-\\s]?([0-9]{1,2}|[A-Z])${NOT_AFTER}`, 'i'))
  if (rev) {
    const r = rev[1].toUpperCase()
    out.revision = /^\d+$/.test(r) ? `R${r}` : r // numeric -> R3, letter -> B
  }

  // Drawing number: a prefixed code such as BNC-2291, ABC1234, PH-2291-03.
  // Skip generic camera/scanner names so "scan001.jpg" is not read as a number.
  const GENERIC = /^(scan|img|image|photo|pic|doc|file|page|copy|new|untitled|screenshot)$/i
  const dwgRe = new RegExp(
    `${NOT_BEFORE}((?:[A-Z]{2,6}[-_ ]){0,2}([A-Z]{2,6})[-_ ]?\\d{3,6}(?:[-_]\\d{1,3})?)${NOT_AFTER}`, 'i')
  const dwg = stem.match(dwgRe)
  if (dwg && !GENERIC.test(dwg[2])) out.drawingNumber = dwg[1].replace(/[_ ]/g, '-').toUpperCase()

  // Part name: whatever is left once the code and revision are removed
  let rest = stem
  if (out.drawingNumber) rest = rest.replace(dwg[1], ' ')
  if (rev) rest = rest.replace(rev[0], ' ')
  rest = rest.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (rest.length > 2) {
    out.partName = rest
      .split(' ')
      .filter((w) => !/^(drg|dwg|drawing|rev|final|copy|new|\d+)$/i.test(w))
      .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
      .join(' ')
      .trim()
  }
  return out
}

/**
 * Build an extraction from what was actually read off the sheet.
 * Used for real uploads. Anything the drawing does not state is returned as
 * "Not Available in Drawing" — sample data is never mixed in here.
 */
export function buildExtractionFromDrawing(drawing) {
  const tb = drawing.titleBlock || {}
  const ann = drawing.annotations || {}
  const fromTB = (key, note) => {
    if (!tb[key]) return na()
    const mirrored = tb[key].mirrored
      ? ` This sheet carries a single number for both the drawing and the part, so the same value is used for each.`
      : ''
    return f(tb[key].value, SRC.DRAWING, tb[key].confidence,
      note || `Read from the title block field "${tb[key].label}".${mirrored}`)
  }

  const dias = ann.diameters || []
  const extraction = {
    part: {
      partName: fromTB('partName'),
      partNumber: fromTB('partNumber'),
      drawingNumber: fromTB('drawingNumber'),
      revision: fromTB('revision'),
      componentType: na('Not stated on the drawing; classify manually if a process route is needed.'),
    },
    dimensions: {
      length: na('No overall length could be read from the sheet.'),
      width: na('No overall width could be read from the sheet.'),
      height: na('No overall height could be read from the sheet.'),
      diameter: dias.length
        ? f(dias[0], SRC.AI, 'Low', `Largest of ${dias.length} diameter callout(s) found on the sheet (${dias.slice(0, 6).join(', ')} mm). Confirm which is the overall diameter.`)
        : na(),
      thickness: na(),
      wallThickness: na(),
      holeDiameter: dias.length > 1 ? f(dias[dias.length - 1], SRC.AI, 'Low', 'Smallest diameter callout found — may or may not be a hole.') : na(),
      holeQuantity: na('Hole count cannot be derived from text alone.'),
      threadDetails: ann.thread ? f(ann.thread, SRC.DRAWING, 'Medium', 'Thread callout found on the sheet.') : na(),
      radius: na(),
      chamfer: na(),
    },
    quality: {
      tolerances: tb.generalTolerance
        ? fromTB('generalTolerance')
        : (ann.tolerance ? f(ann.tolerance, SRC.DRAWING, 'Medium', 'Tolerance callout found on the sheet.') : na()),
      gdt: na('Geometric tolerance frames cannot be read from text alone.'),
      datums: na(),
      surfaceFinish: tb.surfaceFinish
        ? fromTB('surfaceFinish')
        : (ann.surfaceFinish ? f(ann.surfaceFinish, SRC.DRAWING, 'Medium', 'Roughness callout found on the sheet.') : na()),
      criticalCharacteristics: na(),
      specialNotes: na(),
    },
    material: {
      specification: fromTB('material'),
      grade: fromTB('material'),
      heatTreatment: fromTB('heatTreatment'),
      coating: na(),
      plating: na(),
      surfaceTreatment: na(),
    },
    manufacturing: {
      casting: na('No casting note found on the drawing.'),
      forging: na('No forging note found on the drawing.'),
      machining: na('No machining note found on the drawing.'),
      sheetMetal: na('No sheet metal note found on the drawing.'),
      welding: na('No welding note found on the drawing.'),
      specialProcess: na(),
    },
    weight: tb.weight?.kg
      ? f(Number(tb.weight.kg.toFixed(3)), SRC.DRAWING, tb.weight.confidence, `Mass read from the title block field "${tb.weight.label}" (${tb.weight.value}).`)
      : na('No mass callout found in the title block.'),
    geometry: null, // nothing dimensional was read; the user supplies volume
  }
  return extraction
}

export function analyzeDrawing(drawing) {
  // Real upload whose text we could read: report only what the sheet says.
  if (!drawing.isSample && drawing.titleBlock) {
    const extraction = buildExtractionFromDrawing(drawing)
    const counts = countFields(extraction)
    return {
      ...extraction,
      sampleKey: null,
      analyzedAt: new Date().toISOString(),
      engineMode: `Title block read directly from the uploaded ${String(drawing.fileName).split('.').pop().toUpperCase()} (${drawing.textItemCount || 0} text elements).`,
      readFromFile: true,
      fieldsFound: counts.found,
      fieldsMissing: counts.missing,
    }
  }

  const sample = drawing.sampleKey
    ? SAMPLE_DRAWINGS.find((s) => s.key === drawing.sampleKey) || matchSample(drawing.fileName)
    : matchSample(drawing.fileName)

  const extraction = JSON.parse(JSON.stringify(sample.extraction))

  // Header values the user typed at upload time override the sample and are
  // re-tagged as user input, not as drawing data.
  const mapUser = (key, field) => {
    const v = drawing[key]
    if (v && v !== sample.header[key] && field) {
      return { value: v, source: SRC.USER, confidence: 'High', note: 'Entered during upload.' }
    }
    return field
  }
  extraction.part.partName = mapUser('partName', extraction.part.partName)
  extraction.part.partNumber = mapUser('partNumber', extraction.part.partNumber)
  extraction.part.drawingNumber = mapUser('drawingNumber', extraction.part.drawingNumber)
  extraction.part.revision = mapUser('revision', extraction.part.revision)

  return {
    ...extraction,
    sampleKey: sample.key,
    analyzedAt: new Date().toISOString(),
    readFromFile: false,
    isSampleData: !drawing.isSample,
    engineMode: drawing.isSample
      ? ENGINE_MODE
      : `No readable text in this file, so the values below are SAMPLE DATA from the reference part "${sample.header.partName}" — they do not describe your drawing. ${drawing.textReason || ''}`,
    fieldsFound: countFields(extraction).found,
    fieldsMissing: countFields(extraction).missing,
  }
}

export function countFields(extraction) {
  let found = 0, missing = 0
  const groups = ['part', 'dimensions', 'quality', 'material', 'manufacturing']
  groups.forEach((g) => {
    Object.values(extraction[g] || {}).forEach((fld) => (isAvailable(fld) ? found++ : missing++))
  })
  if (isAvailable(extraction.weight)) found++; else missing++
  return { found, missing }
}

// ---------------------------------------------------------------------------
// Quality helpers
// ---------------------------------------------------------------------------
export function finestRa(extraction) {
  const s = extraction?.quality?.surfaceFinish
  if (!isAvailable(s)) return null
  const nums = String(s.value).match(/(\d+(\.\d+)?)/g)
  return nums ? Math.min(...nums.map(Number)) : null
}

export function tightestToleranceMm(extraction) {
  const t = extraction?.quality?.tolerances
  if (!isAvailable(t)) return null
  const nums = String(t.value).match(/±\s*(\d+(\.\d+)?)/g)
  if (!nums) return null
  return Math.min(...nums.map((x) => Number(x.replace(/[±\s]/g, ''))))
}

const flag = (fld) => isAvailable(fld) && !/not applicable|not required/i.test(String(fld.value))

// ---------------------------------------------------------------------------
// MATERIAL SUGGESTION
// ---------------------------------------------------------------------------
export function suggestMaterials(extraction) {
  const out = []
  const spec = isAvailable(extraction?.material?.specification)
    ? String(extraction.material.specification.value).toUpperCase()
    : ''

  let drawingMatId = null
  for (const [k, id] of Object.entries(MATERIAL_CALLOUT_MAP)) {
    if (spec.includes(k)) { drawingMatId = id; break }
  }
  if (drawingMatId) {
    out.push({
      id: drawingMatId,
      suitability: 'Drawing specified',
      source: SRC.DRAWING,
      reason: `Drawing material callout "${extraction.material.specification.value}" maps to this grade.`,
    })
  }

  const m = extraction?.manufacturing || {}
  const wantCasting = flag(m.casting)
  const wantSheet = flag(m.sheetMetal)
  const wantForging = flag(m.forging)
  const wantWelding = flag(m.welding)

  const candidateIds = []
  if (wantCasting) candidateIds.push('SG500', 'FG260', 'CS-WCB', 'A356', 'ADC12', 'SS304')
  if (wantSheet) candidateIds.push('MS-IS2062', 'SS304', 'AL6061', 'AL6063')
  if (wantForging) candidateIds.push('AS-EN19', 'CS-EN8', 'SS410', 'AL6061')
  if (!wantCasting && !wantSheet && !wantForging) candidateIds.push('MS-IS2062', 'CS-EN8', 'AS-EN19', 'SS304', 'AL6061', 'BRASS')

  candidateIds.forEach((id) => {
    if (out.some((o) => o.id === id)) return
    const mat = materialById(id)
    if (!mat) return
    const notes = []
    if (wantCasting && !mat.castable) notes.push('not a casting alloy — route would change to fabricated/machined')
    if (wantWelding && !mat.weldable) notes.push('poor weldability against the drawing welding requirement')
    if (wantSheet && mat.form === 'Casting') notes.push('supplied as casting stock, not sheet')
    out.push({
      id,
      suitability: notes.length ? 'Review required' : 'Technically plausible alternative',
      source: SRC.AI,
      reason: notes.length
        ? `Cost comparison candidate. Engineering caution: ${notes.join('; ')}.`
        : `Comparable candidate for a ${wantCasting ? 'cast' : wantSheet ? 'sheet metal' : wantForging ? 'forged' : 'machined'} part of this size.`,
    })
  })

  return out.slice(0, 7)
}

// ---------------------------------------------------------------------------
// PROCESS ROUTE RECOMMENDATION
// ---------------------------------------------------------------------------
const step = (processId, patch = {}) => {
  const p = processById(processId)
  return {
    uid: `${processId}-${Math.random().toString(36).slice(2, 7)}`,
    processId,
    name: p.name,
    category: p.category,
    rate: p.rate || 0,
    cycleMin: 0,
    setupMin: p.setupMin || 0,
    labourFactor: p.labourFactor ?? 1,
    toolCostPerPart: 0,
    extras: [],
    reason: p.notes,
    ...patch,
  }
}

const r1 = (v) => Number(Number(v).toFixed(1))
const r0 = (v) => Math.max(1, Math.round(v))

/**
 * Build a full manufacturing route for one material.
 * All cycle times are model-derived estimates and are flagged as assumptions.
 */
export function recommendRoute(materialId, extraction, geom, ctx) {
  const mat = materialById(materialId)
  const { volumeCm3, netWeightKg, areaDm2, annualQty = 5000, lotQty = 500 } = ctx
  const mfg = extraction?.manufacturing || {}
  const ra = finestRa(extraction)
  const tol = tightestToleranceMm(extraction)
  const stockCm3 = boundingVolumeCm3(geom) || (volumeCm3 || 0) * 1.6
  const machinability = mat.machinability || 1
  const reasons = []
  const alternatives = []
  const steps = []

  const wantCasting = flag(mfg.casting)
  const wantSheet = flag(mfg.sheetMetal)
  const wantForging = flag(mfg.forging)
  const wantWelding = flag(mfg.welding)
  const isRotational = geom?.shape === 'stepped-cylinder' || geom?.shape === 'cylinder'
  const tightTol = (tol != null && tol <= 0.1) || (ra != null && ra <= 0.8)

  let primaryProcess = null
  let removalCm3 = Math.max(0, stockCm3 - (volumeCm3 || 0))
  // Fraction of the external area that is actually machined. Near-net-shape
  // routes leave most surfaces as-cast / as-forged.
  let machinedAreaFraction = 1.0

  // ---- 1. Near-net-shape forming ----------------------------------------
  if (mat.moulded) {
    primaryProcess = 'Injection Moulding'
    const shotG = netWeightKg * 1000
    const cycle = r1(12 + shotG / 45)
    steps.push(step('INJ-MOULD', {
      cycleMin: cycle,
      reason: `Thermoplastic grade ${mat.grade}: moulding is the only viable primary process. Cycle from ${Math.round(shotG)} g shot weight and wall thickness.`,
      extras: [{ label: 'Mould / tool cost', amount: 850000, basis: 'lot', note: 'Amortise over tool life in Manufacturing Cost.' }],
    }))
    removalCm3 = 0
    machinedAreaFraction = 0
    reasons.push('Moulded parts are produced to final shape — no machining content is carried.')
    alternatives.push({ name: 'CNC machining from stock', reason: 'Only viable for prototype quantities; piece price far higher.' })
  } else if (wantCasting && mat.castable) {
    const alu = ['Aluminium', 'Other Engineering Materials'].includes(mat.category) && mat.density < 7
    if (alu && annualQty >= 5000) {
      primaryProcess = 'Pressure Die Casting'
      steps.push(step('PDC', {
        cycleMin: r1(0.8 + netWeightKg * 1.2),
        reason: `Non-ferrous alloy at ${annualQty.toLocaleString('en-IN')} pcs/yr justifies die investment; best finish and thinnest walls.`,
        extras: [
          { label: 'Die cost (2-cavity)', amount: 1250000, basis: 'lot' },
          { label: 'Melting & holding', amount: 42, basis: 'kg' },
          { label: 'Trimming / deflashing', amount: 9, basis: 'part' },
          { label: 'Shot blasting', amount: 6, basis: 'part' },
        ],
      }))
      alternatives.push({ name: 'Gravity die casting', reason: 'Lower tooling investment, better for < 5,000 pcs/yr; thicker walls and lower finish.' })
    } else if (alu) {
      primaryProcess = 'Gravity Die Casting'
      steps.push(step('GDC', {
        cycleMin: r1(3 + netWeightKg * 2.5),
        reason: `Non-ferrous alloy at moderate volume: die cost an order of magnitude below pressure die casting.`,
        extras: [
          { label: 'Die cost', amount: 320000, basis: 'lot' },
          { label: 'Core cost', amount: 14, basis: 'part' },
          { label: 'Melting & holding', amount: 38, basis: 'kg' },
          { label: 'Pouring', amount: 11, basis: 'part' },
          { label: 'Fettling', amount: 16, basis: 'part' },
          { label: 'Shot blasting', amount: 6, basis: 'part' },
        ],
      }))
      alternatives.push({ name: 'Pressure die casting', reason: 'Lower piece price above ~5,000 pcs/yr, but ~₹12.5 L die investment.' })
    } else if (netWeightKg <= 3 && (ra != null && ra <= 3.2)) {
      primaryProcess = 'Investment Casting'
      steps.push(step('INV-CAST', {
        cycleMin: r1(4 + netWeightKg * 3),
        reason: `Part under 3 kg with Ra ${ra} requirement: near-net-shape investment casting reduces downstream machining.`,
        extras: [
          { label: 'Wax die cost', amount: 185000, basis: 'lot' },
          { label: 'Shell / ceramic cost', amount: 48, basis: 'part' },
          { label: 'Melting', amount: 46, basis: 'kg' },
          { label: 'Knock-off & fettling', amount: 22, basis: 'part' },
        ],
      }))
      alternatives.push({ name: 'Sand casting + machining', reason: 'Lower tooling, higher machining allowance and fettling content.' })
      removalCm3 *= 0.35
    } else {
      primaryProcess = 'Sand Casting'
      steps.push(step('SAND-CAST', {
        cycleMin: r1(5 + netWeightKg * 2.2),
        reason: `${mat.name} housing-type part: sand casting gives the lowest tooling cost at this size and volume.`,
        extras: [
          { label: 'Pattern / mould cost', amount: 145000, basis: 'lot' },
          { label: 'Core cost', amount: 26, basis: 'part' },
          { label: 'Melting cost', amount: 34, basis: 'kg' },
          { label: 'Pouring cost', amount: 12, basis: 'part' },
          { label: 'Fettling cost', amount: 24, basis: 'part' },
          { label: 'Shot blasting', amount: 8, basis: 'part' },
        ],
      }))
      alternatives.push({ name: 'Gravity die casting', reason: 'Better finish and dimensional repeatability if the alloy is non-ferrous.' })
      alternatives.push({ name: 'Fully machined from solid', reason: 'No tooling cost — viable only for prototype / very low volume.' })
    }
    // castings arrive near net shape: only the machining allowance is removed
    removalCm3 = (volumeCm3 || 0) * 0.14
    machinedAreaFraction = 0.3
    reasons.push('Machining stock reduced to a 14 % casting allowance because the part arrives near net shape.')
    reasons.push('Only about 30 % of the external area is machined — mounting faces, bore and bolt holes. The remainder stays as-cast.')
  } else if (wantSheet) {
    primaryProcess = 'Laser Cutting + Sheet Metal Forming'
    const perimeterM = (2 * ((geom?.length || 0) + (geom?.width || 0))) / 1000
    const cutM = perimeterM + (geom?.holeQuantity || 0) * Math.PI * ((geom?.holeDiameter || 10) / 1000)
    steps.push(step('LASER', {
      cycleMin: r1(0.4 + (cutM / 2.2) * (geom?.thickness || 3) * 0.35),
      reason: `Flat pattern perimeter ≈ ${cutM.toFixed(2)} m at ${geom?.thickness || '?'} mm; fibre laser at an assumed 2.2 m/min effective feed.`,
      extras: [{ label: 'Nesting / programming', amount: 2500, basis: 'lot' }],
    }))
    steps.push(step('SHEET', {
      cycleMin: r1(0.35 * 2 + 0.6),
      reason: 'Two press-brake bends at R5 internal plus handling and gauge setting.',
      extras: [{ label: 'Bend tooling setup', amount: 1800, basis: 'lot' }],
    }))
    if (wantWelding) {
      steps.push(step('WELD', {
        cycleMin: 3.5,
        reason: 'Weld nuts per drawing: tack, full weld and spatter clean.',
        extras: [{ label: 'Welding fixture', amount: 42000, basis: 'lot' }, { label: 'Consumables / gas', amount: 7, basis: 'part' }],
      }))
    }
    steps.push(step('GRIND', { cycleMin: 1.8, rate: 320, reason: 'Deburring and edge break per drawing note.' }))
    alternatives.push({ name: 'Turret punching + bending', reason: 'Lower running cost at high volume; needs hard tooling for the hole pattern.' })
    alternatives.push({ name: 'Casting', reason: 'Only if the bracket is redesigned as a one-piece body — not comparable to the current drawing.' })
    removalCm3 = 0
    machinedAreaFraction = 0
    reasons.push('Holes and the profile are produced by the laser, so no separate machining operation is carried — only deburring.')
  } else if (wantForging && mat.forgeable) {
    primaryProcess = 'Closed Die Forging + Machining'
    steps.push(step('FORGE', {
      cycleMin: r1(0.8 + netWeightKg * 0.35),
      reason: `${mat.name} loaded component: forging gives continuous grain flow, supporting the MPI and fatigue requirements.`,
      extras: [
        { label: 'Die cost', amount: 480000, basis: 'lot' },
        { label: 'Billet heating (furnace)', amount: 18, basis: 'kg' },
        { label: 'Trimming operation', amount: 14, basis: 'part' },
        { label: 'Descaling', amount: 6, basis: 'part' },
      ],
    }))
    removalCm3 = Math.max(removalCm3 * 0.3, (volumeCm3 || 0) * 0.18)
    machinedAreaFraction = 0.6
    reasons.push('Forged preform reduces machining stock to roughly 18 % of part volume.')
    alternatives.push({ name: 'Machined from bar stock', reason: 'No die cost, but higher material buy-to-fly and no grain-flow benefit.' })
  } else {
    primaryProcess = isRotational ? 'CNC Turning' : 'VMC Machining from stock'
    reasons.push(`No near-net-shape route indicated on the drawing; part is machined from ${mat.form.toLowerCase()} stock.`)
    alternatives.push({ name: wantCasting ? 'Casting + machining' : 'Near-net-shape forming', reason: 'Would need a design/DFM review and tooling investment.' })
  }

  // ---- 2. Machining content ---------------------------------------------
  const mrr = 12 * machinability // cm³/min, assumed roughing removal rate
  const roughMin = removalCm3 > 0 ? removalCm3 / mrr : 0
  const machinedAreaDm2 = (areaDm2 || 0) * machinedAreaFraction
  const finishMin = machinedAreaDm2 * (ra != null && ra <= 1.6 ? 2.2 : 1.2) / machinability
  const featureMin = ((geom?.holeQuantity || 0) * 0.55 + (isAvailable(extraction?.dimensions?.threadDetails) ? 2.4 : 0)) / machinability
  const tolFactor = tightTol ? 1.25 : 1.0

  if (roughMin + finishMin > 0.5) {
    if (isRotational) {
      steps.push(step('CNC-TURN', {
        cycleMin: r1((roughMin * 0.7 + finishMin * 0.6) * tolFactor),
        toolCostPerPart: r1(8 / machinability),
        reason: `Removal ${removalCm3.toFixed(0)} cm³ at an assumed ${mrr.toFixed(1)} cm³/min for ${mat.name} (machinability index ${machinability}).`,
        extras: [{ label: 'Turning fixture / collet', amount: 38000, basis: 'lot' }],
      }))
      steps.push(step('CNC-MILL', {
        cycleMin: r1(roughMin * 0.2 + featureMin),
        toolCostPerPart: r1(4 / machinability),
        reason: 'Keyway, cross holes and flats — second operation on a milling centre.',
      }))
    } else {
      const heavy = (volumeCm3 || 0) > 800 || annualQty > 8000
      steps.push(step(heavy ? 'HMC' : 'VMC', {
        cycleMin: r1((roughMin + finishMin) * tolFactor),
        toolCostPerPart: r1(11 / machinability),
        reason: `Removal ${removalCm3.toFixed(0)} cm³ + ${machinedAreaDm2.toFixed(1)} dm² machined area (${Math.round(machinedAreaFraction * 100)} % of the external surface). ${heavy ? 'HMC selected for pallet-change productivity at this volume.' : 'VMC adequate at this size and volume.'}`,
        extras: [{ label: 'Fixture (hydraulic)', amount: heavy ? 165000 : 85000, basis: 'lot' }],
      }))
      if ((geom?.holeQuantity || 0) > 3) {
        steps.push(step('DRILL', {
          cycleMin: r1(featureMin),
          reason: `${geom.holeQuantity} × Ø${geom.holeDiameter} holes and tapping on a dedicated station.`,
        }))
      }
    }
  }
  if (tightTol && !mat.moulded) {
    steps.push(step('GRIND', {
      cycleMin: r1(1.5 + machinedAreaDm2 * 0.8),
      toolCostPerPart: 3,
      reason: `Ra ${ra ?? '—'} / tolerance ±${tol ?? '—'} mm cannot be held reliably by turning or milling alone.`,
    }))
    reasons.push('Grinding added because the drawing calls for Ra ≤ 0.8 µm or ±0.1 mm class tolerance.')
  }

  // ---- 3. Heat treatment -------------------------------------------------
  const ht = extraction?.material?.heatTreatment
  if (isAvailable(ht)) {
    const s = String(ht.value).toLowerCase()
    let id = 'HT-NORM'
    if (/carburis|case/.test(s)) id = 'HT-CASE'
    else if (/harden|temper|induction/.test(s)) id = 'HT-HARD'
    else if (/t6|solution|age/.test(s)) id = 'HT-SOLN'
    else if (/anneal/.test(s)) id = 'HT-ANNEAL'
    else if (/stress|normalis/.test(s)) id = 'HT-NORM'
    const p = processById(id)
    steps.push(step(id, {
      reason: `Drawing heat treatment callout: "${ht.value}".`,
      extras: [
        { label: 'Weight-based charge', amount: p.perKg, basis: 'kg' },
        { label: 'Batch / furnace charge', amount: p.batchCost, basis: 'lot' },
      ],
    }))
  }

  // ---- 4. Surface treatment ---------------------------------------------
  const stFields = [extraction?.material?.coating, extraction?.material?.plating, extraction?.material?.surfaceTreatment]
  const stText = stFields.filter(isAvailable).map((x) => String(x.value).toLowerCase()).join(' ')
  const addST = (id, why) => {
    const p = processById(id)
    if (steps.some((s) => s.processId === id)) return
    steps.push(step(id, {
      reason: why,
      extras: [
        { label: 'Area-based charge', amount: p.perDm2, basis: 'dm2' },
        { label: 'Batch handling', amount: p.batchCost, basis: 'lot' },
      ],
    }))
  }
  if (/powder/.test(stText)) addST('ST-POWDER', 'Drawing calls for powder coating.')
  if (/paint|enamel|primer/.test(stText)) addST('ST-PAINT', 'Drawing calls for paint / primer system.')
  if (/anodi/.test(stText)) addST('ST-ANOD', 'Drawing calls for anodizing.')
  if (/zinc|plating|passivat/.test(stText)) addST('ST-ZINC', 'Drawing calls for plating.')
  if (/phosphat|7-tank|pre-treat/.test(stText)) addST('ST-PHOS', 'Pre-treatment specified before coating.')
  if (/blast|peen/.test(stText)) addST('ST-BLAST', 'Blasting / peening specified on the drawing.')

  const recommended = primaryProcess
  if (!alternatives.length) alternatives.push({ name: 'Alternative route', reason: 'No clearly superior alternative identified from the drawing information available.' })

  return {
    materialId,
    recommended,
    alternatives,
    reasons,
    steps,
    validationRequired: true,
    analysisInputs: {
      partVolumeCm3: volumeCm3,
      stockVolumeCm3: Number(stockCm3.toFixed(1)),
      removalCm3: Number(removalCm3.toFixed(1)),
      assumedMrr: Number(mrr.toFixed(1)),
      surfaceAreaDm2: areaDm2,
      machinedAreaDm2: Number(machinedAreaDm2.toFixed(2)),
      finestRa: ra,
      tightestToleranceMm: tol,
      machinabilityIndex: machinability,
      annualQty,
      lotQty,
    },
  }
}

export const ALL_MATERIALS = MATERIAL_MASTER
