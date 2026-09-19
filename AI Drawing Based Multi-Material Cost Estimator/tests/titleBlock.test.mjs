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


show('BITS title block: full sheet', [
  { str: 'Material Description,Size,Spec.Std.No', x: 10, y: 10, w: 200, page: 1 },
  { str: 'E34', x: 90, y: 28, w: 20, page: 1 },
  { str: 'THK:5mm', x: 78, y: 46, w: 48, page: 1 },

  // revision table: entries above, headings below
  { str: '14/11', x: 312, y: 100, w: 26, page: 1 },
  { str: 'NR', x: 420, y: 100, w: 14, page: 1 },
  { str: 'NEW RELEASE', x: 560, y: 100, w: 78, page: 1 },
  { str: 'SELVA', x: 770, y: 96, w: 32, page: 1 },
  { str: 'VIJAY', x: 830, y: 100, w: 30, page: 1 },
  { str: 'VINOTH', x: 880, y: 100, w: 34, page: 1 },
  { str: 'Date', x: 310, y: 120, w: 22, page: 1 },
  { str: 'Mod. No.', x: 350, y: 120, w: 40, page: 1 },
  { str: 'Sl.No', x: 415, y: 120, w: 26, page: 1 },
  { str: 'Zone', x: 470, y: 120, w: 24, page: 1 },
  { str: 'Modification', x: 570, y: 120, w: 60, page: 1 },
  { str: 'Modified By', x: 760, y: 120, w: 52, page: 1 },
  { str: 'Chkd', x: 830, y: 120, w: 24, page: 1 },
  { str: 'Appd', x: 880, y: 120, w: 24, page: 1 },

  // sign-off block: the year sits in its own cell
  { str: '2020', x: 215, y: 160, w: 24, page: 1 },
  { str: 'SIGN', x: 265, y: 160, w: 26, page: 1 },
  { str: 'DATE', x: 315, y: 160, w: 26, page: 1 },
  { str: 'DRN', x: 213, y: 180, w: 22, page: 1 },
  { str: 'SELVA', x: 262, y: 180, w: 32, page: 1 },
  { str: '12/11', x: 313, y: 180, w: 26, page: 1 },
  { str: 'CHKD', x: 213, y: 200, w: 26, page: 1 },
  { str: 'VIJAY', x: 262, y: 200, w: 30, page: 1 },
  { str: '14/11', x: 313, y: 200, w: 26, page: 1 },
  { str: 'APPD', x: 213, y: 220, w: 26, page: 1 },
  { str: 'VINOTH', x: 262, y: 220, w: 34, page: 1 },
  { str: '14/11', x: 313, y: 220, w: 26, page: 1 },

  { str: 'NEXT ASSEMBLY:', x: 372, y: 178, w: 82, page: 1 },
  { str: '2A0105A007', x: 380, y: 196, w: 62, page: 1 },
  { str: 'Scale: 1:1', x: 213, y: 245, w: 50, page: 1 },
  { str: 'Product/Group No.', x: 372, y: 228, w: 92, page: 1 },
  { str: 'BITS.20.001', x: 390, y: 258, w: 62, page: 1 },

  { str: 'Fin.mass', x: 530, y: 170, w: 40, page: 1 },
  { str: 'in kg', x: 530, y: 182, w: 24, page: 1 },
  { str: '0.122', x: 530, y: 198, w: 28, page: 1 },

  { str: 'Drg./Part Designation', x: 213, y: 300, w: 104, page: 1 },
  { str: 'SIDE STAND MTG BKT', x: 245, y: 330, w: 118, page: 1 },
  { str: 'Drg./Part No.', x: 600, y: 300, w: 62, page: 1 },
  { str: '2A010511B027', x: 620, y: 330, w: 92, page: 1 },
  { str: 'Sheet No.  1  of  1  Sheets', x: 600, y: 360, w: 120, page: 1 },
  { str: 'Tol. as per Std.', x: 600, y: 212, w: 70, page: 1 },
], {
  partName: 'SIDE STAND MTG BKT', partNumber: '2A010511B027', drawingNumber: '2A010511B027',
  revision: 'NR', material: 'E34, THK:5mm', weight: '0.122', drawingDate: '2020-11-14',
  nextAssembly: '2A0105A007', productGroup: 'BITS.20.001', scale: '1:1',
})

console.log(failed ? `
${failed} FAILING` : `
all ${total} layouts pass`)
process.exit(failed ? 1 : 0)
