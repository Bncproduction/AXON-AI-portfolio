import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// ---------------------------------------------------------------------------
// Pull the real text out of an uploaded drawing.
// Vector PDFs exported from CAD and DXF files both carry their annotation text,
// so the title block can be read exactly rather than guessed. Scanned raster
// drawings carry no text at all — that case is reported, never fabricated.
// ---------------------------------------------------------------------------

/** @typedef {{ str: string, x: number, y: number, w: number, page: number }} TextItem */

export async function extractPdfText(file) {
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise
  const items = []
  const pages = Math.min(doc.numPages, 5) // title block is on the first sheets
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const height = page.view[3]
    for (const it of content.items) {
      const str = (it.str || '').trim()
      if (!str) continue
      const [, , , , x, y] = it.transform
      items.push({ str, x, y: height - y, w: it.width || 0, page: p })
    }
  }
  await doc.destroy()
  return { items, pages: doc.numPages, kind: 'pdf' }
}

/** DXF is plain text: TEXT / MTEXT values live in group code 1 (and 3 for long MTEXT). */
export async function extractDxfText(file) {
  const raw = await file.text()
  const lines = raw.split(/\r?\n/)
  const items = []
  let entity = null
  let x = 0, y = 0
  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = lines[i].trim()
    const value = lines[i + 1]
    if (code === '0') {
      entity = value.trim()
      x = 0; y = 0
    } else if (entity === 'TEXT' || entity === 'MTEXT' || entity === 'ATTRIB') {
      if (code === '10') x = parseFloat(value) || 0
      else if (code === '20') y = parseFloat(value) || 0
      else if (code === '1' || code === '3') {
        // strip MTEXT formatting codes such as \pxqc, {\fArial|b0;...}
        const str = value.replace(/\\[A-Za-z][^;\\]*;?/g, '').replace(/[{}]/g, '').trim()
        if (str) items.push({ str, x, y: -y, w: str.length * 2, page: 1 })
      }
    }
  }
  return { items, pages: 1, kind: 'dxf' }
}

const EXT = (name = '') => name.split('.').pop().toLowerCase()

/**
 * Read whatever text the file exposes.
 * Returns hasText:false (with a reason) rather than inventing content.
 */
export async function readDrawingText(file) {
  const ext = EXT(file.name)
  try {
    let result
    if (ext === 'pdf') result = await extractPdfText(file)
    else if (ext === 'dxf') result = await extractDxfText(file)
    else if (['png', 'jpg', 'jpeg', 'tif', 'tiff', 'bmp'].includes(ext)) {
      return { items: [], hasText: false, reason: 'Raster image — no text layer. Optical character recognition is not available in this build, so title-block values must be entered manually.' }
    } else if (['dwg', 'step', 'stp', 'iges', 'igs'].includes(ext)) {
      return { items: [], hasText: false, reason: `${ext.toUpperCase()} is a binary CAD format that needs a server-side converter. Export a PDF or DXF to have the title block read automatically.` }
    } else {
      return { items: [], hasText: false, reason: 'Unsupported file type for text extraction.' }
    }

    if (!result.items.length) {
      return {
        ...result,
        hasText: false,
        reason: ext === 'pdf'
          ? 'This PDF has no text layer — it is most likely a scan or a plot saved as an image. Title-block values must be entered manually.'
          : 'No TEXT or MTEXT entities were found in this DXF.',
      }
    }
    return { ...result, hasText: true, reason: '' }
  } catch (err) {
    return { items: [], hasText: false, reason: `Could not read this file: ${err?.message || err}` }
  }
}
