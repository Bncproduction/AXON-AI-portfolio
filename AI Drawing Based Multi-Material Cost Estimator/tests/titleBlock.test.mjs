// Title-block layouts taken from real drawings. Each one previously broke
// the reader; they are kept here so a vocabulary or geometry tweak cannot
// silently undo an earlier fix.  Run with: npm test
const { parseTitleBlock } = await import('../src/lib/titleBlock.js')
let failed = 0
let total = 0
const show = (name, items, expect) => {
  total++
  const tb = parseTitleBlock(items)
  const got = Object.fromEntries(Object.entries(tb).map(([k, v]) => [k, v.value]))
  const fails = Object.entries(expect).filter(([k, v]) => String(got[k] ?? '') !== String(v))
  if (fails.length) failed++
  console.log(`${fails.length ? 'FAIL' : 'pass'}  ${name}`)
  fails.forEach(([k, v]) => console.log(`        ${k}: expected "${v}", got "${got[k] ?? '(none)'}"`))
}

show('top-headed REVN + value below', [
  { str: 'REVN', x: 300, y: 100, w: 22, page: 1 },
  { str: 'H', x: 300, y: 118, w: 8, page: 1 },
  { str: 'Drawing No.', x: 60, y: 100, w: 46, page: 1 },
  { str: 'BNC-DRG-9931', x: 60, y: 118, w: 70, page: 1 },
], { revision: 'H', drawingNumber: 'BNC-DRG-9931', partNumber: 'BNC-DRG-9931' })

show('material label with value close below (must not merge)', [
  { str: 'Material', x: 60, y: 100, w: 32, page: 1 },
  { str: 'EN8', x: 62, y: 110, w: 20, page: 1 },
], { material: 'EN8' })

show('bottom-headed revision table', [
  { str: 'NR', x: 300, y: 100, w: 12, page: 1 },
  { str: 'NEW RELEASE', x: 430, y: 100, w: 70, page: 1 },
  { str: 'DATE', x: 60, y: 118, w: 22, page: 1 },
  { str: 'ECN.NO.', x: 160, y: 118, w: 34, page: 1 },
  { str: 'REVN', x: 298, y: 118, w: 22, page: 1 },
  { str: 'O.', x: 300, y: 126, w: 8, page: 1 },
  { str: 'ZONE', x: 360, y: 118, w: 22, page: 1 },
  { str: 'MODIFICATION', x: 430, y: 118, w: 70, page: 1 },
], { revision: 'NR' })

show('designation + Size decoy + approved vs drawn date', [
  { str: 'Drg./Part', x: 60, y: 150, w: 30, page: 1 },
  { str: 'Designation', x: 92, y: 150, w: 42, page: 1 },
  { str: 'WHEEL SPACER RH', x: 100, y: 170, w: 110, page: 1 },
  { str: 'Size,', x: 300, y: 150, w: 22, page: 1 },
  { str: 'A3', x: 300, y: 170, w: 12, page: 1 },
  { str: 'Drawn', x: 60, y: 245, w: 24, page: 1 },
  { str: '01.02.2026', x: 60, y: 261, w: 46, page: 1 },
  { str: 'Approved', x: 180, y: 245, w: 36, page: 1 },
  { str: '14.03.2026', x: 180, y: 261, w: 46, page: 1 },
], { partName: 'WHEEL SPACER RH', drawingDate: '2026-03-14' })

show('sheet counter + date decoys', [
  { str: 'Drg./Part', x: 60, y: 100, w: 30, page: 1 },
  { str: 'No.', x: 92, y: 100, w: 12, page: 1 },
  { str: '2A040615B017', x: 110, y: 118, w: 70, page: 1 },
  { str: 'Sheet', x: 300, y: 100, w: 22, page: 1 },
  { str: '1 .... of .... 1 .... Sheets', x: 300, y: 118, w: 100, page: 1 },
  { str: 'Date', x: 430, y: 100, w: 18, page: 1 },
  { str: '19/06/26', x: 430, y: 118, w: 40, page: 1 },
], { drawingNumber: '2A040615B017', partNumber: '2A040615B017', drawingDate: '2026-06-19' })

show('signature row, one text run', [
  { str: 'APPROVED  VINOTH  19/06/26', x: 60, y: 100, w: 150, page: 1 },
], { drawingDate: '2026-06-19' })

show('signature row, separate cells', [
  { str: 'APPROVED', x: 60, y: 100, w: 40, page: 1 },
  { str: 'VINOTH', x: 120, y: 100, w: 34, page: 1 },
  { str: '19/06/26', x: 180, y: 100, w: 40, page: 1 },
], { drawingDate: '2026-06-19' })

show('multi-line material heading + two-line value', [
  { str: 'Material description, Size,', x: 60, y: 100, w: 120, page: 1 },
  { str: 'Spec, Std No.', x: 90, y: 109, w: 60, page: 1 },
  { str: 'IS 3074 CEW I', x: 70, y: 128, w: 70, page: 1 },
  { str: '\u00d8 20mm', x: 85, y: 144, w: 40, page: 1 },
], { material: 'IS 3074 CEW I, Ø 20mm' })

show('material vs neighbouring MODEL, USED ON column', [
  { str: 'Material description, Size,', x: 60, y: 100, w: 120, page: 1 },
  { str: 'Spec, Std No.', x: 85, y: 109, w: 60, page: 1 },
  { str: 'MODEL, USED ON', x: 250, y: 100, w: 80, page: 1 },
  { str: 'IS 3074 CEW I', x: 70, y: 128, w: 70, page: 1 },
  { str: 'Ø 20mm', x: 85, y: 144, w: 40, page: 1 },
  { str: 'XYZ-500 / ABC-750', x: 250, y: 128, w: 90, page: 1 },
], { material: 'IS 3074 CEW I, Ø 20mm' })

// a plain-word grade must still be accepted when nothing spec-like competes
show('plain word material', [
  { str: 'Material', x: 60, y: 100, w: 32, page: 1 },
  { str: 'Mild Steel', x: 60, y: 118, w: 44, page: 1 },
], { material: 'Mild Steel' })


console.log(failed ? `
${failed} FAILING` : `
all ${total} layouts pass`)
process.exit(failed ? 1 : 0)
