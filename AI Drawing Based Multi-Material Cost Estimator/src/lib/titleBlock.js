// ---------------------------------------------------------------------------
// TITLE BLOCK READER
// Maps positioned text from a drawing onto the fields a costing needs.
//
// Three rules keep it honest:
//  1. A value is only accepted where a title block actually puts one —
//     inline after the label, in the same row to its right, or directly beneath.
//  2. A value must belong to that label: if another label is a closer owner of
//     the same text, it is not taken.
//  3. A value must look like the thing it claims to be. Column headings such as
//     "Size," or "Sheet" are never a part name.
// ---------------------------------------------------------------------------

/** Label vocabulary, including the abbreviations CAD title blocks actually use. */
export const FIELD_LABELS = {
  partName: /^(drg\.?\s*\/?\s*part\s*desig|part\s*desig|part\s*name|part\s*descr|description|designation|benennung|title|component\s*name|nomenclature|item\s*name)/i,
  // "Drg./Part No." is one cell serving both numbers — matched here, then
  // mirrored onto the drawing number below.
  partNumber: /^(drg\.?\s*\/?\s*part\s*(no|nr|number)|part\s*(no|nr|num|number|code)|p\/?n\b|item\s*(no|code)|component\s*(no|code)|teil\s*nr|artikel)/i,
  drawingNumber: /^(dr(aw)?(g|ing)?\.?\s*(no|nr|num|number)|dwg\.?\s*(no)?|zeichnungs?\s*nr|doc(ument)?\s*(no|number))/i,
  // Not a costing field, but claiming it stops "1 of 1 Sheets" being read as
  // a drawing number.
  sheet: /^(sheet|sht)s?\.?\s*(no|size)?$/i,
  // Revision-history columns. Claiming them keeps each entry in its own
  // column, and the modification text explains what the revision was.
  modification: /^(modification|description\s*of\s*change|change\s*(description|note)|nature\s*of\s*change|amendment|remarks?)$/i,
  ecnNo: /^(ecn\.?\s*no\.?|eco\.?\s*no\.?|change\s*no\.?)$/i,
  zone: /^zone$/i,
  // REV, REVN, "REVN O." (REV NO. wrapped mid-word by the CAD system),
  // REV NO., ISS, ISSUE — the forms that actually appear on sheets
  revision: /^(rev(is(ion)?)?\s*\.?\s*n?o?\.?|revn\s*o?\.?|iss(ue)?\.?\s*(no)?\.?|änderung|alt(eration)?)$/i,
  material: /^(material|werkstoff|mat(l|erial)?\.?\s*(spec|grade)?|stock|raw\s*material)/i,
  weight: /^(weight|mass|gewicht|wt\.?)/i,
  scale: /^(scale|maßstab|masstab)/i,
  // An approval / release date is the controlled date on most title blocks,
  // so it is preferred over a plain "Date" cell.
  approvedDate: /^(app(r(o)?)?(o?v(e)?d|d)?\.?\s*(on|date|dt)?|approval\s*date|released?\s*(on|date)?|date\s*of\s*(approval|issue|release))$/i,
  drawingDate: /^(date|datum|drawn\s*on|issue\s*date|dt\.?)$/i,
  generalTolerance: /^(gen(eral)?\.?\s*tol|tolerance[s]?|unspecified\s*tol|tol(erance)?\s*class|allgemeintoleranz)/i,
  surfaceFinish: /^(surface\s*(finish|roughness|texture)|roughness|finish|oberfl)/i,
  heatTreatment: /^(heat\s*treat|hardness|hrc|case\s*depth|wärmebehandlung)/i,
  customer: /^(customer|client|kunde)/i,
  drawnBy: /^(drawn(\s*by)?|prepared(\s*by)?|gezeichnet)/i,
  quantity: /^(qty|quantity|stück)/i,
}

