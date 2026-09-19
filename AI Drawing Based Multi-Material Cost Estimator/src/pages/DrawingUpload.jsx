import React, { useRef, useState } from 'react'
import { useStore, makeSampleDrawing, useDeleteDrawing } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Banner, Field } from '../components/ui.jsx'
import { SAMPLE_DRAWINGS } from '../data/sampleDrawings.js'
import { parseFileName } from '../lib/aiEngine.js'
import { readDrawingText } from '../lib/fileText.js'
import { parseTitleBlock, scanAnnotations } from '../lib/titleBlock.js'
import { uid, dateTime } from '../lib/format.js'

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.dwg,.dxf,.step,.stp,.iges,.igs'
const EXT_SUPPORT = {
  pdf: { view: true, note: 'Rendered inline. Views, title block and notes are read by the analysis engine.' },
  jpg: { view: true, note: 'Raster drawing. Dimension text is read by OCR; confidence is usually lower than vector.' },
  jpeg: { view: true, note: 'Raster drawing. Dimension text is read by OCR; confidence is usually lower than vector.' },
  png: { view: true, note: 'Raster drawing. Dimension text is read by OCR; confidence is usually lower than vector.' },
  dxf: { view: false, note: 'Vector 2D CAD. Entities and flat-pattern geometry are parsed; no inline browser preview.' },
  dwg: { view: false, note: 'Native AutoCAD. Parsed server-side in a production deployment; no inline browser preview.' },
  step: { view: false, note: '3D solid model — highest confidence volume source. No inline browser preview in this build.' },
  stp: { view: false, note: '3D solid model — highest confidence volume source. No inline browser preview in this build.' },
  iges: { view: false, note: '3D surface model. Volume requires a healed solid; treat results with caution.' },
  igs: { view: false, note: '3D surface model. Volume requires a healed solid; treat results with caution.' },
}

const extOf = (name = '') => name.split('.').pop().toLowerCase()

