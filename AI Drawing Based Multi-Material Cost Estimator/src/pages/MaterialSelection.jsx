import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Empty, Kpi, SourceTag, Validation, Banner } from '../components/ui.jsx'
import { MATERIAL_CATEGORIES } from '../data/materials.js'
import { weightFromVolume } from '../lib/geometry.js'
import { suggestMaterials } from '../lib/aiEngine.js'
import { money, num } from '../lib/format.js'
import { SRC, RECO_DISCLAIMER } from '../lib/sources.js'

export default function MaterialSelection({ go }) {
  const { analysis, project, state, dispatch, volume, drawingMaterialId } = useStore()
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')

  if (!analysis) {
    return <Empty title="Run the drawing analysis first" action={<button className="btn primary" onClick={() => go('analysis')}>Go to AI Drawing Analysis</button>}>
      Material candidates are proposed from the drawing's material callout and manufacturing requirements.
    </Empty>
  }

  const suggestions = suggestMaterials(analysis)
  const suggestionById = Object.fromEntries(suggestions.map((s) => [s.id, s]))
  const selected = project.selectedMaterials

  const list = state.materialMaster.filter((m) => {
    if (cat !== 'All' && m.category !== cat) return false
    if (q && !(`${m.name} ${m.grade} ${m.category}`.toLowerCase().includes(q.toLowerCase()))) return false
    return true
  })

  const toggle = (id) => dispatch({ type: 'TOGGLE_MATERIAL', id })

  return (
    <>
      <Stepper current="materials" go={go} />
      <div className="page-head">
        <h1>Material Selection</h1>
        <p className="lead">
          The drawing's own material callout is always carried through. Additional grades are offered purely so the
          cost impact of a change can be compared — selecting one here is not a material approval.
        </p>
      </div>

      <Banner kind="warn"><span>⚠</span><span>{RECO_DISCLAIMER}</span></Banner>

      <div className="grid g4">
        <Kpi label="Drawing Material" value={state.materialMaster.find((m) => m.id === drawingMaterialId)?.name || 'Not identified'}
          foot={analysis.material.specification?.value || 'No callout found'} tone="accent" />
        <Kpi label="Candidates Proposed" value={suggestions.length} foot="From callout + manufacturing requirements" />
        <Kpi label="Selected for Costing" value={selected.length} foot="Each is costed independently" tone="green" />
        <Kpi label="Part Volume Used" value={`${num(volume?.volumeCm3, 1)} cm³`} foot="Common to every material" />
      </div>

      <Card title="Engine-proposed Candidates" hint="Add or remove freely — nothing is locked" flush>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Material</th><th>Grade</th><th>Suitability</th><th>Source</th><th>Reasoning</th><th></th></tr></thead>
            <tbody>
              {suggestions.map((s) => {
                const m = state.materialMaster.find((x) => x.id === s.id)
                if (!m) return null
                const on = selected.includes(s.id)
                return (
                  <tr key={s.id} className={s.source === SRC.DRAWING ? 'highlight' : ''}>
                    <td><b>{m.name}</b></td>
                    <td className="muted">{m.grade}</td>
                    <td><span className={`tag ${s.suitability === 'Drawing specified' ? 'drawing' : s.suitability === 'Review required' ? 'assumption' : 'ai'}`}>{s.suitability}</span></td>
                    <td><SourceTag source={s.source} /></td>
                    <td className="small muted">{s.reason}</td>
                    <td className="right"><button className={`btn sm ${on ? '' : 'primary'}`} onClick={() => toggle(s.id)}>{on ? 'Remove' : 'Add'}</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Material Master"
        hint={`${list.length} grades`}
        actions={
          <div className="flex" style={{ gap: 6 }}>
            <input className="inp sm" style={{ width: 180 }} placeholder="Search grade…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="inp sm" style={{ width: 200 }} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option>All</option>
              {MATERIAL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        }
        flush
      >
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Material</th><th>Grade</th><th>Category</th><th className="num">Density (g/cm³)</th>
                <th className="num">Price (₹/kg)</th><th className="num">Est. Weight (kg)</th><th>Suitability</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const on = selected.includes(m.id)
                const s = suggestionById[m.id]
                return (
                  <tr key={m.id} className={on ? 'highlight' : ''}>
                    <td><b>{m.name}</b></td>
                    <td className="muted">{m.grade}</td>
                    <td className="small muted">{m.category}</td>
                    <td className="num">{m.density.toFixed(2)}</td>
                    <td className="num">{money(m.price)}</td>
                    <td className="num">{num(weightFromVolume(volume?.volumeCm3, m.density), 3)}</td>
                    <td>
                      {m.id === drawingMaterialId
                        ? <span className="tag drawing">Drawing specified</span>
                        : s ? <span className="tag ai">{s.suitability}</span>
                          : <span className="tag neutral">Manual addition</span>}
                    </td>
                    <td className="small muted">{m.notes}</td>
                    <td className="right"><button className={`btn sm ${on ? '' : 'primary'}`} onClick={() => toggle(m.id)}>{on ? 'Remove' : 'Add'}</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Validation>
        Material suitability shown here is a costing aid derived from the drawing text and geometry. Mechanical
        property, corrosion and regulatory suitability must be confirmed by design engineering.
      </Validation>

      <div className="flex">
        <button className="btn primary" disabled={!selected.length} onClick={() => go('matcost')}>Continue to Material Costing →</button>
        {!selected.length && <span className="muted small">Select at least one material.</span>}
      </div>
    </>
  )
}