const ALL_LABELS = Object.values(FIELD_LABELS)
const stripEdges = (s) => s.replace(/^[\s:.\-–—|]+/, '').replace(/[\s:.\-–—|,]+$/, '').trim()
const looksLikeLabel = (s) => ALL_LABELS.some((re) => re.test(stripEdges(s)))

/** Title-block furniture that is never a value. */
const STOPWORDS = new Set([
  'size', 'scale', 'sheet', 'sheets', 'date', 'name', 'sign', 'signature', 'sig',
  'drawn', 'checked', 'chkd', 'approved', 'appd', 'apprd', 'dwn', 'des', 'designed',
  'weight', 'material', 'rev', 'revn', 'revision', 'qty', 'quantity', 'unit', 'units',
  'mm', 'cm', 'inch', 'kg', 'tolerance', 'tol', 'finish', 'title', 'drawing', 'drg',
  'dwg', 'part', 'no', 'nos', 'number', 'projection', 'angle', 'third angle', 'first angle',
  'page', 'of', 'all dimensions in mm', 'do not scale', 'confidential', 'sl', 'sr',
  'sht', 'shts', 'sheets', 'issue', 'iss', 'checked by', 'approved by', 'drawn by',
  'a0', 'a1', 'a2', 'a3', 'a4', 'description', 'designation', 'item', 'code', 'remarks',
])

const isNoise = (s) => !s || /^[-–—_:.,/|\s]+$/.test(s) || s.length > 90
const isStopword = (s) => STOPWORDS.has(s.toLowerCase().replace(/[.,:;]+$/, '').trim())

/** Does this text plausibly belong in that field? */
function valid(field, raw) {
  const s = stripEdges(raw)
  if (!s || isStopword(s)) return false
  switch (field) {
    case 'partName':
      // a name has letters, is not a lone code, and is not a column heading
      return /[A-Za-z]{3}/.test(s) && s.length >= 3 && s.length <= 60 && !/^\d+$/.test(s)
    case 'partNumber':
    case 'drawingNumber':
      // A part/drawing number is a single token with a digit in it. Rejecting
      // whitespace keeps out sheet counters ("1 .... of .... 1 .... Sheets"),
      // and rejecting parseable dates keeps out the date cell ("19/06/26").
      return /\d/.test(s)
        && /^[A-Za-z0-9][A-Za-z0-9._\-/]{2,29}$/.test(s)
        && !normalizeDate(s)
        && !/sheet|scale|rev\b/i.test(s)
    case 'revision':
      // A1, 01, H, and letter codes such as NR ("new release") — but not a
      // whole word, which would be a neighbouring heading.
      return /^(rev\.?\s*)?[A-Z]{0,3}\d{0,2}$/i.test(s) && s.length <= 4 && /[A-Z0-9]/i.test(s)
    case 'approvedDate':
    case 'drawingDate':
      return !!normalizeDate(s)
    case 'weight':
      return /\d/.test(s)
    case 'material':
      return /[A-Za-z]{2}/.test(s) && s.length <= 60
    default:
      return s.length <= 80
  }
}