export default function DrawingUpload({ go }) {
  const { state, dispatch, drawing } = useStore()
  const removeDrawing = useDeleteDrawing()
  const [over, setOver] = useState(false)
  const [reading, setReading] = useState(false)
  const [pending, setPending] = useState(null)
  const inputRef = useRef(null)

  const takeFile = async (file) => {
    if (!file) return
    const ext = extOf(file.name)
    const canView = EXT_SUPPORT[ext]?.view
    const guess = parseFileName(file.name)
    setReading(true)

    // Read the sheet's own text before showing the form, so the title block —
    // not the file name — is what populates it wherever possible.
    const text = await readDrawingText(file)
    const tb = text.hasText ? parseTitleBlock(text.items) : {}
    const annotations = text.hasText ? scanAnnotations(text.items) : {}
    setReading(false)

    const pick = (field, fallback) => (tb[field]?.value ? tb[field].value : fallback)
    const fromTitleBlock = Object.keys(tb)

    setPending({
      id: uid(),
      fileName: file.name,
      fileType: file.type || ext,
      fileSize: file.size,
      previewUrl: canView ? URL.createObjectURL(file) : null,
      ext,
      titleBlock: text.hasText ? tb : null,
      annotations,
      textItemCount: text.items.length,
      textReason: text.reason,
      hasText: text.hasText,
      fromTitleBlock,
      guessedFields: Object.entries(guess)
        .filter(([k, v]) => v && !tb[k]?.value)
        .map(([k]) => k),
      drawingNumber: pick('drawingNumber', guess.drawingNumber),
      partNumber: pick('partNumber', ''),
      partName: pick('partName', guess.partName),
      revision: pick('revision', guess.revision),
      drawingDate: pick('drawingDate', ''),
      customer: state.settings.customer || '',
      uploadedBy: state.settings.preparedBy,
      uploadDate: new Date().toISOString(),
      analyzed: false,
    })
  }

  const onDrop = (e) => {
    e.preventDefault(); setOver(false)
    takeFile(e.dataTransfer.files?.[0])
  }

  const commit = () => {
    if (!pending) return
    dispatch({ type: 'ADD_DRAWING', payload: pending })
    setPending(null)
  }

  const loadSample = (key) => {
    const d = makeSampleDrawing(key, state.settings.preparedBy)
    dispatch({ type: 'ADD_DRAWING', payload: d })
  }

  const analyze = (id) => {
    dispatch({ type: 'ANALYZE', id })
    go('analysis')
  }

  const p = pending

  return (
    <>
      <Stepper current="upload" go={go} />
      <div className="page-head">
        <h1>Engineering Drawing Upload</h1>
        <p className="lead">
          Upload a 2D drawing or CAD file to start a costing. The file type determines how much can be extracted
          automatically — 3D solids give the most reliable volume, raster scans the least.
        </p>
      </div>

      <div className="grid g2">
        <div>
          <Card title="Upload Drawing" hint="PDF · JPG · PNG · DWG · DXF · STEP/STP · IGES">
            <div
              className={`dropzone ${over ? 'over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
            >
              <h3>{reading ? 'Reading the drawing…' : 'Drag & drop an engineering drawing here'}</h3>
              <p>{reading
                ? 'Extracting the text layer and locating the title block.'
                : 'or click to browse — PDF, JPG, PNG, DWG, DXF, STEP/STP, IGES'}</p>
              <input ref={inputRef} type="file" accept={ACCEPT} hidden
                onChange={(e) => takeFile(e.target.files?.[0])} />
            </div>

            {p && (
              <div className="mt">
                <Banner kind="info">
                  <span>ⓘ</span>
                  <span>
                    <b>{p.fileName}</b> ({(p.fileSize / 1024).toFixed(0)} KB) — {EXT_SUPPORT[p.ext]?.note || 'File type not recognised; extraction support is limited.'}
                  </span>
                </Banner>
                {p.fromTitleBlock?.length > 0 && (
                  <Banner kind="info">
                    <span>✓</span>
                    <span>
                      Read from the drawing's own <b>title block</b>: {p.fromTitleBlock.map((k) => (
                        <span key={k} className="tag drawing" style={{ marginRight: 4 }}>
                          {p.titleBlock[k].label} → {String(p.titleBlock[k].value).slice(0, 40)}
                          {p.titleBlock[k].mirrored && ' (used for both drawing & part no.)'}
                        </span>
                      ))}
                    </span>
                  </Banner>
                )}
                {p.guessedFields?.length > 0 && (
                  <Banner kind="warn">
                    <span>⚠</span>
                    <span>
                      Pre-filled from the <b>file name</b> ({p.guessedFields.join(', ')}) — a naming-convention guess, not the
                      title block. Correct anything that is wrong.
                    </span>
                  </Banner>
                )}
                {!p.hasText && (
                  <Banner kind="danger">
                    <span>⚠</span>
                    <span><b>No text could be read from this file.</b> {p.textReason} Enter the title-block values below by hand.</span>
                  </Banner>
                )}
                <div className="grid g2">
                  <Field label="Drawing Number"><input className="inp" value={p.drawingNumber} onChange={(e) => setPending({ ...p, drawingNumber: e.target.value })} placeholder="e.g. BNC-DRG-2291" /></Field>
                  <Field label="Part Number"><input className="inp" value={p.partNumber} onChange={(e) => setPending({ ...p, partNumber: e.target.value })} placeholder="e.g. PH-2291-03" /></Field>
                  <Field label="Part Name"><input className="inp" value={p.partName} onChange={(e) => setPending({ ...p, partName: e.target.value })} placeholder="e.g. Pump Housing" /></Field>
                  <Field label="Revision"><input className="inp" value={p.revision} onChange={(e) => setPending({ ...p, revision: e.target.value })} placeholder="e.g. R3" /></Field>
                  <Field label="Drawing Date"><input className="inp" type="date" value={p.drawingDate} onChange={(e) => setPending({ ...p, drawingDate: e.target.value })} /></Field>
                  <Field label="Customer"><input className="inp" value={p.customer} onChange={(e) => setPending({ ...p, customer: e.target.value })} /></Field>
                  <Field label="Uploaded By"><input className="inp" value={p.uploadedBy} onChange={(e) => setPending({ ...p, uploadedBy: e.target.value })} /></Field>
                  <Field label="Upload Date"><input className="inp" value={new Date(p.uploadDate).toLocaleString('en-IN')} readOnly /></Field>
                </div>
                <div className="flex mt">
                  <button className="btn primary" onClick={commit}>Upload Drawing</button>
                  <button className="btn ghost" onClick={() => setPending(null)}>Cancel</button>
                  <span className="muted small">Fields left blank are read from the drawing during analysis.</span>
                </div>
              </div>
            )}
          </Card>

          <Card title="Or start from a sample drawing" hint="Demonstrates the full workflow without a file">
            <div className="grid g3">
              {SAMPLE_DRAWINGS.map((s) => (
                <button key={s.key} className="btn" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: 12 }} onClick={() => loadSample(s.key)}>
                  <b>{s.header.partName}</b>
                  <span className="muted small">{s.header.drawingNumber} · {s.header.revision}</span>
                  <span className="muted small">{s.fileName.split('.').pop().toUpperCase()} · {s.header.customer}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Drawing Preview">
            <div className="preview">
              {drawing?.previewUrl ? (
                /pdf/i.test(drawing.fileType) || /\.pdf$/i.test(drawing.fileName)
                  ? <iframe title="drawing" src={drawing.previewUrl} />
                  : <img alt="drawing preview" src={drawing.previewUrl} />
              ) : (
                <div className="cad-note">
                  <h3>{drawing ? drawing.fileName : 'No drawing selected'}</h3>
                  <p className="muted small" style={{ maxWidth: 420, margin: '8px auto 0' }}>
                    {drawing
                      ? (drawing.isSample
                        ? 'Sample drawing record — no raster file is attached. All extraction data for this part is available in the analysis step.'
                        : EXT_SUPPORT[extOf(drawing.fileName)]?.note || 'No inline preview available for this file type.')
                      : 'Upload a file or load a sample to see the preview here.'}
                  </p>
                </div>
              )}
            </div>
            {drawing && (
              <div className="grid g2 mt" style={{ gap: 8 }}>
                {[['File Name', drawing.fileName], ['Drawing Number', drawing.drawingNumber, 'drawingNumber'],
                  ['Part Number', drawing.partNumber, 'partNumber'], ['Part Name', drawing.partName, 'partName'],
                  ['Revision', drawing.revision, 'revision'], ['Drawing Date', drawing.drawingDate, 'drawingDate'],
                  ['Uploaded By', drawing.uploadedBy], ['Upload Date', dateTime(drawing.uploadDate)]].map(([k, v, key]) => (
                  <div key={k} className="small">
                    <span className="muted">{k}</span>
                    {key && drawing.autoFilled?.includes(key) && <span className="tag drawing" style={{ marginLeft: 6 }}>from drawing</span>}
                    <br />
                    <b>{v || (drawing.analyzed && key ? <span className="muted">Not Available in Drawing</span> : '—')}</b>
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <button className="btn primary mt" onClick={() => analyze(drawing.id)}>
                    {drawing.analyzed ? 'Re-analyze Drawing with AI' : 'Analyze Drawing with AI'}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card title="Uploaded Drawings" hint={`${state.drawings.length} in this workspace`} flush>
        {state.drawings.length === 0 ? (
          <div className="empty">No drawings uploaded yet.</div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>File</th><th>Drawing No.</th><th>Part No.</th><th>Part Name</th><th>Rev</th>
                  <th>Uploaded By</th><th>Upload Date</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {state.drawings.map((d) => (
                  <tr key={d.id} className={d.id === state.activeId ? 'highlight' : ''}>
                    <td><b>{d.fileName}</b></td>
                    <td>{d.drawingNumber || '—'}</td>
                    <td>{d.partNumber || '—'}</td>
                    <td>{d.partName || '—'}</td>
                    <td>{d.revision || '—'}</td>
                    <td>{d.uploadedBy}</td>
                    <td className="nowrap">{dateTime(d.uploadDate)}</td>
                    <td><span className={`tag ${d.analyzed ? 'user' : 'assumption'}`}>{d.analyzed ? 'Analyzed' : 'Pending analysis'}</span></td>
                    <td className="nowrap right">
                      <button className="btn sm" onClick={() => dispatch({ type: 'SET_ACTIVE', id: d.id })}>Open</button>{' '}
                      <button className="btn sm primary" onClick={() => analyze(d.id)}>Analyze</button>{' '}
                      <button className="btn sm danger" onClick={() => removeDrawing(d.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
