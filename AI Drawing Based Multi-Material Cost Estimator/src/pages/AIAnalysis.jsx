import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Banner, Kpi, Empty, Validation } from '../components/ui.jsx'
import FieldTable, { PART_LABELS, DIM_LABELS, DIM_SUFFIX, QUALITY_LABELS, MATERIAL_LABELS, MFG_LABELS } from '../components/FieldTable.jsx'
import { ENGINE_MODE } from '../lib/aiEngine.js'
import { dateTime } from '../lib/format.js'

const TABS = [
  { id: 'part', label: 'Part Information', labels: PART_LABELS },
  { id: 'dimensions', label: 'Dimensional Information', labels: DIM_LABELS, suffixes: DIM_SUFFIX },
  { id: 'quality', label: 'Quality Information', labels: QUALITY_LABELS },
  { id: 'material', label: 'Material Information', labels: MATERIAL_LABELS },
  { id: 'manufacturing', label: 'Manufacturing Information', labels: MFG_LABELS },
]

export default function AIAnalysis({ go }) {
  const { drawing, analysis, dispatch } = useStore()
  const [tab, setTab] = useState('part')
  const [busy, setBusy] = useState(false)

  if (!drawing) {
    return <Empty title="No drawing selected" action={<button className="btn primary" onClick={() => go('upload')}>Go to Drawing Upload</button>}>
      Upload an engineering drawing, or load one of the sample drawings, before running the analysis.
    </Empty>
  }

  const run = () => {
    setBusy(true)
    setTimeout(() => { dispatch({ type: 'ANALYZE', id: drawing.id }); setBusy(false) }, 650)
  }

  const active = TABS.find((t) => t.id === tab)

  return (
    <>
      <Stepper current="analysis" go={go} />
      <div className="page-head">
        <h1>AI Drawing Analysis</h1>
        <p className="lead">
          The analysis engine reads the drawing and reports only what it can actually find. Anything absent is
          returned as <b>Not Available in Drawing</b> rather than being filled in with a plausible-looking number.
          Every row below can be corrected — corrections are re-tagged as User Input.
        </p>
      </div>

      <Banner kind={analysis?.isSampleData ? 'danger' : analysis?.readFromFile ? 'info' : 'warn'}>
        <span>{analysis?.isSampleData ? '⚠' : analysis?.readFromFile ? '✓' : 'ⓘ'}</span>
        <span><b>Engine mode:</b> {analysis?.engineMode || ENGINE_MODE}</span>
      </Banner>

      <div className="flex" style={{ marginBottom: 16 }}>
        <button className="btn primary" onClick={run} disabled={busy}>
          {busy ? 'Analyzing…' : analysis ? 'Re-analyze Drawing with AI' : 'Analyze Drawing with AI'}
        </button>
        {analysis && <span className="muted small">Last analyzed {dateTime(analysis.analyzedAt)}</span>}
        <div className="spacer" />
        {analysis && <button className="btn" onClick={() => go('spec')}>Continue to Part Specification →</button>}
      </div>

      {!analysis ? (
        <Empty title="Drawing not analyzed yet">Click <b>Analyze Drawing with AI</b> to extract part, dimensional, quality, material and manufacturing information.</Empty>
      ) : (
        <>
          <div className="grid g4">
            <Kpi label="Parameters Found" value={analysis.fieldsFound} foot="Present on the drawing or derived" tone="green" />
            <Kpi label="Not Available" value={analysis.fieldsMissing} foot="Reported as missing, never invented" tone="warn" />
            <Kpi label="Component Type" value={analysis.part.componentType?.value?.split('/')[0] || '—'} foot={analysis.part.componentType?.source} />
            <Kpi label="Material Callout" value={analysis.material.grade?.value || '—'} foot={analysis.material.specification?.value || '—'} tone="accent" />
          </div>

          <Card
            title="Extracted Information"
            hint="Editable — corrections become User Input"
            actions={
              <div className="flex" style={{ gap: 6 }}>
                {TABS.map((t) => (
                  <button key={t.id} className={`btn sm ${tab === t.id ? 'primary' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
              </div>
            }
          >
            <FieldTable group={active.id} labels={active.labels} suffixes={active.suffixes} />
          </Card>

          <Validation>
            Extraction output is an engineering aid. Dimensions, tolerances and material callouts must be verified
            against the controlled drawing before any commercial commitment. Estimated – Engineering / Commercial Validation Required.
          </Validation>
        </>
      )}
    </>
  )
}
