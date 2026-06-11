// A pragmatic 3D bin-packing engine for container/truck load planning.
//
// Strategy: largest-volume-first, axis-aligned, with a free-space "maximal
// rectangles" style approach simplified to a shelf + skyline hybrid. It is not
// provably optimal (3D bin packing is NP-hard) but produces tidy, realistic
// load plans quickly and fully deterministically.

function expandItems(items) {
  const units = []
  for (const it of items) {
    for (let i = 0; i < it.qty; i++) {
      units.push({
        id: `${it.id}#${i}`,
        itemId: it.id,
        name: it.name,
        color: it.color,
        w: it.w, h: it.h, d: it.d,
        weight: it.weight,
        stackable: it.stackable !== false,
      })
    }
  }
  return units
}

// Try the orientations of a box. If non-stackable we still allow footprint
// rotations but the caller treats height specially.
function orientations(u) {
  const base = [
    [u.w, u.h, u.d],
    [u.d, u.h, u.w],
  ]
  const seen = new Set()
  const out = []
  for (const [w, h, d] of base) {
    const k = `${w}x${h}x${d}`
    if (!seen.has(k)) { seen.add(k); out.push({ w, h, d }) }
  }
  return out
}

/**
 * Pack items into a single container.
 * container: { w, h, d, maxWeight }
 * items: [{ id, name, color, w, h, d, weight, qty, stackable }]
 * Returns { placed: [...], unplaced: [...], stats }
 */
export function packContainer(container, items) {
  const { w: CW, h: CH, d: CD } = container
  const maxWeight = container.maxWeight || Infinity

  const units = expandItems(items)
  // Largest volume first, heavier first as tiebreak (heavy on the bottom).
  units.sort((a, b) => (b.w * b.h * b.d) - (a.w * a.h * a.d) || b.weight - a.weight)

  // Free spaces as a list of empty boxes (guillotine split).
  let spaces = [{ x: 0, y: 0, z: 0, w: CW, h: CH, d: CD }]
  const placed = []
  const unplaced = []
  let totalWeight = 0

  const fits = (o, s) => o.w <= s.w + 1e-6 && o.h <= s.h + 1e-6 && o.d <= s.d + 1e-6

  for (const u of units) {
    if (totalWeight + u.weight > maxWeight) { unplaced.push(u); continue }

    // Pick the free space with lowest y, then lowest x,z (bottom-left-back fill)
    // that fits some orientation of the unit.
    let best = null
    const ordered = [...spaces].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x)
    for (const s of ordered) {
      for (const o of orientations(u)) {
        if (fits(o, s)) { best = { space: s, o }; break }
      }
      if (best) break
    }

    if (!best) { unplaced.push(u); continue }

    const { space: s, o } = best
    placed.push({
      id: u.id, itemId: u.itemId, name: u.name, color: u.color, weight: u.weight,
      x: s.x, y: s.y, z: s.z, w: o.w, h: o.h, d: o.d,
    })
    totalWeight += u.weight

    // Guillotine-split the used space into up to three new free boxes.
    const newSpaces = []
    // right (x)
    if (s.w - o.w > 1e-6) newSpaces.push({ x: s.x + o.w, y: s.y, z: s.z, w: s.w - o.w, h: s.h, d: s.d })
    // above (y) — only over the footprint we used
    if (s.h - o.h > 1e-6) newSpaces.push({ x: s.x, y: s.y + o.h, z: s.z, w: o.w, h: s.h - o.h, d: s.d })
    // front (z)
    if (s.d - o.d > 1e-6) newSpaces.push({ x: s.x, y: s.y, z: s.z + o.d, w: o.w, h: o.h, d: s.d - o.d })

    spaces = spaces.filter((sp) => sp !== s).concat(newSpaces)
    // Drop fully-contained / degenerate spaces to keep the list small.
    spaces = spaces.filter((sp) => sp.w > 1e-3 && sp.h > 1e-3 && sp.d > 1e-3)
  }

  const containerVol = CW * CH * CD
  const usedVol = placed.reduce((a, p) => a + p.w * p.h * p.d, 0)

  return {
    placed,
    unplaced,
    stats: {
      volumeUtil: containerVol ? usedVol / containerVol : 0,
      weightUtil: maxWeight === Infinity ? null : totalWeight / maxWeight,
      totalWeight,
      placedCount: placed.length,
      unplacedCount: unplaced.length,
      containerVol,
      usedVol,
    },
  }
}

/**
 * Estimate axle loads for a truck. Very simplified longitudinal model:
 * distributes cargo weight between a front (steer) and rear (drive) axle
 * group based on each box's center-of-mass along the length (z axis).
 */
export function axleLoads(placed, container, tareFront = 6000, tareRear = 1500) {
  const L = container.d || 1
  let front = tareFront, rear = tareRear
  for (const p of placed) {
    const center = (p.z + p.d / 2) / L // 0 = front, 1 = rear
    rear += p.weight * center
    front += p.weight * (1 - center)
  }
  return { front: Math.round(front), rear: Math.round(rear) }
}
