import * as pdfjs from 'pdfjs-dist'

// ---------------------------------------------------------------------------
// DRAWING THUMBNAIL
// The preview used to be an object URL (blob:…), which dies the moment the
// page reloads — so every stored drawing lost its preview. PDFs were also
// shown in an <iframe>, which depends on the browser's built-in PDF viewer and
// renders blank in embedded browsers.
//
// Both are solved by rendering page 1 ourselves and keeping a compact JPEG:
// it survives a reload, needs no plugin, and displays as a plain <img>.
// ---------------------------------------------------------------------------

const MAX_BYTES = 1_400_000 // keep well inside the local-storage budget

function toJpeg(canvas) {
  // Step down until the image is small enough to store.
  for (const [width, quality] of [[1100, 0.72], [800, 0.66], [560, 0.6]]) {
    const scale = Math.min(1, width / canvas.width)
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(canvas.width * scale))
    out.height = Math.max(1, Math.round(canvas.height * scale))
    const ctx = out.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(canvas, 0, 0, out.width, out.height)
    const url = out.toDataURL('image/jpeg', quality)
    if (url.length <= MAX_BYTES) return url
  }
  return null
}

async function pdfThumbnail(file) {
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise
  const page = await doc.getPage(1)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: Math.min(2.5, 1400 / base.width) })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  await doc.destroy()
  return toJpeg(canvas)
}

async function imageThumbnail(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('could not decode'))
      i.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0)
    return toJpeg(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * A durable preview image for the uploaded drawing, or null when the format
 * cannot be rendered in a browser (DWG, STEP, IGES).
 */
export async function makeThumbnail(file) {
  const ext = String(file.name).split('.').pop().toLowerCase()
  try {
    if (ext === 'pdf') return await pdfThumbnail(file)
    if (['png', 'jpg', 'jpeg', 'bmp', 'webp', 'gif'].includes(ext)) return await imageThumbnail(file)
    return null
  } catch {
    return null // a preview is a convenience; never block the upload for it
  }
}
