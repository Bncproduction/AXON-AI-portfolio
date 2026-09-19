import { SRC } from './sources.js'

const PI4 = Math.PI / 4
const mm3ToCm3 = (v) => v / 1000

/**
 * Estimate part volume from the dimensional information available.
 * Returns an auditable calculation trail so the user can see exactly how the
 * number was produced. Nothing is invented: if the geometry is insufficient
 * the function reports that user input is required.
 */
export function estimateVolume(geom) {
  if (!geom) {
    return { volumeCm3: null, method: 'Insufficient geometry', steps: [], confidence: 'Low', needsUserInput: true }
  }
  const steps = []
  const add = (label, expr, valueCm3) => steps.push({ label, expr, valueCm3 })

  let gross = 0
  let method = ''
  let confidence = 'Medium'

  switch (geom.shape) {
    case 'stepped-cylinder': {
      method = 'Sum of stepped cylindrical sections (Σ π/4 · d² · L)'
      confidence = 'High'
      const list = geom.steps && geom.steps.length ? geom.steps : [{ dia: geom.diameter, len: geom.length }]
      list.forEach((s, i) => {
        const v = mm3ToCm3(PI4 * s.dia * s.dia * s.len)
        gross += v
        add(`Section ${i + 1}: Ø${s.dia} × ${s.len} mm`, `π/4 × ${s.dia}² × ${s.len}`, v)
      })
      break
    }
    case 'cylinder': {
      method = 'Solid cylinder (π/4 · d² · L) × solid fraction'
      const v = mm3ToCm3(PI4 * geom.diameter * geom.diameter * geom.length) * (geom.fillFactor ?? 1)
      gross += v
      add(`Cylinder Ø${geom.diameter} × ${geom.length} mm`, `π/4 × ${geom.diameter}² × ${geom.length} × ${geom.fillFactor ?? 1}`, v)
      break
    }
    case 'plate': {
      method = 'Flat pattern area × thickness × solid fraction'
      confidence = 'High'
      const area = geom.length * geom.width
      const v = mm3ToCm3(area * geom.thickness) * (geom.fillFactor ?? 1)
      gross += v
      add(`Plate ${geom.length} × ${geom.width} × ${geom.thickness} mm`, `${geom.length} × ${geom.width} × ${geom.thickness} × ${geom.fillFactor ?? 1}`, v)
      if (geom.cutoutAreaMm2) {
        const c = -mm3ToCm3(geom.cutoutAreaMm2 * geom.thickness)
        gross += c
        add(`Cut-outs ${geom.cutoutAreaMm2} mm²`, `−${geom.cutoutAreaMm2} × ${geom.thickness}`, c)
      }
      break
    }
    case 'hollow-box': {
      method = 'Bounding envelope × estimated solid fraction (wall / core based)'
      confidence = 'Medium'
      const bbox = geom.length * geom.width * geom.height
      const v = mm3ToCm3(bbox) * (geom.fillFactor ?? 0.4)
      gross += v
      add(
        `Envelope ${geom.length} × ${geom.width} × ${geom.height} mm × solid fraction ${geom.fillFactor ?? 0.4}`,
        `${geom.length} × ${geom.width} × ${geom.height} × ${geom.fillFactor ?? 0.4}`,
        v,
      )
      break
    }
    default: {
      method = 'Prismatic envelope × estimated solid fraction'
      const L = geom.length || 0, W = geom.width || 0, H = geom.height || geom.thickness || 0
      const v = mm3ToCm3(L * W * H) * (geom.fillFactor ?? 1)
      gross += v
      add(`Envelope ${L} × ${W} × ${H} mm`, `${L} × ${W} × ${H} × ${geom.fillFactor ?? 1}`, v)
    }
  }

  // Subtract holes wherever a diameter + quantity is known
  if (geom.holeDiameter && geom.holeQuantity) {
    const depth = geom.holeDepth || geom.thickness || geom.wallThickness || 0
    if (depth) {
      const v = -mm3ToCm3(PI4 * geom.holeDiameter ** 2 * depth * geom.holeQuantity)
      gross += v
      add(`${geom.holeQuantity} × Ø${geom.holeDiameter} holes, depth ${depth} mm`, `−${geom.holeQuantity} × π/4 × ${geom.holeDiameter}² × ${depth}`, v)
    }
  }
  // Subtract a through bore if one is described separately
  if (geom.boreDiameter && geom.boreDepth && geom.shape !== 'stepped-cylinder') {
    const v = -mm3ToCm3(PI4 * geom.boreDiameter ** 2 * geom.boreDepth) * 0.5
    gross += v
    add(`Main bore Ø${geom.boreDiameter} × ${geom.boreDepth} mm (50 % already in solid fraction)`, `−0.5 × π/4 × ${geom.boreDiameter}² × ${geom.boreDepth}`, v)
  }

  const volumeCm3 = Math.max(0, gross)
  return {
    volumeCm3: Number(volumeCm3.toFixed(2)),
    method,
    steps,
    confidence,
    needsUserInput: volumeCm3 <= 0,
    source: SRC.AI,
  }
}

/** Rough external surface area in dm², used for surface-treatment costing. */
export function estimateSurfaceAreaDm2(geom, volumeCm3) {
  if (!geom) return 0
  let mm2 = 0
  switch (geom.shape) {
    case 'stepped-cylinder': {
      const list = geom.steps || []
      mm2 = list.reduce((a, s) => a + Math.PI * s.dia * s.len, 0) + 2 * PI4 * (geom.diameter || 0) ** 2
      break
    }
    case 'plate':
      mm2 = 2 * geom.length * geom.width + 2 * (geom.length + geom.width) * (geom.thickness || 0)
      break
    case 'hollow-box':
      mm2 = 2 * (geom.length * geom.width + geom.width * geom.height + geom.length * geom.height) * 1.6
      break
    default: {
      // fall back to the surface of an equivalent cube
      const side = Math.cbrt((volumeCm3 || 1) * 1000)
      mm2 = 6 * side * side
    }
  }
  return Number((mm2 / 10000).toFixed(2)) // mm² -> dm²
}

/** Bounding (stock) volume used to estimate material removal for machining. */
export function boundingVolumeCm3(geom) {
  if (!geom) return 0
  if (geom.shape === 'stepped-cylinder') {
    const d = Math.max(...(geom.steps || [{ dia: geom.diameter || 0 }]).map((s) => s.dia)) + 3
    return mm3ToCm3(PI4 * d * d * ((geom.length || 0) + 6))
  }
  if (geom.shape === 'plate') return mm3ToCm3((geom.length || 0) * (geom.width || 0) * (geom.thickness || 0))
  return mm3ToCm3((geom.length || 0) * (geom.width || 0) * (geom.height || geom.thickness || 0))
}

export const weightFromVolume = (volumeCm3, density) =>
  volumeCm3 == null || density == null ? null : Number(((volumeCm3 * density) / 1000).toFixed(3))
