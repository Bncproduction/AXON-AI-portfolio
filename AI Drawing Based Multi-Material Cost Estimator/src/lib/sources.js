// Provenance labels used across the whole application.
// Rule 17: every number on screen must declare where it came from.
export const SRC = {
  DRAWING: 'Drawing',
  AI: 'AI Calculated',
  USER: 'User Input',
  ASSUMPTION: 'Estimated Assumption',
  NA: 'Not Available in Drawing',
}

export const SOURCE_ORDER = [SRC.DRAWING, SRC.AI, SRC.USER, SRC.ASSUMPTION, SRC.NA]

export const CONFIDENCE = ['High', 'Medium', 'Low', '—']

export const DISCLAIMER =
  'Estimated – Engineering / Commercial Validation Required.'

export const RECO_DISCLAIMER =
  'Material suitability and manufacturing-process selections shown here are recommendations for evaluation only. They are not an engineering approval.'

/** Build a provenance-tagged field. */
export const f = (value, source = SRC.ASSUMPTION, confidence = 'Medium', note = '') => ({
  value,
  source,
  confidence,
  note,
})

/** A field explicitly not present on the drawing. */
export const na = (note = '') => ({
  value: null,
  source: SRC.NA,
  confidence: '—',
  note,
})

export const isAvailable = (field) =>
  field && field.source !== SRC.NA && field.value !== null && field.value !== '' && field.value !== undefined

export const displayValue = (field, suffix = '') => {
  if (!isAvailable(field)) return 'Not Available in Drawing'
  return `${field.value}${suffix}`
}