/** dd.mm.yyyy, dd/mm/yy, yyyy-mm-dd, 12 Mar 2026 -> yyyy-mm-dd (or null). */
export function normalizeDate(raw = '') {
  const s = String(raw).trim()
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})$/)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})$/)
  if (m) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const mi = months.indexOf(m[2].slice(0, 3).toLowerCase())
    if (mi >= 0) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3]
      return `${y}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }
  }
  return null
}

/**
 * Merge text runs that belong to one phrase.
 * PDF writers split a cell such as "Drg./Part Designation" into several runs;
 * matched separately they never look like a label. Runs on the same baseline
 * are joined only while the gap stays within a couple of characters, so a
 * label never swallows the value sitting further along the row.
 */
export function toPhrases(items = []) {
  const rows = new Map()
  for (const it of items) {
    const key = `${it.page}:${Math.round(it.y / 3)}`
    if (!rows.has(key)) rows.set(key, [])
    rows.get(key).push(it)
  }
  const phrases = []
  for (const row of rows.values()) {
    row.sort((a, b) => a.x - b.x)
    let cur = null
    for (const it of row) {
      const charW = it.w && it.str.length ? it.w / it.str.length : 4
      // A word gap inside one cell is a few characters wide; a label-to-value
      // gap in a title block is far larger, so cap the join distance.
      if (cur && it.x - (cur.x + cur.w) <= Math.min(12, Math.max(4, charW * 3))) {
        cur.str = `${cur.str}${it.x - (cur.x + cur.w) > charW * 0.4 ? ' ' : ''}${it.str}`
        cur.w = it.x + it.w - cur.x
      } else {
        if (cur) phrases.push(cur)
        cur = { ...it }
      }
    }
    if (cur) phrases.push(cur)
  }
  return phrases
}

/**
 * Join a heading that the CAD system wrapped onto a second line.
 * "REV NO." is often drawn as "REVN" above "O.", and without this the "O."
 * fragment sits exactly where a value would and gets read as the revision.
 * Two stacked fragments are merged only when the joined text is itself a
 * recognised label.
 */
export function mergeWrappedLabels(phrases) {
  const dropped = new Set()
  for (const a of phrases) {
    if (dropped.has(a)) continue
    for (const b of phrases) {
      if (a === b || dropped.has(b) || b.page !== a.page) continue
      const dy = b.y - a.y
      if (dy <= 1 || dy > 13 || Math.abs(b.x - a.x) > 14) continue
      if (b.str.length > 6) continue
      const joined = `${a.str} ${b.str}`.trim()
      if (joined.length <= 24 && looksLikeLabel(joined)) {
        a.str = joined
        a.w = Math.max(a.w, b.w)
        dropped.add(b)
      }
    }
  }
  return phrases.filter((p) => !dropped.has(p))
}

/**
 * Score of a label/value pairing, or null when the geometry rules it out.
 * `allowAbove` covers revision-history tables, which are headed at the bottom:
 * the entries sit above "DATE | ECN.NO. | REVN | ZONE | MODIFICATION". It is a
 * last resort and demands the value sit almost directly over its heading.
 */
function pairScore(label, item, allowAbove = false) {
  if (item === label || item.page !== label.page) return null
  const labelRight = label.x + (label.w || label.str.length * 4)
  const dy = item.y - label.y
  const dx = item.x - label.x
  if (Math.abs(dy) <= 4.5 && item.x >= labelRight - 2 && dx < 320) return { score: dx, placement: 'right' }
  if (dy > 1 && dy <= 42 && dx > -60 && dx < 420) return { score: 1000 + dy * 6 + Math.abs(dx) * 0.2, placement: 'below' }
  if (allowAbove && dy < -2 && dy >= -46 && Math.abs(dx) <= 40) {
    return { score: 2000 + Math.abs(dy) * 6 + Math.abs(dx) * 2, placement: 'above' }
  }
  return null
}

/** Find the value for a label, rejecting text that a nearer label owns. */
function valueFor(field, label, phrases, labelIndex, labelRe) {
  const inline = label.str.split(/[:：]/)
  if (inline.length > 1) {
    const v = stripEdges(inline.slice(1).join(':'))
    if (v && valid(field, v)) return { value: v, confidence: 'High', placement: 'inline' }
  }
  // "GENERAL TOL +/- 0.2" — the cell holds its own value with no colon.
  // Take the remainder after the label text rather than reaching for the
  // next row, which belongs to something else.
  if (labelRe) {
    const m = label.str.match(labelRe)
    const after = m ? label.str.slice(m[0].length) : ''
    // Only when the label ends at a separator — otherwise "Drg./Part Designation"
    // would be split into the label "…Desig" and a value of "nation".
    if (after && /^[\s:.\-–—|]/.test(after)) {
      const remainder = stripEdges(after)
      if (remainder && valid(field, remainder)) {
        return { value: remainder, confidence: 'High', placement: 'inline' }
      }
    }
  }

  // Pass 1 looks right and below; only if that finds nothing does pass 2 look
  // above, so an ordinary title block can never be read upside down.
  const search = (allowAbove) => {
    let best = null
    for (const it of phrases) {
      const s = stripEdges(it.str)
      if (isNoise(s) || looksLikeLabel(s) || !valid(field, s)) continue
      const pair = pairScore(label, it, allowAbove)
      if (!pair) continue

      // Ownership: whichever label pairs most tightly with this text owns it.
      let owner = label
      let ownerScore = pair.score
      for (const other of labelIndex) {
        if (other.item === label) continue
        const p = pairScore(other.item, it, allowAbove)
        if (p && p.score < ownerScore) { owner = other.item; ownerScore = p.score }
      }
      if (owner !== label) continue

      if (!best || pair.score < best.score) best = { value: s, score: pair.score, placement: pair.placement }
    }
    return best
  }

  const best = search(false) || search(true)
  if (!best) return null
  return {
    value: best.value,
    confidence: best.placement === 'right' || best.placement === 'inline' ? 'High' : 'Medium',
    placement: best.placement,
  }
}

/**
 * @param {Array<{str:string,x:number,y:number,w:number,page:number}>} items
 * @returns {Object} field -> { value, confidence, label, placement }
 */
export function parseTitleBlock(items = []) {
  const found = {}
  if (!items.length) return found
  const phrases = mergeWrappedLabels(toPhrases(items))

  // Every label on the sheet, used for the ownership test
  const labelIndex = []
  for (const [field, re] of Object.entries(FIELD_LABELS)) {
    for (const it of phrases) if (re.test(stripEdges(it.str))) labelIndex.push({ field, item: it })
  }

  for (const [field, re] of Object.entries(FIELD_LABELS)) {
    for (const label of phrases.filter((it) => re.test(stripEdges(it.str)))) {
      const hit = valueFor(field, label, phrases, labelIndex, re)
      if (!hit) continue
      if (!found[field] || (found[field].confidence !== 'High' && hit.confidence === 'High')) {
        found[field] = { ...hit, label: stripEdges(label.str) }
      }
      if (found[field]?.confidence === 'High') break
    }
  }

  // ---- shape the values that have a known form -----------------------------
  if (found.weight) {
    const m = String(found.weight.value).match(/(\d+(?:[.,]\d+)?)\s*(kgs?|g|gram)?/i)
    if (m) {
      const n = parseFloat(m[1].replace(',', '.'))
      found.weight.kg = /^g/i.test(m[2] || '') ? n / 1000 : n
    } else delete found.weight
  }
  if (found.revision) {
    found.revision.value = String(found.revision.value).replace(/^rev\.?\s*/i, '').toUpperCase()
    // The modification column says what the revision was, e.g. "NEW RELEASE"
    if (found.modification?.value) found.revision.change = found.modification.value
  }
  delete found.modification
  delete found.ecnNo
  delete found.zone

  // An approval date is the controlled date; fall back to a plain date cell.
  const dateHit = found.approvedDate || found.drawingDate
  if (dateHit) {
    const iso = normalizeDate(dateHit.value)
    if (iso) {
      found.drawingDate = { ...dateHit, value: iso, raw: dateHit.value }
    } else delete found.drawingDate
  }
  delete found.approvedDate

  // Many drawings carry one number for both fields. Mirror it rather than
  // leaving a blank, and say so.
  if (found.drawingNumber && !found.partNumber) {
    found.partNumber = { ...found.drawingNumber, mirrored: 'drawingNumber', confidence: 'Medium' }
  } else if (found.partNumber && !found.drawingNumber) {
    found.drawingNumber = { ...found.partNumber, mirrored: 'partNumber', confidence: 'Medium' }
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
