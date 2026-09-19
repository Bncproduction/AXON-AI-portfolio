// ---------------------------------------------------------------------------
// TITLE BLOCK READER
// Maps positioned text from a drawing onto the fields a costing needs.
// A value is only accepted when it sits where a title block puts it —
// immediately right of its label, or directly beneath it. Nothing is guessed:
// a label with no value nearby returns nothing at all.
// ---------------------------------------------------------------------------

/** Label vocabulary, including the abbreviations CAD title blocks actually use. */
export const FIELD_LABELS = {
  partName: /^(drg\.?\s*\/?\s*part\s*desig|part\s*desig|part\s*name|description|designation|benennung|title|component\s*name|nomenclature)/i,
  partNumber: /^(part\s*(no|nr|num|number)|p\/?n|item\s*(no|code)|component\s*(no|code)|teil\s*nr|artikel)/i,
  drawingNumber: /^(dr(aw)?(g|ing)?\.?\s*(no|nr|num|number)|dwg\.?\s*(no)?|zeichnungs?\s*nr|sheet\s*no|doc(ument)?\s*(no|number))/i,
  revision: /^(rev(ision)?\.?\s*(no|nr|level)?|issue|änderung|alt(eration)?)$/i,
  material: /^(material|werkstoff|mat(l|erial)?\.?\s*(spec|grade)?|stock|raw\s*material)/i,
  weight: /^(weight|mass|gewicht|wt\.?)/i,
  scale: /^(scale|maßstab|masstab)/i,
  drawingDate: /^(date|datum|drawn\s*on|issue\s*date)/i,
  generalTolerance: /^(gen(eral)?\.?\s*tol|tolerance[s]?|unspecified\s*tol|tol(erance)?\s*class|allgemeintoleranz)/i,
  surfaceFinish: /^(surface\s*(finish|roughness|texture)|roughness|finish|oberfl)/i,
  heatTreatment: /^(heat\s*treat|hardness|hrc|case\s*depth|wärmebehandlung)/i,
  customer: /^(customer|client|kunde|for)/i,
  drawnBy: /^(drawn(\s*by)?|prepared(\s*by)?|gezeichnet)/i,
  quantity: /^(qty|quantity|stück)/i,
}

const ALL_LABELS = Object.values(FIELD_LABELS)
const looksLikeLabel = (s) => ALL_LABELS.some((re) => re.test(s.replace(/[:.\s]+$/, '')))
const isNoise = (s) => !s || /^[-–—_:.,/|\s]+$/.test(s) || s.length > 90

const clean = (s) => s.replace(/^[\s:.\-–—]+/, '').replace(/[\s:.\-–—]+$/, '').trim()

/**
 * Find the value belonging to a label item.
 * Same row to the right wins; otherwise the row directly beneath.
 */
function valueFor(label, items) {
  // "PART NO: PH-2291-03" — label and value share one text run
  const inline = label.str.split(/[:：]/)
  if (inline.length > 1 && clean(inline.slice(1).join(':'))) {
    return { value: clean(inline.slice(1).join(':')), confidence: 'High', placement: 'inline' }
  }

  const labelRight = label.x + (label.w || label.str.length * 4)
  let best = null
  for (const it of items) {
    if (it === label || it.page !== label.page) continue
    const s = clean(it.str)
    if (isNoise(s) || looksLikeLabel(s)) continue
    const dy = it.y - label.y
    const dx = it.x - label.x

    let score = null
    let placement = null
    if (Math.abs(dy) <= 4.5 && it.x >= labelRight - 2 && dx < 320) {
      score = dx                                     // same row, to the right
      placement = 'right'
    } else if (dy > 1 && dy <= 42 && dx > -50 && dx < 420) {
      score = 1000 + dy * 6 + Math.abs(dx) * 0.2     // row beneath the label
      placement = 'below'
    }
    if (score != null && (!best || score < best.score)) best = { value: s, score, placement }
  }
  if (!best) return null
  return { value: best.value, confidence: best.placement === 'right' ? 'High' : 'Medium', placement: best.placement }
}

/**
 * @param {Array<{str:string,x:number,y:number,w:number,page:number}>} items
 * @returns {Object} field -> { value, confidence, label, placement }
 */
export function parseTitleBlock(items = []) {
  const found = {}
  if (!items.length) return found

  for (const [field, re] of Object.entries(FIELD_LABELS)) {
    const candidates = items.filter((it) => re.test(clean(it.str)))
    for (const label of candidates) {
      const hit = valueFor(label, items)
      if (!hit) continue
      // keep the most confident match for each field
      const better = !found[field] ||
        (found[field].confidence !== 'High' && hit.confidence === 'High')
      if (better) found[field] = { ...hit, label: clean(label.str) }
      if (found[field]?.confidence === 'High') break
    }
  }

  // Post-process the values that have a known shape
  if (found.weight) {
    const m = String(found.weight.value).match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gram|kgs)?/i)
    if (m) {
      const n = parseFloat(m[1].replace(',', '.'))
      found.weight.kg = /^g/i.test(m[2] || '') ? n / 1000 : n
    } else {
      delete found.weight
    }
  }
  if (found.revision) {
    const m = String(found.revision.value).match(/^[A-Z]?\d{1,2}$|^[A-Z]$/i)
    if (!m) delete found.revision
  }
  return found
}

/** Scan the whole sheet for callouts that are not in a labelled title-block cell. */
export function scanAnnotations(items = []) {
  const text = items.map((i) => i.str).join('  ')
  const out = {}

  const ra = text.match(/Ra\s*([0-9]+(?:\.[0-9]+)?)/i)
  if (ra) out.surfaceFinish = `Ra ${ra[1]}`

  const tol = text.match(/±\s*([0-9]+(?:\.[0-9]+)?)/)
  if (tol) out.tolerance = `±${tol[1]}`

  const dias = [...text.matchAll(/[Ø⌀]\s*([0-9]+(?:\.[0-9]+)?)/g)].map((m) => parseFloat(m[1]))
  if (dias.length) out.diameters = [...new Set(dias)].sort((a, b) => b - a)

  const threads = text.match(/\bM\s?\d{1,3}(?:\s*[x×]\s*[0-9.]+)?/i)
  if (threads) out.thread = threads[0].replace(/\s+/g, '')

  return out
}
