import { createWorker } from 'tesseract.js'
import * as pdfjs from 'pdfjs-dist'

// ---------------------------------------------------------------------------
// OCR fallback for drawings with no text layer.
// Scanned sheets and plots saved as images carry no extractable text, so the
// page is rendered and read optically. Word boxes come back positioned, which
// is what the title-block reader needs — it works on geometry, not raw text.
// ---------------------------------------------------------------------------

/** Render one PDF page to a canvas at a resolution OCR can actually read. */
async function renderPdfPage(file, pageNo = 1, targetWidth = 2400) {
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise
  const page = await doc.getPage(Math.min(pageNo, doc.numPages))
  const base = page.getViewport({ scale: 1 })
  const scale = Math.min(4, Math.max(1.5, targetWidth / base.width))
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  // White background: scans often have transparency that OCRs as black.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  const pages = doc.numPages
  await doc.destroy()
  return { canvas, scale, pages }
}

/** Load a raster file into a canvas. */
async function imageToCanvas(file, targetWidth = 2400) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Image could not be decoded'))
      i.src = url
    })
    const scale = Math.min(4, Math.max(1, targetWidth / img.naturalWidth))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return { canvas, scale, pages: 1 }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Collect word boxes from whatever shape this tesseract build returns. */
function wordsFrom(data) {
  if (data?.words?.length) return data.words
  const out = []
  for (const block of data?.blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) out.push(...(line.words || []))
    }
  }
  return out
}

/**
 * Read a scanned drawing optically.
 * @returns {{items: Array, hasText: boolean, reason: string, viaOcr: true}}
 */
export async function ocrDrawing(file, { onProgress } = {}) {
  const ext = String(file.name).split('.').pop().toLowerCase()
  let worker
  try {
    const { canvas, scale } = ext === 'pdf'
      ? await renderPdfPage(file)
      : await imageToCanvas(file)

    onProgress?.({ stage: 'Loading the OCR engine', pct: 0 })
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') onProgress?.({ stage: 'Reading the drawing', pct: Math.round(m.progress * 100) })
        else onProgress?.({ stage: m.status, pct: 0 })
      },
    })

    const { data } = await worker.recognize(canvas, {}, { blocks: true })
    const words = wordsFrom(data)

    // Back to page coordinates so the title-block reader sees the same
    // geometry it would from a vector PDF.
    const items = words
      .filter((w) => (w.confidence ?? 0) >= 45 && String(w.text || '').trim())
      .map((w) => {
        const b = w.bbox || {}
        return {
          str: String(w.text).trim(),
          x: (b.x0 ?? 0) / scale,
          y: (b.y0 ?? 0) / scale,
          w: ((b.x1 ?? 0) - (b.x0 ?? 0)) / scale,
          page: 1,
          ocrConfidence: Math.round(w.confidence),
        }
      })

    if (!items.length) {
      return { items: [], hasText: false, viaOcr: true, reason: 'Optical character recognition found no legible text on this sheet. It may be too low-resolution, skewed or faint.' }
    }
    const avg = Math.round(items.reduce((a, i) => a + i.ocrConfidence, 0) / items.length)
    return { items, hasText: true, viaOcr: true, ocrConfidence: avg, pages: 1, kind: 'ocr', reason: '' }
  } catch (err) {
    return { items: [], hasText: false, viaOcr: true, reason: `Optical character recognition failed: ${err?.message || err}` }
  } finally {
    try { await worker?.terminate() } catch { /* already gone */ }
  }
}

export const OCR_ABLE = (fileName = '') =>
  ['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'bmp', 'webp'].includes(String(fileName).split('.').pop().toLowerCase())
